import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  CalendarClock,
  ExternalLink,
  Loader2,
  Search,
} from 'lucide-react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { PageHeader } from '@/shared/ui/page-elements'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
import { CARER_ROTA_CONFLICT_MESSAGE } from '@/features/scheduling/api/bulk-visit-plan-schedule.api'
import { BulkGenerateRotaResultDialog } from '@/features/scheduling/components/BulkGenerateRotaResultDialog'
import type {
  BulkGenerateVisitPlanScheduleResponse,
  BulkVisitPlanScheduleCandidate,
} from '@/features/scheduling/api/bulk-visit-plan-schedule.api'
import { useScheduleAreas } from '@/features/scheduling/hooks/useScheduling'
import {
  useBulkGenerateVisitPlanSchedule,
  useBulkVisitPlanScheduleCandidates,
} from '@/features/scheduling/hooks/useBulkVisitPlanSchedule'
import {
  resolveGenerateRotaToDate,
  todayIsoDate,
} from '@/features/service-users/visit-plan/visit-plan-generate-rota.util'

function filterCandidates(
  rows: BulkVisitPlanScheduleCandidate[],
  search: string,
): BulkVisitPlanScheduleCandidate[] {
  const q = search.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(row => {
    const haystack = [row.serviceUserLabel, row.serviceUserNumber, row.locationName]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export default function BulkGenerateRotaPage() {
  const hasApi = !!getApiBaseUrl()
  const [locationId, setLocationId] = React.useState('')
  const [listReadyOnly, setListReadyOnly] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [selectedPlanIds, setSelectedPlanIds] = React.useState<Set<string>>(new Set())
  const [generateFrom, setGenerateFrom] = React.useState(todayIsoDate())
  const [generateTo, setGenerateTo] = React.useState('')
  const [backfillDays, setBackfillDays] = React.useState(0)
  const [scheduleAreaId, setScheduleAreaId] = React.useState('')
  const [generateReadyOnly, setGenerateReadyOnly] = React.useState(true)
  const [lastResult, setLastResult] = React.useState<BulkGenerateVisitPlanScheduleResponse | null>(
    null,
  )
  const [resultDialogOpen, setResultDialogOpen] = React.useState(false)

  const locationsQuery = useServiceUserLocations(hasApi)
  const scheduleAreasQuery = useScheduleAreas()
  const candidatesQuery = useBulkVisitPlanScheduleCandidates({
    locationId: locationId || undefined,
    readyOnly: listReadyOnly,
    enabled: hasApi,
  })
  const generateMutation = useBulkGenerateVisitPlanSchedule()

  const candidates = candidatesQuery.data?.candidates ?? []
  const summary = candidatesQuery.data?.summary
  const visibleCandidates = filterCandidates(candidates, search)
  const readyVisible = visibleCandidates.filter(row => row.ready)
  const allReadySelected =
    readyVisible.length > 0 && readyVisible.every(row => selectedPlanIds.has(row.planId))

  React.useEffect(() => {
    setSelectedPlanIds(new Set(candidates.filter(row => row.ready).map(row => row.planId)))
  }, [candidatesQuery.dataUpdatedAt, locationId, listReadyOnly])

  const togglePlan = (planId: string, ready: boolean) => {
    if (!ready) return
    setSelectedPlanIds(prev => {
      const next = new Set(prev)
      if (next.has(planId)) next.delete(planId)
      else next.add(planId)
      return next
    })
  }

  const toggleAllReady = () => {
    if (allReadySelected) {
      setSelectedPlanIds(prev => {
        const next = new Set(prev)
        for (const row of readyVisible) next.delete(row.planId)
        return next
      })
      return
    }
    setSelectedPlanIds(prev => {
      const next = new Set(prev)
      for (const row of readyVisible) next.add(row.planId)
      return next
    })
  }

  const handleGenerate = () => {
    if (!generateFrom) {
      toastApiError(new Error('From date required'), 'Select a from date')
      return
    }
    const planIds = [...selectedPlanIds]
    if (!planIds.length) {
      toastApiError(new Error('No plans selected'), 'Select at least one ready visit plan')
      return
    }
    const toDate = resolveGenerateRotaToDate(generateFrom, generateTo)
    const count = planIds.length
    const ok = window.confirm(
      `Generate rota visits for ${count} service user${count === 1 ? '' : 's'} from ${generateFrom} to ${toDate}? Jobs will be created unallocated — assign carers on Schedule Jobs. Existing visits are skipped.`,
    )
    if (!ok) return

    generateMutation.mutate(
      {
        fromDate: generateFrom,
        toDate,
        planIds,
        locationId: locationId || undefined,
        readyOnly: generateReadyOnly,
        backfillDays: backfillDays > 0 ? backfillDays : undefined,
        scheduleAreaId: scheduleAreaId || undefined,
      },
      {
        onSuccess: data => {
          setLastResult(data)
          setResultDialogOpen(true)
          const warningSuffix =
            [
              (data.totals.visitsWithPatternWarnings ?? 0) > 0
                ? `${data.totals.visitsWithPatternWarnings} visit${data.totals.visitsWithPatternWarnings === 1 ? '' : 's'} outside working pattern (carers assigned with warning)`
                : null,
              (data.totals.visitsWithRotaConflicts ?? 0) > 0
                ? `${data.totals.visitsWithRotaConflicts} visit${data.totals.visitsWithRotaConflicts === 1 ? '' : 's'} could not assign carer (${CARER_ROTA_CONFLICT_MESSAGE.toLowerCase()})`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')
          const suffix = warningSuffix ? ` · ${warningSuffix}` : ''
          toastSuccess(
            'Bulk rota complete',
            `${data.totals.visitsCreated} visits created across ${data.totals.succeeded} plan${data.totals.succeeded === 1 ? '' : 's'}.${suffix}`,
          )
          void candidatesQuery.refetch()
        },
        onError: e => toastApiError(e, 'Bulk generate failed'),
      },
    )
  }

  if (!hasApi) {
    return <p className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL.</p>
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-5 md:p-6">
      <PageHeader
        title="Bulk generate rota"
        description="Create scheduled jobs and visits from active visit plans. Carers are not assigned — allocate staff on Schedule Jobs after generating."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Scheduling', href: '/scheduling/view' },
          { label: 'Bulk generate rota' },
        ]}
      >
        <Button variant="outline" size="sm" asChild>
          <Link to="/scheduling/schedule-jobs">Open Schedule Jobs</Link>
        </Button>
      </PageHeader>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Active plans
            </p>
            <p className="mt-1 text-2xl font-semibold">{summary.totalActivePlans}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ready to generate
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">{summary.readyCount}</p>
            <p className="text-xs text-muted-foreground">Slots, times & days set</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Need setup
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">{summary.notReadyCount}</p>
            <p className="text-xs text-muted-foreground">Missing slot setup</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">Generation parameters</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">From date</Label>
            <Input type="date" value={generateFrom} onChange={e => setGenerateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">To date (optional)</Label>
            <Input
              type="date"
              value={generateTo}
              placeholder="Next 14 days"
              onChange={e => setGenerateTo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Backfill days</Label>
            <Input
              type="number"
              min={0}
              max={14}
              value={backfillDays}
              onChange={e => setBackfillDays(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Schedule area</Label>
            <Select
              value={scheduleAreaId || '__none__'}
              onValueChange={v => setScheduleAreaId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Default</SelectItem>
                {(scheduleAreasQuery.data ?? []).map(area => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={generateReadyOnly}
            onChange={e => setGenerateReadyOnly(e.target.checked)}
          />
          Skip plans missing enabled slots, times, or visit days
        </label>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Visit plans</h2>
            <p className="text-xs text-muted-foreground">
              {selectedPlanIds.size} selected · ready = call pattern configured (carers assigned separately)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search service users…"
                className="h-9 w-52 pl-8"
              />
            </div>
            <Select
              value={locationId || '__all__'}
              onValueChange={v => setLocationId(v === '__all__' ? '' : v)}
            >
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All locations</SelectItem>
                {(locationsQuery.data?.locations ?? []).map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={listReadyOnly}
                onChange={e => setListReadyOnly(e.target.checked)}
              />
              Ready only
            </label>
          </div>
        </div>

        {candidatesQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : candidatesQuery.error ? (
          <p className="p-6 text-sm text-destructive">Could not load visit plan candidates.</p>
        ) : visibleCandidates.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No active visit plans match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allReadySelected}
                      onChange={toggleAllReady}
                      aria-label="Select all ready plans"
                      disabled={readyVisible.length === 0}
                    />
                  </th>
                  <th className="px-3 py-2">Service user</th>
                  <th className="px-3 py-2">Location</th>
                  <th className="px-3 py-2">Slots</th>
                  <th className="px-3 py-2">Readiness</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {visibleCandidates.map(row => (
                  <tr key={row.planId} className="border-t border-border/70">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedPlanIds.has(row.planId)}
                        disabled={!row.ready}
                        onChange={() => togglePlan(row.planId, row.ready)}
                        aria-label={`Select ${row.serviceUserLabel}`}
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">{row.serviceUserLabel}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.locationName ?? '—'}</td>
                    <td className="px-3 py-2">{row.enabledSlotCount}</td>
                    <td className="px-3 py-2">
                      {row.ready ? (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
                          Ready
                        </Badge>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
                            Needs setup
                          </Badge>
                          <ul className="text-xs text-muted-foreground">
                            {row.readinessIssues.slice(0, 2).map(issue => (
                              <li key={issue}>{issue}</li>
                            ))}
                            {row.readinessIssues.length > 2 ? (
                              <li>+{row.readinessIssues.length - 2} more</li>
                            ) : null}
                          </ul>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          to="/service-users/$serviceUserId/visit-plan"
                          params={{ serviceUserId: row.serviceUserId }}
                          target="_blank"
                        >
                          Visit plan
                          <ExternalLink className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            After generating, open Schedule Jobs to allocate carers and refresh the board.
          </p>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || selectedPlanIds.size === 0}
          >
            {generateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CalendarClock className="mr-2 h-4 w-4" />
            )}
            Generate rota ({selectedPlanIds.size})
          </Button>
        </div>
      </div>

      <BulkGenerateRotaResultDialog
        open={resultDialogOpen}
        onOpenChange={setResultDialogOpen}
        result={lastResult}
      />
    </div>
  )
}
