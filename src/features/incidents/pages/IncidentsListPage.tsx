import * as React from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, PlusCircle, Search, X } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { useIncidents, useIncidentCategories, useIncidentStats } from '@/features/incidents/hooks/useIncidents'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useEmployees, useEmployee } from '@/features/employees/hooks/useEmployees'
import {
  buildIncidentsListSearch,
  EMPTY_INCIDENTS_LIST_URL_STATE,
  hasActiveIncidentsListFilters,
  parseIncidentsListSearch,
  type IncidentsListSearch,
  type IncidentsListUrlState,
} from '@/features/incidents/utils/incidents-list-url-state'
import {
  INCIDENT_SEVERITY_BADGE,
  INCIDENT_STATUS_BADGE,
  type IncidentListFilters,
  type IncidentReportedBy,
  type IncidentSeverity,
  type IncidentStatus,
} from '@/features/incidents/types'
import {
  formatOrganisationDate,
  formatOrganisationDateTime,
} from '@/shared/lib/organisation-display-format.store'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyInTimeZone } from '@/shared/lib/operational-day.util'
import { toastApiError } from '@/shared/lib/toast'
import { useFetchScheduledJob } from '@/features/scheduling/hooks/useScheduling'
import { ScheduleVisitWorkspaceSheet } from '@/features/scheduling/components/ScheduleVisitWorkspaceSheet'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'

const STATUS_OPTIONS: { value: IncidentStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'REPORTED', label: 'Reported' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'UNDER_INVESTIGATION', label: 'Under Investigation' },
  { value: 'ACTIONS_REQUIRED', label: 'Actions Required' },
  { value: 'AWAITING_CLOSURE', label: 'Awaiting Closure' },
  { value: 'CLOSED', label: 'Closed' },
]

/** Values are comma lists so "High & Critical" can share the same filter as the summary chip. */
const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All severities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH,CRITICAL', label: 'High & Critical' },
]

const HIGH_OR_CRITICAL: IncidentSeverity[] = ['HIGH', 'CRITICAL']

/** Who keyed it into the system: the office user, or the carer themselves via the app. */
function recordedByLabel(reportedBy: IncidentReportedBy | undefined): string {
  if (reportedBy?.source === 'CARER_APP') return 'Carer app'
  if (reportedBy?.source === 'OFFICE') return reportedBy.recordedByName ?? 'Office'
  return '—'
}

const selectClass =
  'h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

export default function IncidentsListPage() {
  const can = useAuthStore((s) => s.can)
  const { locationId } = useGlobalLocationScope()
  const navigate = useNavigate()
  // Re-render when the organisation timezone loads so dates don't show in the fallback zone.
  const { timezoneReady } = useOrganisationDisplayFormat()
  const routeSearch = useSearch({ strict: false }) as IncidentsListSearch
  const urlState = React.useMemo(() => parseIncidentsListSearch(routeSearch), [routeSearch])

  const applyUrlState = React.useCallback(
    (next: IncidentsListUrlState) => {
      void navigate({ to: '/incidents/view', search: buildIncidentsListSearch(next), replace: true })
    },
    [navigate],
  )
  /** Any filter change returns to page 1 unless the patch sets a page. */
  const patchUrlState = React.useCallback(
    (patch: Partial<IncidentsListUrlState>) => {
      applyUrlState({ ...urlState, ...patch, page: patch.page ?? 1 })
    },
    [applyUrlState, urlState],
  )

  // Search box is local while typing; the URL is updated after a short pause.
  const [searchInput, setSearchInput] = React.useState(urlState.search)
  React.useEffect(() => {
    setSearchInput(urlState.search)
  }, [urlState.search])
  React.useEffect(() => {
    if (searchInput.trim() === urlState.search) return
    const t = setTimeout(() => patchUrlState({ search: searchInput.trim() }), 300)
    return () => clearTimeout(t)
  }, [searchInput, urlState.search, patchUrlState])

  // Changing the global location scope should start again from page 1.
  const prevLocationId = React.useRef(locationId)
  React.useEffect(() => {
    if (prevLocationId.current === locationId) return
    prevLocationId.current = locationId
    if (urlState.page > 1) patchUrlState({})
  }, [locationId, urlState.page, patchUrlState])

  // Visit workspace opens in a side sheet on this page (same panel as the schedule board).
  const canOpenVisit = can('scheduled_jobs.read')
  const [workspaceJob, setWorkspaceJob] = React.useState<TimelineJob | null>(null)
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false)
  const [openingJobId, setOpeningJobId] = React.useState<string | null>(null)
  const fetchScheduledJob = useFetchScheduledJob()
  const openVisit = async (scheduledJobId: string) => {
    setOpeningJobId(scheduledJobId)
    try {
      setWorkspaceJob(await fetchScheduledJob(scheduledJobId))
      setWorkspaceOpen(true)
    } catch (e) {
      toastApiError(e, 'Could not open the visit')
    } finally {
      setOpeningJobId(null)
    }
  }

  const canPickServiceUser = can('service_users.read')
  const canPickEmployee = can('employees.read')

  const [suSearch, setSuSearch] = React.useState('')
  const serviceUsersQuery = useServiceUsers({ limit: 50, search: suSearch || undefined }, canPickServiceUser)
  // Filter restored from the URL may not be in the first 50 results — load it so the picker shows a name.
  const selectedServiceUserQuery = useServiceUser(urlState.serviceUserId, canPickServiceUser)
  const serviceUserOptions: ComboboxOption[] = React.useMemo(() => {
    const options = (serviceUsersQuery.data?.rows ?? []).map((r) => ({
      value: r.id,
      label: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.serviceUserNumber ?? undefined,
    }))
    const selected = selectedServiceUserQuery.data
    if (selected && !options.some((o) => o.value === selected.id)) {
      options.unshift({
        value: selected.id,
        label: [selected.firstName, selected.lastName].filter(Boolean).join(' ') || 'Unnamed',
        description: selected.serviceUserNumber ?? undefined,
      })
    }
    return options
  }, [serviceUsersQuery.data, selectedServiceUserQuery.data])

  const [empSearch, setEmpSearch] = React.useState('')
  const employeesQuery = useEmployees({ limit: 50, search: empSearch || undefined }, canPickEmployee)
  const selectedEmployeeQuery = useEmployee(urlState.employeeId, canPickEmployee)
  const employeeOptions: ComboboxOption[] = React.useMemo(() => {
    const options = (employeesQuery.data?.rows ?? []).map((r) => ({
      value: r.id,
      label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.jobTitle?.name ?? undefined,
    }))
    const selected = selectedEmployeeQuery.data
    if (selected && !options.some((o) => o.value === selected.id)) {
      const pd = selected.personalDetail
      options.unshift({
        value: selected.id,
        label: [pd?.firstName, pd?.lastName].filter(Boolean).join(' ') || 'Unnamed',
        description: undefined,
      })
    }
    return options
  }, [employeesQuery.data, selectedEmployeeQuery.data])

  // "Reported by" — the carer who reported it (from the app, or recorded by the office for them).
  const [repSearch, setRepSearch] = React.useState('')
  const reportersQuery = useEmployees({ limit: 50, search: repSearch || undefined }, canPickEmployee)
  const selectedReporterQuery = useEmployee(urlState.reporterEmployeeId, canPickEmployee)
  const reporterOptions: ComboboxOption[] = React.useMemo(() => {
    const options = (reportersQuery.data?.rows ?? []).map((r) => ({
      value: r.id,
      label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.jobTitle?.name ?? undefined,
    }))
    const selected = selectedReporterQuery.data
    if (selected && !options.some((o) => o.value === selected.id)) {
      const pd = selected.personalDetail
      options.unshift({
        value: selected.id,
        label: [pd?.firstName, pd?.lastName].filter(Boolean).join(' ') || 'Unnamed',
        description: undefined,
      })
    }
    return options
  }, [reportersQuery.data, selectedReporterQuery.data])

  const categoriesQuery = useIncidentCategories()
  const statsQuery = useIncidentStats(locationId)
  const filters: IncidentListFilters = {
    search: urlState.search || undefined,
    status: urlState.status || undefined,
    severities: urlState.severities.length ? urlState.severities : undefined,
    categoryId: urlState.categoryId || undefined,
    openOnly: urlState.openOnly || undefined,
    // "Reported time" is when it happened (as the carer reports it) — sort and date-filter on that.
    dateField: 'occurredAt',
    dateFrom: urlState.dateFrom || undefined,
    dateTo: urlState.dateTo || undefined,
    serviceUserId: urlState.serviceUserId || undefined,
    employeeId: urlState.employeeId || undefined,
    reporterEmployeeId: urlState.reporterEmployeeId || undefined,
    closedFrom: urlState.closedFrom || undefined,
    hasOverdueActions: urlState.overdueOnly || undefined,
    candour: urlState.candourOverdueOnly ? 'overdue' : undefined,
    locationId: locationId ?? undefined,
    page: urlState.page,
    limit: 25,
  }
  const { data, isLoading, isError } = useIncidents(filters)
  const page = urlState.page
  const filtersActive = hasActiveIncidentsListFilters(urlState)
  const severityValue = urlState.severities.join(',')
  // The chip counts open High/Critical incidents, so it filters on both (the count matches the rows).
  const highOrCriticalActive = severityValue === HIGH_OR_CRITICAL.join(',') && urlState.openOnly

  const summaryChips = [
    {
      key: 'open',
      label: 'Open',
      count: statsQuery.data?.open,
      active: urlState.openOnly,
      onClick: () => patchUrlState({ openOnly: !urlState.openOnly }),
    },
    {
      key: 'high',
      label: 'Open high / critical',
      count: statsQuery.data?.highOrCritical,
      active: highOrCriticalActive,
      onClick: () =>
        patchUrlState(
          highOrCriticalActive
            ? { severities: [], openOnly: false }
            : { severities: HIGH_OR_CRITICAL, openOnly: true },
        ),
    },
    {
      key: 'not-picked-up',
      label: 'Not picked up',
      count: statsQuery.data?.notPickedUp,
      active: urlState.status === 'REPORTED',
      onClick: () => patchUrlState({ status: urlState.status === 'REPORTED' ? '' : 'REPORTED' }),
    },
    {
      key: 'review',
      label: 'Under review',
      count: statsQuery.data?.underReview,
      active: urlState.status === 'UNDER_REVIEW',
      onClick: () => patchUrlState({ status: urlState.status === 'UNDER_REVIEW' ? '' : 'UNDER_REVIEW' }),
    },
  ]

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  // An old or shared link can point past the last page — jump back to the last real page.
  React.useEffect(() => {
    if (data && data.total > 0 && page > data.totalPages) {
      patchUrlState({ page: data.totalPages })
    }
  }, [data, page, patchUrlState])

  return (
    <div className="space-y-4">
      <PageHeader
        title="All Incidents"
        description="Review, filter and manage reported accidents and incidents."
        icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accident & Incident' },
          { label: 'All Incidents' },
        ]}
        actions={
          can('incidents.create')
            ? [
                {
                  label: 'Raise incident',
                  onClick: () => navigate({ to: '/incidents/raise' }),
                  icon: <PlusCircle className="h-4 w-4" />,
                },
              ]
            : []
        }
      />

      <PolicyContextPanel moduleType="INCIDENT" />

      <div className="flex flex-wrap gap-2" aria-label="Incident summary">
        {summaryChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.onClick}
            aria-pressed={chip.active}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm shadow-sm transition-colors',
              chip.active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:bg-muted/40',
            )}
          >
            <span>{chip.label}</span>
            <span className={cn('font-semibold tabular-nums', chip.active ? 'text-primary' : 'text-foreground')}>
              {statsQuery.isLoading ? '…' : (chip.count ?? '–')}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search reference or description…"
              className="pl-8"
              aria-label="Search incidents"
            />
          </div>
          <select
            className={selectClass}
            value={urlState.status}
            onChange={(e) => patchUrlState({ status: e.target.value as IncidentStatus | '' })}
            aria-label="Status filter"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className={selectClass}
            value={severityValue}
            onChange={(e) =>
              patchUrlState({
                severities: e.target.value ? (e.target.value.split(',') as IncidentSeverity[]) : [],
              })
            }
            aria-label="Severity filter"
          >
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className={selectClass}
            value={urlState.categoryId}
            onChange={(e) => patchUrlState({ categoryId: e.target.value })}
            aria-label="Category filter"
          >
            <option value="">All categories</option>
            {(categoriesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={urlState.openOnly}
              onChange={(e) => patchUrlState({ openOnly: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            Open only
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Reported from
            <Input
              type="date"
              value={urlState.dateFrom}
              max={urlState.dateTo || undefined}
              onChange={(e) => patchUrlState({ dateFrom: e.target.value })}
              className="h-9 w-[150px]"
              aria-label="Reported from"
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            To
            <Input
              type="date"
              value={urlState.dateTo}
              min={urlState.dateFrom || undefined}
              onChange={(e) => patchUrlState({ dateTo: e.target.value })}
              className="h-9 w-[150px]"
              aria-label="Reported to"
            />
          </label>
          {canPickServiceUser && (
            <div className="w-[230px]">
              <Combobox
                options={serviceUserOptions}
                value={urlState.serviceUserId}
                onChange={(id) => patchUrlState({ serviceUserId: id })}
                onSearchChange={setSuSearch}
                loading={serviceUsersQuery.isLoading}
                placeholder="Any service user"
                searchPlaceholder="Search service users…"
                aria-label="Service user affected filter"
                allowDeselect
              />
            </div>
          )}
          {canPickEmployee && (
            <div className="w-[230px]">
              <Combobox
                options={employeeOptions}
                value={urlState.employeeId}
                onChange={(id) => patchUrlState({ employeeId: id })}
                onSearchChange={setEmpSearch}
                loading={employeesQuery.isLoading}
                placeholder="Any staff member affected"
                searchPlaceholder="Search staff…"
                aria-label="Staff member affected filter"
                allowDeselect
              />
            </div>
          )}
          {canPickEmployee && (
            <div className="w-[230px]">
              <Combobox
                options={reporterOptions}
                value={urlState.reporterEmployeeId}
                onChange={(id) => patchUrlState({ reporterEmployeeId: id })}
                onSearchChange={setRepSearch}
                loading={reportersQuery.isLoading}
                placeholder="Reported by anyone"
                searchPlaceholder="Search carers…"
                aria-label="Reported by filter"
                allowDeselect
              />
            </div>
          )}
          {urlState.closedFrom && (
            <Badge variant="muted" size="sm" className="gap-1">
              Closed since {formatOrganisationDate(urlState.closedFrom)}
              <button type="button" aria-label="Clear closed-since filter" onClick={() => patchUrlState({ closedFrom: '' })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {urlState.overdueOnly && (
            <Badge variant="muted" size="sm" className="gap-1">
              With overdue corrective measures
              <button type="button" aria-label="Clear overdue filter" onClick={() => patchUrlState({ overdueOnly: false })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {urlState.candourOverdueOnly && (
            <Badge variant="muted" size="sm" className="gap-1">
              Duty of Candour overdue
              <button type="button" aria-label="Clear Duty of Candour filter" onClick={() => patchUrlState({ candourOverdueOnly: false })}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput('')
                applyUrlState(EMPTY_INCIDENTS_LIST_URL_STATE)
              }}
              className="ml-auto"
            >
              <X className="mr-1 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Reference</th>
                <th className="px-3 py-2.5 font-medium">Event</th>
                <th className="px-3 py-2.5 font-medium">Reported time</th>
                <th className="px-3 py-2.5 font-medium">Reported by</th>
                <th className="px-3 py-2.5 font-medium">Recorded time</th>
                <th className="px-3 py-2.5 font-medium">Recorded by</th>
                <th className="px-3 py-2.5 font-medium">Severity</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Visit</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-destructive">Could not load incidents.</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">No incidents match your filters.</td>
                </tr>
              ) : (
                items.map((inc) => (
                  <tr key={inc.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2.5">
                      <Link to="/incidents/$incidentId" params={{ incidentId: inc.id }} className="font-medium text-primary hover:underline">
                        {inc.referenceNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      {inc.category.label}
                      {inc.subtype ? <span className="text-muted-foreground"> · {inc.subtype.label}</span> : null}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{timezoneReady ? formatOrganisationDateTime(inc.occurredAt) : '…'}</td>
                    <td className="px-3 py-2.5">{inc.reportedBy?.name ?? 'Unknown'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{timezoneReady ? formatOrganisationDateTime(inc.createdAt) : '…'}</td>
                    <td className="px-3 py-2.5">{recordedByLabel(inc.reportedBy)}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={INCIDENT_SEVERITY_BADGE[inc.severity]} size="sm">{inc.severityLabel}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant={INCIDENT_STATUS_BADGE[inc.status]} size="sm">{inc.statusLabel}</Badge>
                        {inc.candourOverdue && (
                          <Badge variant="destructive" size="sm" title="Duty of Candour overdue">
                            Candour overdue
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {inc.scheduledJobId ? (
                        canOpenVisit ? (
                          <button
                            type="button"
                            onClick={() => void openVisit(inc.scheduledJobId!)}
                            disabled={openingJobId === inc.scheduledJobId}
                            className="inline-flex items-center gap-1 font-mono text-xs font-medium text-primary hover:underline disabled:opacity-60"
                            aria-label={`Open visit ${inc.visitRef ?? ''} workspace`}
                          >
                            {inc.visitRef ?? 'Open visit'}
                            {openingJobId === inc.scheduledJobId && <Loader2 className="h-3 w-3 animate-spin" />}
                          </button>
                        ) : (
                          <span className="font-mono text-xs">{inc.visitRef ?? 'Visit'}</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-3 py-2 text-sm text-muted-foreground">
            <span>
              {data.total} incident{data.total === 1 ? '' : 's'} · page {data.page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => patchUrlState({ page: Math.max(1, page - 1) })} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => patchUrlState({ page: page + 1 })} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ScheduleVisitWorkspaceSheet
        open={workspaceOpen}
        onOpenChange={(open) => {
          setWorkspaceOpen(open)
          if (!open) setWorkspaceJob(null)
        }}
        job={workspaceJob}
        date={workspaceJob ? dayKeyInTimeZone(workspaceJob.scheduledStartDateTime) : ''}
      />
    </div>
  )
}
