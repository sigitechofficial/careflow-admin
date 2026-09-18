import * as React from 'react'
import {
  AlarmClock,
  AlertTriangle,
  CircleAlert,
  CircleHelp,
  Clock,
  ExternalLink,
  Hand,
  ListFilter,
  Loader2,
  LogOut,
  MapPinOff,
  RefreshCw,
  Search,
  Timer,
  XCircle,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { useEcmLiveDashboard, useInvalidateEcmQueries } from '@/features/ecm/hooks/useEcm'
import { useEcmOperationalPeriod } from '@/features/ecm/hooks/useEcmOperationalPeriod'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { EcmStatusBadge } from '@/features/ecm/components/EcmStatusBadge'
import { EcmVisitDetailDialog } from '@/features/ecm/components/EcmVisitDetailDialog'
import { EcmHealthBanner } from '@/features/ecm/components/EcmHealthBanner'
import { EcmOperationalPeriodCard } from '@/features/ecm/components/EcmOperationalPeriodCard'
import type {
  EcmDashboardBucket,
  EcmLiveDashboardSummary,
  EcmLiveVisitRow,
} from '@/features/ecm/types/ecm.types'
import { formatPeriodDayShort } from '@/features/ecm/utils/ecm-operational-period.util'
import { formatOpsCalendarDate, formatOpsClockTime } from '@/shared/lib/operational-day.util'
import { fetchEcmLiveDashboard } from '@/features/ecm/api/ecm.api'

const BUCKET_TONE_ICON: Record<'neutral' | 'warn' | 'danger' | 'ok', string> = {
  neutral: 'bg-muted text-muted-foreground',
  warn: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  danger: 'bg-destructive/10 text-destructive',
  ok: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
}

const COMPLETED_LIFECYCLES = new Set([
  'COMPLETED',
  'COMPLETED_WITH_EXCEPTION',
  'CHECKED_OUT',
  'CLOSED',
])

type VisitStatusScope = 'all' | 'active' | 'completed'

const BUCKET_META: {
  id: EcmDashboardBucket
  label: string
  tone: 'neutral' | 'warn' | 'danger' | 'ok'
  icon: React.ReactNode
}[] = [
  {
    id: 'dueNow',
    label: 'Due now',
    tone: 'warn',
    icon: <AlarmClock className="h-4 w-4" aria-hidden />,
  },
  {
    id: 'startingSoon',
    label: 'Starting soon',
    tone: 'neutral',
    icon: <Clock className="h-4 w-4" aria-hidden />,
  },
  {
    id: 'earlyArrival',
    label: 'Early (open)',
    tone: 'warn',
    icon: <AlarmClock className="h-4 w-4" aria-hidden />,
  },
  {
    id: 'lateArrival',
    label: 'Late (open)',
    tone: 'warn',
    icon: <Timer className="h-4 w-4" aria-hidden />,
  },
  {
    id: 'veryLateArrival',
    label: 'Very late (open)',
    tone: 'danger',
    icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
  },
  {
    id: 'potentialMissed',
    label: 'Potential missed',
    tone: 'warn',
    icon: <CircleAlert className="h-4 w-4" aria-hidden />,
  },
  {
    id: 'confirmedMissed',
    label: 'Confirmed missed',
    tone: 'danger',
    icon: <XCircle className="h-4 w-4" aria-hidden />,
  },
  {
    id: 'missingCheckout',
    label: 'Missing checkout',
    tone: 'warn',
    icon: <LogOut className="h-4 w-4" aria-hidden />,
  },
  {
    id: 'outsideGeofence',
    label: 'Outside geofence',
    tone: 'warn',
    icon: <MapPinOff className="h-4 w-4" aria-hidden />,
  },
  {
    id: 'leftVisitArea',
    label: 'Left visit area',
    tone: 'danger',
    icon: <MapPinOff className="h-4 w-4" aria-hidden />,
  },
  {
    id: 'manualAttendance',
    label: 'Admin completed',
    tone: 'neutral',
    icon: <Hand className="h-4 w-4" aria-hidden />,
  },
]

type EcmTileWindows = {
  dueNowWindowMinutes: number
  startingSoonMinutes: number
  earlyArrivalToleranceMinutes: number
  lateArrivalToleranceMinutes: number
  veryLateThresholdMinutes: number
  missedVisitThresholdMinutes: number
  geofenceRadiusMeters: number
}

function bucketLabel(
  id: EcmDashboardBucket,
  baseLabel: string,
  windows?: EcmTileWindows | null,
): string {
  if (!windows) return baseLabel
  switch (id) {
    case 'completed':
      return 'Completed'
    case 'completedOnTime':
      // Includes early arrivals within tolerance — distinct from open Early tile.
      return 'Completed on time'
    case 'completedLate':
      return 'Completed late'
    case 'dueNow':
      return `Due now (±${windows.dueNowWindowMinutes} min)`
    case 'startingSoon':
      return `Starting soon (${windows.startingSoonMinutes} min)`
    case 'inProgress':
      return 'In progress (checked in)'
    case 'earlyArrival':
      return `Early open (>${windows.earlyArrivalToleranceMinutes} min before)`
    case 'lateArrival':
      return `Late open (>${windows.lateArrivalToleranceMinutes} min)`
    case 'veryLateArrival':
      return `Very late open (>${windows.veryLateThresholdMinutes} min)`
    case 'potentialMissed':
      return `Potential missed (≥${windows.missedVisitThresholdMinutes} min)`
    case 'confirmedMissed':
      return 'Confirmed missed (ops confirmed)'
    case 'missingCheckout':
      return 'Missing checkout (past end)'
    case 'outsideGeofence':
      return `Outside geofence (>${windows.geofenceRadiusMeters} m)`
    case 'leftVisitArea':
      return 'Left visit area (locked, per visit)'
    case 'manualAttendance':
      return 'Admin completed (schedule-jobs / office times)'
    default:
      return baseLabel
  }
}

function formatVisitDate(iso: string): string {
  return formatOpsCalendarDate(iso)
}

function formatClockTime(iso: string | null | undefined): string {
  return formatOpsClockTime(iso)
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

function VarianceGroupCell({
  label,
  badgeClassName,
  minutes,
}: {
  label: string
  badgeClassName: string
  minutes: number | null | undefined
}) {
  const assessed = label !== 'Not assessed'
  return (
    <div className="flex flex-col items-start gap-0.5">
      {assessed ? (
        <Badge variant="outline" className={cn('w-fit font-medium', badgeClassName)}>
          {label}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
      <span className="tabular-nums text-xs text-muted-foreground">
        {formatSignedMinutes(minutes)}
        {minutes != null ? ' min' : ''}
      </span>
    </div>
  )
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

function carersLabel(row: EcmLiveVisitRow): string {
  const carers = row.carers ?? []
  if (carers.length === 0) return '—'
  const ordered = [...carers].sort(
    (a, b) => Number(b.isLeadCarer) - Number(a.isLeadCarer),
  )
  if (ordered.length <= 2) {
    return ordered.map((c) => c.name || c.employeeId).join(', ')
  }
  const primary = ordered[0]?.name || ordered[0]?.employeeId || 'Carer'
  return `${primary} +${ordered.length - 1}`
}

function tileClass(tone: 'neutral' | 'warn' | 'danger' | 'ok', active: boolean): string {
  const base = 'rounded-xl border px-3 py-3 text-left transition-colors'
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

function isCompletedVisit(row: EcmLiveVisitRow): boolean {
  const life = String(row.lifecycleStatus).toUpperCase()
  // In-progress workspace visits must never count as completed (even with leftover checkout).
  if (life === 'IN_PROGRESS' || life === 'CHECKED_IN') return false
  if (COMPLETED_LIFECYCLES.has(life)) return true
  if (row.buckets.includes('completed')) return true
  return Boolean(row.actualCheckOutAt)
}

/** Client fallback when API has not yet shipped `summary` (older servers). */
function deriveSummary(visits: EcmLiveVisitRow[], now = new Date()): EcmLiveDashboardSummary {
  let completed = 0
  let completedOnTime = 0
  let completedLate = 0
  let outstanding = 0
  let inProgress = 0
  let potentialMissed = 0
  let confirmedMissed = 0
  let missingCheckout = 0
  let missingCheckIn = 0

  for (const row of visits) {
    const done = isCompletedVisit(row)
    const missed = row.buckets.includes('confirmedMissed')
    if (done) {
      completed += 1
      if (row.buckets.includes('completedOnTime')) completedOnTime += 1
      else if (row.buckets.includes('completedLate')) completedLate += 1
      else {
        const arrival = String(row.arrivalClassification).toUpperCase()
        if (arrival === 'ON_TIME' || arrival === 'EARLY_ARRIVAL') completedOnTime += 1
        else if (arrival === 'LATE_ARRIVAL' || arrival === 'VERY_LATE_ARRIVAL') completedLate += 1
      }
    } else if (!missed) {
      outstanding += 1
    }
    if (row.buckets.includes('inProgress')) inProgress += 1
    if (row.buckets.includes('potentialMissed')) potentialMissed += 1
    if (missed) confirmedMissed += 1
    if (row.buckets.includes('missingCheckout')) missingCheckout += 1
    const startMs = new Date(row.plannedStartDateTime).getTime()
    if (!done && !missed && !row.actualCheckInAt && Number.isFinite(startMs) && startMs < now.getTime()) {
      missingCheckIn += 1
    }
  }

  const assessed = completedOnTime + completedLate
  return {
    total: visits.length,
    completed,
    completedOnTime,
    completedLate,
    completedOnTimePct:
      assessed > 0 ? Math.round((completedOnTime / assessed) * 1000) / 10 : null,
    outstanding,
    inProgress,
    potentialMissed,
    confirmedMissed,
    missingCheckout,
    missingCheckIn,
  }
}

function summaryMetricClass(active: boolean): string {
  return cn(
    'rounded-lg border px-3 py-2 text-left transition-colors',
    active ? 'border-primary/40 bg-primary/10' : 'border-border bg-card hover:bg-muted/40',
  )
}

/** Join address + postcode without duplicating a postcode already present in the address line. */
function formatEcmVisitAddress(address?: string | null, postcode?: string | null): string {
  const addr = address?.replace(/\s+/g, ' ').trim() ?? ''
  const pc = postcode?.replace(/\s+/g, ' ').trim() ?? ''
  if (!addr && !pc) return '—'
  if (!pc) return addr
  if (!addr) return pc
  const norm = (s: string) => s.toUpperCase()
  if (norm(addr) === norm(pc)) return addr
  const parts = addr.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length > 0 && norm(parts[parts.length - 1]!) === norm(pc)) return addr
  if (norm(addr).endsWith(norm(pc))) return addr
  return `${addr}, ${pc}`
}

export function EcmLiveMonitoringPanel({
  serviceUserId,
}: {
  /** When set, scopes the live dashboard to one service user. */
  serviceUserId?: string
} = {}) {
  const scoped = Boolean(serviceUserId)
  const { locationId } = useGlobalLocationScope()
  const period = useEcmOperationalPeriod('today')
  const {
    preset,
    dateFrom,
    dateTo,
    periodLabel,
    multiDay,
    operationalToday,
    operationalTimezone,
    setPreset,
    setDateFrom,
    setDateTo,
    applyPreset,
  } = period
  const [search, setSearch] = React.useState('')
  const [debouncedSearch, setDebouncedSearch] = React.useState('')
  const [bucketFilter, setBucketFilter] = React.useState<EcmDashboardBucket | 'all'>('all')
  const [statusScope, setStatusScope] = React.useState<VisitStatusScope>('all')
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const tableScrollRef = React.useRef<HTMLDivElement>(null)
  const [isScrolledX, setIsScrolledX] = React.useState(false)

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const dashboard = useEcmLiveDashboard({
    dateFrom,
    dateTo,
    search: scoped ? undefined : debouncedSearch || undefined,
    locationId: scoped ? undefined : (locationId ?? undefined),
    serviceUserId,
  })
  const invalidateEcm = useInvalidateEcmQueries()

  // Return from schedule-board (SPA nav or tab focus) must not show stale tiles/queue.
  React.useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') invalidateEcm()
    }
    const onFocus = () => invalidateEcm()
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('focus', onFocus)
    }
  }, [invalidateEcm])

  // Remount after navigating back from visit workspace — force fresh exceptions + tiles.
  React.useEffect(() => {
    invalidateEcm()
  }, [invalidateEcm])

  const counts = dashboard.data?.counts
  const windows = dashboard.data?.windows ?? null
  const periodTotal = dashboard.data?.total ?? counts?.total ?? 0

  const [extraVisits, setExtraVisits] = React.useState<EcmLiveVisitRow[]>([])
  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [loadingMore, setLoadingMore] = React.useState(false)

  React.useEffect(() => {
    setExtraVisits([])
    setNextCursor(dashboard.data?.nextCursor ?? null)
  }, [
    dashboard.data?.refreshedAt,
    dateFrom,
    dateTo,
    debouncedSearch,
    locationId,
    serviceUserId,
    dashboard.data?.nextCursor,
  ])

  const visits = React.useMemo(() => {
    const first = dashboard.data?.visits ?? []
    if (extraVisits.length === 0) return first
    const seen = new Set(first.map((v) => v.scheduledJobId))
    return [...first, ...extraVisits.filter((v) => !seen.has(v.scheduledJobId))]
  }, [dashboard.data?.visits, extraVisits])

  const summary = dashboard.data?.summary ?? deriveSummary(visits)

  const loadMoreVisits = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await fetchEcmLiveDashboard({
        dateFrom,
        dateTo,
        search: scoped ? undefined : debouncedSearch || undefined,
        locationId: scoped ? undefined : (locationId ?? undefined),
        serviceUserId,
        cursor: nextCursor,
        limit: 150,
      })
      setExtraVisits((prev) => [...prev, ...(page.visits ?? [])])
      setNextCursor(page.nextCursor ?? null)
    } finally {
      setLoadingMore(false)
    }
  }

  const scopedByStatus = React.useMemo(() => {
    if (statusScope === 'all') return visits
    if (statusScope === 'completed') return visits.filter(isCompletedVisit)
    return visits.filter((v) => !isCompletedVisit(v))
  }, [visits, statusScope])

  const filtered: EcmLiveVisitRow[] =
    bucketFilter === 'all'
      ? scopedByStatus
      : scopedByStatus.filter((v) => v.buckets.includes(bucketFilter))

  React.useEffect(() => {
    const el = tableScrollRef.current
    if (!el) return
    const update = () => setIsScrolledX(el.scrollLeft > 0)
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [dashboard.isLoading, dashboard.isError, filtered.length])

  const openVisit = (jobId: string) => {
    setSelectedJobId(jobId)
    setDetailOpen(true)
  }

  const refreshAll = () => {
    invalidateEcm()
    void dashboard.refetch()
  }

  const setBucketOrClear = (id: EcmDashboardBucket) => {
    setBucketFilter((prev) => (prev === id ? 'all' : id))
  }

  const activeBucketLabel =
    bucketFilter === 'all'
      ? null
      : bucketLabel(
          bucketFilter,
          BUCKET_META.find((b) => b.id === bucketFilter)?.label ?? bucketFilter,
          windows,
        )

  const statusScopeLabel =
    statusScope === 'all' ? 'All visits' : statusScope === 'completed' ? 'Completed' : 'Active'

  const filtersHideAll =
    visits.length > 0 && filtered.length === 0 && (bucketFilter !== 'all' || statusScope !== 'all')

  return (
    <div className="space-y-4" data-testid="ecm-live-monitoring-panel">
      {scoped ? null : <EcmHealthBanner />}
      <EcmOperationalPeriodCard
        preset={preset}
        dateFrom={dateFrom}
        dateTo={dateTo}
        periodLabel={periodLabel}
        operationalToday={dashboard.data?.operationalToday ?? operationalToday}
        operationalTimezone={dashboard.data?.operationalTimezone ?? operationalTimezone}
        onPresetChange={setPreset}
        onApplyPreset={applyPreset}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        hideLocation={scoped}
        testIdPrefix="ecm-live"
        footnote={
          <>
            Showing visits planned{' '}
            {multiDay ? (
              <>
                from{' '}
                <span className="font-medium text-foreground">
                  {formatPeriodDayShort(dateFrom)}
                </span>{' '}
                to{' '}
                <span className="font-medium text-foreground">
                  {formatPeriodDayShort(dateTo)}
                </span>
              </>
            ) : (
              <span className="font-medium text-foreground">
                {formatPeriodDayShort(dateFrom)}
              </span>
            )}
            . Due now / starting soon only count open visits for today.
          </>
        }
      >
        {scoped ? null : (
          <label className="relative min-w-[12rem] flex-1 space-y-1 text-xs sm:max-w-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Search
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Service user or job…"
                className="h-9 pl-8"
              />
            </div>
          </label>
        )}
        <div className="space-y-1">
          <span className="invisible block text-xs leading-none" aria-hidden>
            Actions
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={dashboard.isFetching}
            onClick={refreshAll}
          >
            {dashboard.isFetching ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </EcmOperationalPeriodCard>

      {dashboard.isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading live ECM…</p>
        </div>
      ) : dashboard.isError ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm text-destructive">
            Could not load the ECM live dashboard. Check API permissions and that the ECM migration is
            applied.
          </p>
        </div>
      ) : (
        <>
          <ContentCard className="p-3" data-testid="ecm-live-summary-strip">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {multiDay ? `Period summary · ${periodLabel}` : `Day summary · ${formatPeriodDayShort(dateFrom)}`}
              </p>
              {summary.completedOnTimePct != null ? (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {summary.completedOnTimePct}% of assessed completions on time
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  {
                    key: 'total',
                    label: 'Total',
                    value: summary.total,
                    onClick: () => {
                      setStatusScope('all')
                      setBucketFilter('all')
                    },
                    active: statusScope === 'all' && bucketFilter === 'all',
                  },
                  {
                    key: 'completed',
                    label: 'Completed',
                    value: summary.completed,
                    onClick: () => {
                      setStatusScope('completed')
                      setBucketFilter('all')
                    },
                    active: statusScope === 'completed' && bucketFilter === 'all',
                  },
                  {
                    key: 'onTime',
                    label: 'On time',
                    value: summary.completedOnTime,
                    onClick: () => {
                      setStatusScope('all')
                      setBucketFilter('completedOnTime')
                    },
                    active: bucketFilter === 'completedOnTime',
                  },
                  {
                    key: 'late',
                    label: 'Completed late',
                    value: summary.completedLate,
                    onClick: () => {
                      setStatusScope('all')
                      setBucketFilter('completedLate')
                    },
                    active: bucketFilter === 'completedLate',
                  },
                  {
                    key: 'outstanding',
                    label: 'Outstanding',
                    value: summary.outstanding,
                    onClick: () => {
                      setStatusScope('active')
                      setBucketFilter('all')
                    },
                    active: statusScope === 'active' && bucketFilter === 'all',
                  },
                  {
                    key: 'inProgress',
                    label: 'In progress',
                    value: summary.inProgress,
                    onClick: () => {
                      setStatusScope('all')
                      setBucketFilter('inProgress')
                    },
                    active: bucketFilter === 'inProgress',
                  },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={summaryMetricClass(m.active)}
                  onClick={m.onClick}
                >
                  <p className="text-[11px] text-muted-foreground">{m.label}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{m.value}</p>
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>
                Missing check-in <span className="tabular-nums text-foreground">{summary.missingCheckIn}</span>
              </span>
              <span>
                Missing checkout{' '}
                <span className="tabular-nums text-foreground">{summary.missingCheckout}</span>
              </span>
              <span>
                Potential missed{' '}
                <span className="tabular-nums text-foreground">{summary.potentialMissed}</span>
              </span>
              <span>
                Confirmed missed{' '}
                <span className="tabular-nums text-foreground">{summary.confirmedMissed}</span>
              </span>
            </div>
          </ContentCard>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {BUCKET_META.map((b) => {
              const value = counts?.[b.id] ?? 0
              const active = bucketFilter === b.id
              const label = bucketLabel(b.id, b.label, windows)
              return (
                <button
                  key={b.id}
                  type="button"
                  className={tileClass(b.tone, active)}
                  title={label}
                  onClick={() => setBucketOrClear(b.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[11px] font-medium leading-snug text-muted-foreground">
                      {label}
                    </p>
                    <span
                      className={cn(
                        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        BUCKET_TONE_ICON[b.tone],
                      )}
                    >
                      {b.icon}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-semibold tabular-nums text-foreground">{value}</p>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <p className="inline-flex flex-wrap items-center gap-1.5">
              <ListFilter className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Showing {filtered.length} loaded
              {periodTotal > 0 ? ` · ${visits.length} of ${periodTotal} in period` : ''}
              {' · '}scope: {statusScopeLabel}
              {activeBucketLabel ? ` · tile: ${activeBucketLabel}` : ''}
              {' · '}
              refreshed{' '}
              {dashboard.data?.refreshedAt
                ? formatOpsClockTime(dashboard.data.refreshedAt)
                : '—'}
              {' · '}
              Auto-refresh every 60s
            </p>
            {bucketFilter !== 'all' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setBucketFilter('all')}
              >
                Clear tile filter
              </Button>
            ) : null}
          </div>

          <div
            ref={tableScrollRef}
            className="overflow-x-auto rounded-lg border border-border"
          >
            <table className="w-full min-w-[1760px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="sticky left-0 z-30 w-[8.5rem] min-w-[8.5rem] border-b border-border bg-muted px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="sticky left-[8.5rem] z-30 w-[5.5rem] min-w-[5.5rem] border-b border-border bg-muted px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Slot
                  </th>
                  <th
                    className={cn(
                      'sticky left-[14rem] z-30 min-w-[9rem] border-b border-border bg-muted px-3 py-2.5 text-left font-medium text-muted-foreground',
                      isScrolledX &&
                        'border-r shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)]',
                    )}
                  >
                    Service user
                  </th>
                  <th className="min-w-[8rem] border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Carer
                  </th>
                  <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Planned start
                  </th>
                  <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Planned end
                  </th>
                  <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Actual start
                  </th>
                  <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Actual end
                  </th>
                  <th className="min-w-[8.5rem] border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Start punctuality
                  </th>
                  <th className="min-w-[8.5rem] border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    End punctuality
                  </th>
                  <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Planned duration
                  </th>
                  <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Actual duration
                  </th>
                  <th className="min-w-[8.5rem] border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Duration variance
                  </th>
                  <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Exceptions
                  </th>
                  <th className="min-w-[12rem] max-w-[16rem] border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Address
                  </th>
                  <th className="border-b border-border px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="px-3 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <CircleHelp className="h-6 w-6" aria-hidden />
                        </span>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {filtersHideAll ? 'No visits match these filters' : 'No visits in this view'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {filtersHideAll
                              ? 'Click Total on the summary strip, or clear the tile filter, to see visits again.'
                              : scoped
                                ? `No ECM visits for this service user in ${periodLabel}. Pick a period that includes scheduled visits, clear filters, or refresh.`
                                : 'Try another period, clear filters, or refresh.'}
                          </p>
                          {filtersHideAll ? (
                            <div className="pt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setStatusScope('all')
                                  setBucketFilter('all')
                                }}
                              >
                                Reset filters
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const plannedDuration = plannedDurationOf(row)
                    const actualDuration = actualDurationOf(row)
                    const startPunctuality = punctualityLabel(row.arrivalClassification)
                    const endPunctuality = punctualityLabel(row.departureClassification)
                    const durationLabel = durationVarianceLabel(row.durationClassification)
                    const addressLabel = formatEcmVisitAddress(row.address, row.postcode)

                    return (
                      <tr
                        key={row.scheduledJobId}
                        className="group border-b border-border last:border-0 hover:bg-muted/40"
                      >
                        <td className="sticky left-0 z-20 w-[8.5rem] min-w-[8.5rem] border-b border-border bg-card px-3 py-2.5 whitespace-nowrap text-muted-foreground group-hover:bg-muted">
                          {formatVisitDate(row.plannedStartDateTime)}
                        </td>
                        <td className="sticky left-[8.5rem] z-20 w-[5.5rem] min-w-[5.5rem] border-b border-border bg-card px-3 py-2.5 font-medium group-hover:bg-muted">
                          {row.slotLabel?.trim() || 'Visit'}
                        </td>
                        <td
                          className={cn(
                            'sticky left-[14rem] z-20 min-w-[9rem] border-b border-border bg-card px-3 py-2.5 group-hover:bg-muted',
                            isScrolledX &&
                              'border-r shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)]',
                          )}
                        >
                          {row.serviceUserName}
                        </td>
                        <td
                          className="min-w-[8rem] border-b border-border px-3 py-2.5"
                          title={
                            (row.carers ?? []).length > 2
                              ? (row.carers ?? [])
                                  .map((c) => c.name || c.employeeId)
                                  .join(', ')
                              : undefined
                          }
                        >
                          {carersLabel(row)}
                        </td>
                        <td className="border-b border-border px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatClockTime(row.plannedStartDateTime)}
                        </td>
                        <td className="border-b border-border px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatClockTime(row.plannedEndDateTime)}
                        </td>
                        <td className="border-b border-border px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatClockTime(row.actualCheckInAt)}
                        </td>
                        <td className="border-b border-border px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatClockTime(row.actualCheckOutAt)}
                        </td>
                        <td className="border-b border-border px-3 py-2.5">
                          <VarianceGroupCell
                            label={startPunctuality}
                            badgeClassName={punctualityBadgeClass(row.arrivalClassification)}
                            minutes={row.startVarianceMinutes}
                          />
                        </td>
                        <td className="border-b border-border px-3 py-2.5">
                          <VarianceGroupCell
                            label={endPunctuality}
                            badgeClassName={punctualityBadgeClass(row.departureClassification)}
                            minutes={row.endVarianceMinutes}
                          />
                        </td>
                        <td className="border-b border-border px-3 py-2.5 whitespace-nowrap tabular-nums">
                          {formatDurationMinutes(plannedDuration)}
                        </td>
                        <td className="border-b border-border px-3 py-2.5 whitespace-nowrap tabular-nums">
                          {formatDurationMinutes(actualDuration)}
                        </td>
                        <td className="border-b border-border px-3 py-2.5">
                          <VarianceGroupCell
                            label={durationLabel}
                            badgeClassName={durationVarianceBadgeClass(row.durationClassification)}
                            minutes={row.durationVarianceMinutes}
                          />
                        </td>
                        <td className="border-b border-border px-3 py-2.5">
                          <div className="flex flex-col gap-1">
                            <EcmStatusBadge code={row.lifecycleStatus} kind="lifecycle" />
                            <EcmStatusBadge code={row.missedClassification} kind="missed" />
                          </div>
                        </td>
                        <td className="border-b border-border px-3 py-2.5">
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
                        <td className="min-w-[12rem] max-w-[16rem] border-b border-border px-3 py-2.5 text-muted-foreground">
                          <span
                            className="line-clamp-2 break-words"
                            title={addressLabel === '—' ? undefined : addressLabel}
                          >
                            {addressLabel}
                          </span>
                        </td>
                        <td className="border-b border-border px-3 py-2.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openVisit(row.scheduledJobId)}
                          >
                            Open
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {nextCursor ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loadingMore}
                onClick={() => void loadMoreVisits()}
              >
                {loadingMore ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Load more visits
              </Button>
            </div>
          ) : null}
        </>
      )}

      <EcmVisitDetailDialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) invalidateEcm()
        }}
        jobId={selectedJobId}
      />
    </div>
  )
}
