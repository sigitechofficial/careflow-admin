import * as React from 'react'
import { Loader2, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import { formatOrganisationTime } from '@/shared/lib/organisation-display-format.store'
import { useEcmLiveDashboard } from '@/features/ecm/hooks/useEcm'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import { EcmVisitDetailDialog } from '@/features/ecm/components/EcmVisitDetailDialog'
import { EcmExceptionQueuePanel } from '@/features/ecm/components/EcmExceptionQueuePanel'
import { EcmHealthBanner } from '@/features/ecm/components/EcmHealthBanner'
import type { EcmDashboardBucket, EcmLiveVisitRow } from '@/features/ecm/types/ecm.types'

const BUCKET_META: {
  id: EcmDashboardBucket
  label: string
  tone: 'neutral' | 'warn' | 'danger' | 'ok'
}[] = [
  { id: 'dueNow', label: 'Due now', tone: 'warn' },
  { id: 'startingSoon', label: 'Starting soon', tone: 'neutral' },
  { id: 'inProgress', label: 'In progress', tone: 'ok' },
  { id: 'lateArrival', label: 'Late', tone: 'warn' },
  { id: 'veryLateArrival', label: 'Very late', tone: 'danger' },
  { id: 'potentialMissed', label: 'Potential missed', tone: 'warn' },
  { id: 'confirmedMissed', label: 'Confirmed missed', tone: 'danger' },
  { id: 'missingCheckout', label: 'Missing checkout', tone: 'warn' },
  { id: 'outsideGeofence', label: 'Outside geofence', tone: 'warn' },
  { id: 'manualAttendance', label: 'Manual', tone: 'neutral' },
]

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatVisitDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

function formatClockTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return formatOrganisationTime(iso)
}

function formatDurationMinutes(mins: number | null | undefined): string {
  if (mins == null || !Number.isFinite(mins)) return '—'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function formatSignedMinutes(value: number | null | undefined): string {
  if (value == null) return '—'
  return value > 0 ? `+${value}` : String(value)
}

function punctualityLabel(code: string | null | undefined): string {
  switch ((code ?? '').toUpperCase()) {
    case 'EARLY_ARRIVAL':
    case 'EARLY_DEPARTURE':
      return 'Early'
    case 'ON_TIME':
      return 'On time'
    case 'LATE_ARRIVAL':
    case 'LATE_DEPARTURE':
      return 'Late'
    case 'VERY_LATE_ARRIVAL':
      return 'Critically late'
    default:
      return 'Not assessed'
  }
}

function punctualityBadgeClass(code: string | null | undefined): string {
  const c = (code ?? '').toUpperCase()
  if (c === 'VERY_LATE_ARRIVAL') {
    return 'bg-destructive/10 text-destructive border-destructive/30'
  }
  if (c === 'LATE_ARRIVAL' || c === 'LATE_DEPARTURE') {
    return 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200'
  }
  if (c === 'EARLY_ARRIVAL' || c === 'EARLY_DEPARTURE') {
    return 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200'
  }
  if (c === 'ON_TIME') {
    return 'bg-success/10 text-success border-success/20'
  }
  return 'bg-muted text-muted-foreground border-border'
}

function durationVarianceLabel(code: string | null | undefined): string {
  switch ((code ?? '').toUpperCase()) {
    case 'SHORT_VISIT':
      return 'Short'
    case 'LONG_VISIT':
    case 'EXCESSIVE_OVERRUN':
      return 'Exceeded'
    case 'ON_TIME':
      return 'On time'
    default:
      return 'Not assessed'
  }
}

function durationVarianceBadgeClass(code: string | null | undefined): string {
  const c = (code ?? '').toUpperCase()
  if (c === 'SHORT_VISIT') {
    return 'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200'
  }
  if (c === 'LONG_VISIT' || c === 'EXCESSIVE_OVERRUN') {
    return 'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200'
  }
  if (c === 'ON_TIME') {
    return 'bg-success/10 text-success border-success/20'
  }
  return 'bg-muted text-muted-foreground border-border'
}

function tileClass(tone: 'neutral' | 'warn' | 'danger' | 'ok', active: boolean): string {
  const base = 'rounded-lg border px-3 py-2 text-left transition-colors'
  if (active) {
    if (tone === 'danger') return cn(base, 'border-destructive/40 bg-destructive/10')
    if (tone === 'warn') return cn(base, 'border-orange-500/40 bg-orange-500/10')
    if (tone === 'ok') return cn(base, 'border-success/40 bg-success/10')
    return cn(base, 'border-primary/40 bg-primary/10')
  }
  return cn(base, 'border-border bg-card hover:bg-muted/40')
}

function plannedDurationOf(row: EcmLiveVisitRow): number | null {
  if (row.plannedDurationMinutes != null) return row.plannedDurationMinutes
  if (!row.plannedStartDateTime || !row.plannedEndDateTime) return null
  const ms = new Date(row.plannedEndDateTime).getTime() - new Date(row.plannedStartDateTime).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  return Math.round(ms / 60_000)
}

function actualDurationOf(row: EcmLiveVisitRow): number | null {
  if (row.actualDurationMinutes != null) return row.actualDurationMinutes
  if (!row.actualCheckInAt || !row.actualCheckOutAt) return null
  const ms = new Date(row.actualCheckOutAt).getTime() - new Date(row.actualCheckInAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  return Math.round(ms / 60_000)
}

export function EcmLiveMonitoringPanel() {
  const [date, setDate] = React.useState(todayIso)
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [bucketFilter, setBucketFilter] = React.useState<EcmDashboardBucket | 'all'>('all')
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const dashboard = useEcmLiveDashboard({
    date,
    search: debouncedSearch || undefined,
  })

  const counts = dashboard.data?.counts
  const visits = dashboard.data?.visits ?? []

  const filtered: EcmLiveVisitRow[] =
    bucketFilter === 'all'
      ? visits
      : visits.filter((v) => v.buckets.includes(bucketFilter))

  const openVisit = (jobId: string) => {
    setSelectedJobId(jobId)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-4" data-testid="ecm-live-monitoring-panel">
      <EcmHealthBanner />
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs">
          <span className="text-muted-foreground">Operational date</span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 w-[11rem]"
          />
        </label>
        <label className="relative min-w-[12rem] flex-1 space-y-1 text-xs">
          <span className="text-muted-foreground">Search</span>
          <Search className="pointer-events-none absolute bottom-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Service user or job…"
            className="h-9 pl-8"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          disabled={dashboard.isFetching}
          onClick={() => void dashboard.refetch()}
        >
          {dashboard.isFetching ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      {dashboard.isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading live ECM…
        </div>
      ) : dashboard.isError ? (
        <p className="py-8 text-sm text-destructive">
          Could not load the ECM live dashboard. Check API permissions and that the ECM migration is
          applied.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {BUCKET_META.map((b) => {
              const value = counts?.[b.id] ?? 0
              return (
                <button
                  key={b.id}
                  type="button"
                  className={tileClass(b.tone, bucketFilter === b.id)}
                  onClick={() => setBucketFilter((prev) => (prev === b.id ? 'all' : b.id))}
                >
                  <p className="text-[11px] text-muted-foreground">{b.label}</p>
                  <p className="text-lg font-semibold tabular-nums">{value}</p>
                </button>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            {dashboard.data?.counts.total ?? visits.length} visits · refreshed{' '}
            {dashboard.data?.refreshedAt
              ? new Date(dashboard.data.refreshedAt).toLocaleTimeString()
              : '—'}
            {bucketFilter !== 'all' ? ` · filter: ${bucketFilter}` : ''}
            {' · '}
            Auto-refresh every 60s
          </p>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[1880px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Slot</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Service user
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Planned start
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Planned end
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Actual start
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Actual end
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Start variance (min)
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Start punctuality
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    End variance (min)
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    End punctuality
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Planned duration
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Actual duration
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Duration variance
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Variance (min)
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Exceptions
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Address
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={19}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No visits in this view.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const plannedDuration = plannedDurationOf(row)
                    const actualDuration = actualDurationOf(row)
                    const startPunctuality = punctualityLabel(row.arrivalClassification)
                    const endPunctuality = punctualityLabel(row.departureClassification)
                    const durationLabel = durationVarianceLabel(row.durationClassification)

                    return (
                      <tr
                        key={row.scheduledJobId}
                        className="border-b border-border last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                          {formatVisitDate(row.plannedStartDateTime)}
                        </td>
                        <td className="px-3 py-2.5 font-medium">
                          {row.slotLabel?.trim() || 'Visit'}
                        </td>
                        <td className="px-3 py-2.5">{row.serviceUserName}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatClockTime(row.plannedStartDateTime)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatClockTime(row.plannedEndDateTime)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatClockTime(row.actualCheckInAt)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatClockTime(row.actualCheckOutAt)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                          {formatSignedMinutes(row.startVarianceMinutes)}
                        </td>
                        <td className="px-3 py-2.5">
                          {startPunctuality === 'Not assessed' ? (
                            <span className="text-muted-foreground">Not assessed</span>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                'w-fit font-medium',
                                punctualityBadgeClass(row.arrivalClassification),
                              )}
                            >
                              {startPunctuality}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                          {formatSignedMinutes(row.endVarianceMinutes)}
                        </td>
                        <td className="px-3 py-2.5">
                          {endPunctuality === 'Not assessed' ? (
                            <span className="text-muted-foreground">Not assessed</span>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                'w-fit font-medium',
                                punctualityBadgeClass(row.departureClassification),
                              )}
                            >
                              {endPunctuality}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                          {formatDurationMinutes(plannedDuration)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                          {formatDurationMinutes(actualDuration)}
                        </td>
                        <td className="px-3 py-2.5">
                          {durationLabel === 'Not assessed' ? (
                            <span className="text-muted-foreground">Not assessed</span>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                'w-fit font-medium',
                                durationVarianceBadgeClass(row.durationClassification),
                              )}
                            >
                              {durationLabel}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                          {formatSignedMinutes(row.durationVarianceMinutes)}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-1">
                            <EcmStatusBadge code={row.lifecycleStatus} kind="lifecycle" />
                            <EcmStatusBadge code={row.missedClassification} kind="missed" />
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {row.operationalExceptionCodes.length === 0 &&
                            row.durationClassification === 'NOT_ASSESSED' &&
                            row.arrivalClassification === 'NOT_ASSESSED' ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <>
                                {row.arrivalClassification !== 'NOT_ASSESSED' &&
                                row.arrivalClassification !== 'ON_TIME' ? (
                                  <EcmStatusBadge
                                    code={row.arrivalClassification}
                                    kind="arrival"
                                    className="text-[10px]"
                                  />
                                ) : null}
                                {row.durationClassification !== 'NOT_ASSESSED' &&
                                row.durationClassification !== 'ON_TIME' ? (
                                  <EcmStatusBadge
                                    code={row.durationClassification}
                                    kind="duration"
                                    className="text-[10px]"
                                  />
                                ) : null}
                                {row.operationalExceptionCodes.slice(0, 3).map((code) => (
                                  <EcmStatusBadge
                                    key={`${row.scheduledJobId}-${code}`}
                                    code={code}
                                    kind="generic"
                                    className="text-[10px]"
                                  />
                                ))}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {[row.address, row.postcode].filter(Boolean).join(', ') || '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openVisit(row.scheduledJobId)}
                          >
                            Open
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <EcmExceptionQueuePanel onOpenVisit={openVisit} />
        </>
      )}

      <EcmVisitDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        jobId={selectedJobId}
      />
    </div>
  )
}
