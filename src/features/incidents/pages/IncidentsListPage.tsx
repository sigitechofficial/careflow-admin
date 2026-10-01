import * as React from 'react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { AlertTriangle, ChevronLeft, ChevronRight, PlusCircle, Search, X } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { useIncidents, useIncidentCategories } from '@/features/incidents/hooks/useIncidents'
import {
  INCIDENT_SEVERITY_BADGE,
  INCIDENT_STATUS_BADGE,
  type IncidentListFilters,
  type IncidentSeverity,
  type IncidentStatus,
} from '@/features/incidents/types'
import {
  formatOrganisationDate,
  formatOrganisationDateTime,
} from '@/shared/lib/organisation-display-format.store'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'

const STATUS_OPTIONS: { value: IncidentStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'REPORTED', label: 'Reported' },
  { value: 'AWAITING_REVIEW', label: 'Awaiting Review' },
  { value: 'UNDER_INVESTIGATION', label: 'Under Investigation' },
  { value: 'ACTIONS_REQUIRED', label: 'Actions Required' },
  { value: 'AWAITING_CLOSURE', label: 'Awaiting Closure' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'REOPENED', label: 'Reopened' },
]

const HIGH_OR_CRITICAL = 'HIGH_CRITICAL'
type SeverityFilter = IncidentSeverity | typeof HIGH_OR_CRITICAL | ''

const SEVERITY_OPTIONS: { value: SeverityFilter; label: string }[] = [
  { value: '', label: 'All severities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: HIGH_OR_CRITICAL, label: 'High & Critical' },
]

type ListSearch = { status?: string; severity?: string; open?: boolean; closedFrom?: string; overdue?: boolean }

const selectClass =
  'h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

export default function IncidentsListPage() {
  const can = useAuthStore((s) => s.can)
  const { locationId } = useGlobalLocationScope()
  const navigate = useNavigate()
  // Re-render when the organisation timezone loads so dates don't show in the fallback zone.
  const { timezoneReady } = useOrganisationDisplayFormat()
  // Presets from the URL (e.g. dashboard figures) set the filters; re-applied when the URL changes
  // (back/forward, or another preset link while already on this page).
  const preset = useSearch({ strict: false }) as ListSearch
  const presetStatus: IncidentStatus | '' = STATUS_OPTIONS.some((o) => o.value && o.value === preset.status)
    ? (preset.status as IncidentStatus)
    : ''
  const presetSeverity: SeverityFilter = SEVERITY_OPTIONS.some((o) => o.value && o.value === preset.severity)
    ? (preset.severity as SeverityFilter)
    : ''
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [status, setStatus] = React.useState<IncidentStatus | ''>(presetStatus)
  const [severity, setSeverity] = React.useState<SeverityFilter>(presetSeverity)
  const [categoryId, setCategoryId] = React.useState('')
  const [openOnly, setOpenOnly] = React.useState(preset.open === true)
  const [closedFrom, setClosedFrom] = React.useState(preset.closedFrom ?? '')
  const [overdueOnly, setOverdueOnly] = React.useState(preset.overdue === true)
  const [page, setPage] = React.useState(1)

  const presetKey = [presetStatus, presetSeverity, preset.open, preset.closedFrom, preset.overdue].join('|')
  const appliedPresetKey = React.useRef(presetKey)
  React.useEffect(() => {
    if (appliedPresetKey.current === presetKey) return
    appliedPresetKey.current = presetKey
    setStatus(presetStatus)
    setSeverity(presetSeverity)
    setOpenOnly(preset.open === true)
    setClosedFrom(preset.closedFrom ?? '')
    setOverdueOnly(preset.overdue === true)
  }, [presetKey, presetStatus, presetSeverity, preset.open, preset.closedFrom, preset.overdue])

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  React.useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, severity, categoryId, openOnly, closedFrom, overdueOnly, locationId])

  const categoriesQuery = useIncidentCategories()
  const filters: IncidentListFilters = {
    search: debouncedSearch || undefined,
    status: status || undefined,
    severity: severity && severity !== HIGH_OR_CRITICAL ? severity : undefined,
    severities: severity === HIGH_OR_CRITICAL ? ['HIGH', 'CRITICAL'] : undefined,
    closedFrom: closedFrom || undefined,
    hasOverdueActions: overdueOnly || undefined,
    categoryId: categoryId || undefined,
    openOnly: openOnly || undefined,
    locationId: locationId ?? undefined,
    page,
    limit: 25,
  }
  const { data, isLoading, isError } = useIncidents(filters)

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

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

      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference or description…"
              className="pl-8"
              aria-label="Search incidents"
            />
          </div>
          <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as IncidentStatus | '')} aria-label="Status filter">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select className={selectClass} value={severity} onChange={(e) => setSeverity(e.target.value as SeverityFilter)} aria-label="Severity filter">
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select className={selectClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category filter">
            <option value="">All categories</option>
            {(categoriesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
            <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Open only
          </label>
        </div>
        {(closedFrom || overdueOnly) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {closedFrom && (
              <Badge variant="muted" size="sm" className="gap-1">
                Closed since {formatOrganisationDate(closedFrom)}
                <button type="button" aria-label="Clear closed-since filter" onClick={() => setClosedFrom('')}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {overdueOnly && (
              <Badge variant="muted" size="sm" className="gap-1">
                With overdue corrective measures
                <button type="button" aria-label="Clear overdue filter" onClick={() => setOverdueOnly(false)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Reference</th>
                <th className="px-3 py-2.5 font-medium">Event</th>
                <th className="px-3 py-2.5 font-medium">Severity</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Incident date</th>
                <th className="px-3 py-2.5 font-medium">Reported</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">Loading…</td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-destructive">Could not load incidents.</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No incidents match your filters.</td>
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
                    <td className="px-3 py-2.5">
                      <Badge variant={INCIDENT_SEVERITY_BADGE[inc.severity]} size="sm">{inc.severityLabel}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant={INCIDENT_STATUS_BADGE[inc.status]} size="sm">{inc.statusLabel}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{timezoneReady ? formatOrganisationDateTime(inc.occurredAt) : '…'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{timezoneReady ? formatOrganisationDateTime(inc.reportedAt) : '…'}</td>
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
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
