import * as React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  FlaskConical,
  Loader2,
  PlayCircle,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import {
  classifyEmployeeVisit,
  employeeVisitActualDurationMinutes,
  employeeVisitActualEnd,
  employeeVisitActualStart,
  employeeVisitDurationVariance,
  employeeVisitOutcomeBadgeClass,
  employeeVisitOutcomeLabel,
  employeeVisitPlannedDurationMinutes,
  employeeVisitSlotLabel,
  formatDurationMinutes,
  useEmployeeVisits,
  visitDurationVarianceBadgeClass,
  visitDurationVarianceExportFields,
  type EmployeeVisitBucket,
} from '@/features/employees/hooks/useEmployeeVisits'
import {
  classifyVisitPunctuality,
  resolveVisitPunctualityToleranceMinutes,
  visitPunctualityBadgeClass,
} from '@/features/employees/utils/visit-punctuality.util'
import {
  assessVisitDeliveryFromJobLike,
  VISIT_DURATION_EXCEPTION_CATALOG,
  VISIT_LIFECYCLE_STATUS_CATALOG,
  VISIT_TIMING_STATUS_CATALOG,
} from '@/features/scheduling/utils/visit-delivery-assessment.util'
import { VisitDeliveryStatusCodesReference } from '@/features/scheduling/components/VisitDeliveryStatusCodesReference'
import {
  buildVisitStatusSampleJobs,
  isVisitStatusSampleJob,
} from '@/features/employees/utils/visit-status-sample-jobs.util'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import {
  dayKeyFromInstant,
  formatOpsCalendarDate,
  formatOpsClockTime,
  getSyncedOperationalTimeZone,
  operationalTodayIso,
  syncOrganisationOperationalTimezone,
} from '@/shared/lib/operational-day.util'
import { formatTimezoneUtcOffset } from '@/features/settings/organisation-timezone'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'

type StatusFilter = 'all' | EmployeeVisitBucket
type CodeFilter =
  | { kind: 'none' }
  | { kind: 'lifecycle'; code: string }
  | { kind: 'timing'; code: string }
  | { kind: 'duration'; code: string }

function monthLabel(month: string): string {
  const [yRaw, mRaw] = month.split('-')
  const y = Number(yRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(y) || !Number.isFinite(m) || y < 1 || m < 1) return month
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)))
}

function shiftMonth(month: string, delta: number): string {
  const [yRaw, mRaw] = month.split('-')
  const y = Number(yRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(y) || !Number.isFinite(m)) return month
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function currentOrgMonth(): string {
  return operationalTodayIso().slice(0, 7)
}

function formatVisitDate(
  iso: string,
  formatDate: (dayIso: string) => string,
): string {
  const day = dayKeyFromInstant(iso)
  if (!day) return formatOpsCalendarDate(iso)
  return formatDate(day)
}

function formatClockLabel(iso: string | null | undefined): string {
  const value = formatOpsClockTime(iso)
  if (!value || value === '?' || value === '-') return '-'
  if (value.charCodeAt(0) === 8212 || value.charCodeAt(0) === 8211) return '-'
  return value
}

function formatDurationLabel(minutes: number | null): string {
  const value = formatDurationMinutes(minutes)
  if (!value || value === '?' || value.charCodeAt(0) === 8212) return '-'
  return value
}

function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  const from = formatClockLabel(start)
  const to = formatClockLabel(end)
  if (from === '-' && to === '-') return '-'
  if (to === '-') return from
  if (from === '-') return to
  return `${from} - ${to}`
}

function bucketLabel(bucket: EmployeeVisitBucket): string {
  if (bucket === 'completed') return 'Completed'
  if (bucket === 'ongoing') return 'Ongoing'
  if (bucket === 'upcoming') return 'Upcoming'
  return 'Other'
}

function PunctualityCell({ result }: { result: ReturnType<typeof classifyVisitPunctuality> }) {
  if (result.kind === 'unknown') {
    return <span className="text-xs text-muted-foreground">-</span>
  }
  return (
    <div className="space-y-0.5">
      <Badge
        variant="outline"
        className={cn('w-fit font-medium', visitPunctualityBadgeClass(result))}
        title={`Tolerance +/-${result.toleranceMinutes} min`}
      >
        {result.outcome}
      </Badge>
      {result.varianceMinutes ? (
        <p className="text-[11px] tabular-nums text-muted-foreground">{result.varianceMinutes} min</p>
      ) : null}
    </div>
  )
}

function StatCard({
  title,
  value,
  hint,
  active,
  onClick,
  icon,
  iconClassName,
}: {
  title: string
  value: number
  hint: string
  active?: boolean
  onClick?: () => void
  icon: React.ReactNode
  iconClassName: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-4 py-3.5 text-left shadow-sm transition-colors',
        active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/30',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-0.5 text-xl font-display font-semibold tabular-nums text-foreground">
            {value}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{hint}</p>
        </div>
        <span
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            iconClassName,
          )}
        >
          {icon}
        </span>
      </div>
    </button>
  )
}

export function EmployeeEditVisitsPanel({ employeeId }: { employeeId: string }) {
  const canRead = useAuthStore(
    (s) =>
      s.can('employees.read') ||
      s.can('employees.update') ||
      s.can('schedule_timelines.read' as never),
  )
  const canOpenSchedule = useAuthStore((s) => s.can('schedule_timelines.read' as never))

  const [month, setMonth] = React.useState(currentOrgMonth)
  const [filter, setFilter] = React.useState<StatusFilter>('all')
  const [codeFilter, setCodeFilter] = React.useState<CodeFilter>({ kind: 'none' })
  const [showStatusSamples, setShowStatusSamples] = React.useState(false)
  const tableScrollRef = React.useRef<HTMLDivElement>(null)
  const [isScrolledX, setIsScrolledX] = React.useState(false)

  const settingsQuery = useGeneralSettings(canRead)
  React.useEffect(() => {
    if (settingsQuery.data?.timezone) {
      syncOrganisationOperationalTimezone(settingsQuery.data.timezone)
    }
  }, [settingsQuery.data?.timezone])
  const { formatDate } = useOrganisationDisplayFormat()
  const query = useEmployeeVisits(employeeId, month, canRead)
  const organisationTimezone =
    query.data?.organisationTimezone?.trim() ||
    settingsQuery.data?.timezone?.trim() ||
    getSyncedOperationalTimeZone()
  const timezoneHint = `${organisationTimezone} (${formatTimezoneUtcOffset(organisationTimezone)})`
  const liveJobs = query.data?.jobs ?? []
  const serverSummary = query.data?.summary

  const orgToleranceSettings = React.useMemo(
    () => ({
      domLateVisitAlertMinutes: settingsQuery.data?.domLateVisitAlertMinutes,
      domGlobalToleranceMinutes: settingsQuery.data?.domGlobalToleranceMinutes,
    }),
    [
      settingsQuery.data?.domLateVisitAlertMinutes,
      settingsQuery.data?.domGlobalToleranceMinutes,
    ],
  )

  const jobs = React.useMemo(() => {
    if (!showStatusSamples) return liveJobs
    return [...buildVisitStatusSampleJobs(month, employeeId), ...liveJobs]
  }, [employeeId, liveJobs, month, showStatusSamples])

  const classified = React.useMemo(() => {
    const now = new Date()
    return jobs.map((job) => {
      const bucket = classifyEmployeeVisit(job, now)
      const delivery =
        job.deliveryAssessment ??
        assessVisitDeliveryFromJobLike({
          status: job.status,
          requiredCarers: job.requiredCarers,
          allocatedCarers: job.allocatedCarers,
          allocations: job.allocations,
          scheduledStartDateTime: job.scheduledStartDateTime,
          scheduledEndDateTime: job.scheduledEndDateTime,
          actualStartDateTime: employeeVisitActualStart(job),
          actualEndDateTime: employeeVisitActualEnd(job),
          visitPlan: job.visitPlan,
          visits: job.visits,
          orgLateAlertMinutes: orgToleranceSettings.domLateVisitAlertMinutes,
          orgGlobalToleranceMinutes: orgToleranceSettings.domGlobalToleranceMinutes,
        })
      return { job, bucket, delivery, isSample: isVisitStatusSampleJob(job) }
    })
  }, [jobs, orgToleranceSettings])

  const counts = React.useMemo(() => {
    // Prefer server summary for live jobs; recompute when sample visits are mixed in.
    if (!showStatusSamples && serverSummary) {
      return {
        completed: serverSummary.completed,
        ongoing: serverSummary.ongoing,
        upcoming: serverSummary.upcoming,
        other: serverSummary.other,
      }
    }
    const next = { completed: 0, ongoing: 0, upcoming: 0, other: 0 }
    for (const row of classified) next[row.bucket] += 1
    return next
  }, [classified, serverSummary, showStatusSamples])

  const visible = React.useMemo(() => {
    return classified.filter((row) => {
      if (filter !== 'all' && row.bucket !== filter) return false
      if (codeFilter.kind === 'lifecycle') {
        return row.delivery.lifecycleStatus === codeFilter.code
      }
      if (codeFilter.kind === 'timing') {
        return row.delivery.timingStatus === codeFilter.code
      }
      if (codeFilter.kind === 'duration') {
        return row.delivery.durationExceptions.includes(
          codeFilter.code as (typeof row.delivery.durationExceptions)[number],
        )
      }
      return true
    })
  }, [classified, codeFilter, filter])

  const selectCodeFilter = React.useCallback((next: CodeFilter) => {
    setCodeFilter((prev) => {
      if (
        prev.kind === next.kind &&
        next.kind !== 'none' &&
        prev.kind !== 'none' &&
        prev.code === next.code
      ) {
        return { kind: 'none' }
      }
      return next
    })
  }, [])

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
  }, [visible.length])

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view employee visits.
      </p>
    )
  }

  return (
    <div className="space-y-5" data-testid="employee-edit-visits-panel">
      <ContentSectionHeader
        title="Visits"
        description="Planned vs actual times, punctuality, and duration for this carer. Month and visit clocks use the organisation operational timezone."
        icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
        iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
        action={
          canOpenSchedule ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/scheduling/schedule-jobs"
                search={{}}
                data-testid="employee-visits-open-schedule"
                className="inline-flex items-center gap-1.5"
              >
                Open schedule
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Previous month"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              data-testid="employee-visits-prev-month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[9.5rem] text-center">
              <p className="text-sm font-semibold text-foreground">{monthLabel(month)}</p>
              <p className="text-[11px] text-muted-foreground">Operational month</p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Next month"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              data-testid="employee-visits-next-month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              leftIcon={<CalendarClock className="h-3.5 w-3.5" />}
              onClick={() => setMonth(currentOrgMonth())}
              data-testid="employee-visits-this-month"
            >
              This month
            </Button>
            <span
              className="inline-flex h-8 items-center rounded-md border border-dashed border-border bg-muted/40 px-2.5 text-xs text-muted-foreground"
              title="Month navigation and visit planned/actual times use the organisation operational timezone"
              data-testid="employee-visits-timezone-hint"
            >
              Times in {timezoneHint}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant={showStatusSamples ? 'secondary' : 'ghost'}
            leftIcon={<FlaskConical className="h-3.5 w-3.5" />}
            onClick={() => setShowStatusSamples((v) => !v)}
            data-testid="employee-visits-toggle-samples"
          >
            {showStatusSamples ? 'Samples on' : 'Show samples'}
          </Button>
        </div>

        {codeFilter.kind !== 'none' ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Filter className="h-3.5 w-3.5 text-primary" aria-hidden />
            <span className="text-xs text-muted-foreground">Filter</span>
            <Badge variant="outline" className="font-medium">
              {codeFilter.kind}: {codeFilter.code}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setCodeFilter({ kind: 'none' })}
            >
              Clear
            </Button>
            <div className="flex flex-wrap gap-1.5">
              {codeFilter.kind === 'lifecycle'
                ? VISIT_LIFECYCLE_STATUS_CATALOG.map((item) => (
                    <Button
                      key={item.code}
                      type="button"
                      size="sm"
                      variant={codeFilter.code === item.code ? 'default' : 'outline'}
                      className="h-7 text-xs"
                      onClick={() => selectCodeFilter({ kind: 'lifecycle', code: item.code })}
                    >
                      {item.label}
                    </Button>
                  ))
                : null}
              {codeFilter.kind === 'timing'
                ? VISIT_TIMING_STATUS_CATALOG.map((item) => (
                    <Button
                      key={item.code}
                      type="button"
                      size="sm"
                      variant={codeFilter.code === item.code ? 'default' : 'outline'}
                      className="h-7 text-xs"
                      onClick={() => selectCodeFilter({ kind: 'timing', code: item.code })}
                    >
                      {item.label}
                    </Button>
                  ))
                : null}
              {codeFilter.kind === 'duration'
                ? VISIT_DURATION_EXCEPTION_CATALOG.map((item) => (
                    <Button
                      key={item.code}
                      type="button"
                      size="sm"
                      variant={codeFilter.code === item.code ? 'default' : 'outline'}
                      className="h-7 text-xs"
                      onClick={() => selectCodeFilter({ kind: 'duration', code: item.code })}
                    >
                      {item.label}
                    </Button>
                  ))
                : null}
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" aria-hidden />
              Exceptions
            </span>
            {(
              [
                ['timing', 'LATE_START', 'Late start'],
                ['timing', 'CRITICALLY_LATE', 'Critically late'],
                ['lifecycle', 'MISSED', 'Missed'],
                ['duration', 'OVERRUN', 'Overrun'],
                ['duration', 'EARLY_END', 'Early end'],
                ['duration', 'ACTUAL_SHORT_VISIT', 'Actual short'],
                ['lifecycle', 'EN_ROUTE', 'En route'],
              ] as const
            ).map(([kind, code, label]) => (
              <Button
                key={code}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-full px-2.5 text-xs"
                onClick={() => selectCodeFilter({ kind, code })}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading visits?
        </div>
      ) : query.isError ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          Could not load visits for this employee. Check employees or schedule access.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Completed"
              value={counts.completed}
              hint="Finished or partially completed"
              active={filter === 'completed'}
              onClick={() => setFilter(filter === 'completed' ? 'all' : 'completed')}
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
              iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            />
            <StatCard
              title="Ongoing"
              value={counts.ongoing}
              hint="In progress now"
              active={filter === 'ongoing'}
              onClick={() => setFilter(filter === 'ongoing' ? 'all' : 'ongoing')}
              icon={<PlayCircle className="h-5 w-5" aria-hidden />}
              iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
            />
            <StatCard
              title="Upcoming"
              value={counts.upcoming}
              hint="Allocated future visits"
              active={filter === 'upcoming'}
              onClick={() => setFilter(filter === 'upcoming' ? 'all' : 'upcoming')}
              icon={<CalendarClock className="h-5 w-5" aria-hidden />}
              iconClassName="bg-violet-500/10 text-violet-700 dark:text-violet-300"
            />
            <StatCard
              title="Other"
              value={counts.other}
              hint="Missed, cancelled, or past incomplete"
              active={filter === 'other'}
              onClick={() => setFilter(filter === 'other' ? 'all' : 'other')}
              icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
              iconClassName="bg-amber-500/10 text-amber-800 dark:text-amber-300"
            />
          </div>

          <ContentCard className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Visit list</h3>
                <p className="text-xs text-muted-foreground">
                  {visible.length} visit{visible.length === 1 ? '' : 's'}
                  {showStatusSamples
                    ? ` | ${classified.filter((r) => r.isSample).length} samples`
                    : ''}
                  {query.data?.totalMinutes
                    ? ` | ${(query.data.totalMinutes / 60).toFixed(1)}h planned`
                    : ''}
                </p>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No matching visits
                  {filter !== 'all' ? ` in ${bucketLabel(filter).toLowerCase()}` : ''}
                  {codeFilter.kind !== 'none' ? ` for ${codeFilter.code}` : ''} in{' '}
                  {monthLabel(month)}.
                </p>
              </div>
            ) : (
              <div
                ref={tableScrollRef}
                className="max-h-[min(70vh,36rem)] overflow-auto rounded-lg border border-border"
              >
                <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr className="bg-muted/40">
                      <th
                        className={cn(
                          'sticky left-0 top-0 z-40 w-[11rem] min-w-[11rem] border-b border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground',
                          isScrolledX && 'border-r shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)]',
                        )}
                      >
                        Visit
                      </th>
                      <th className="sticky top-0 z-30 border-b border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Planned
                      </th>
                      <th className="sticky top-0 z-30 border-b border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Actual
                      </th>
                      <th className="sticky top-0 z-30 border-b border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Start
                      </th>
                      <th className="sticky top-0 z-30 border-b border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        End
                      </th>
                      <th className="sticky top-0 z-30 border-b border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Duration
                      </th>
                      <th className="sticky top-0 z-30 border-b border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="sticky top-0 z-30 border-b border-border bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        Exceptions
                      </th>
                      <th className="sticky top-0 z-30 border-b border-border bg-muted px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                        Open
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(({ job, bucket, delivery, isSample }) => {
                      const outcome = employeeVisitOutcomeLabel(job, bucket)
                      const actualStart = employeeVisitActualStart(job)
                      const actualEnd = employeeVisitActualEnd(job)
                      const plannedDurationMins = employeeVisitPlannedDurationMinutes(job)
                      const actualDurationMins = employeeVisitActualDurationMinutes(job)
                      const variance = employeeVisitDurationVariance(job)
                      const varianceExport = visitDurationVarianceExportFields(variance)
                      const toleranceMinutes = resolveVisitPunctualityToleranceMinutes({
                        org: orgToleranceSettings,
                        slot: job.visitPlan,
                      })
                      const startPunctuality = classifyVisitPunctuality(
                        job.scheduledStartDateTime,
                        actualStart,
                        toleranceMinutes,
                      )
                      const endPunctuality = classifyVisitPunctuality(
                        job.scheduledEndDateTime,
                        actualEnd,
                        toleranceMinutes,
                      )
                      const stickyBg = isSample
                        ? 'bg-amber-50 dark:bg-amber-950/20'
                        : 'bg-card'
                      const stickyHover = 'group-hover:bg-muted'
                      const address = [job.address, job.postcode].filter(Boolean).join(', ')

                      return (
                        <tr
                          key={job.id}
                          className={cn(
                            'group border-b border-border last:border-0 hover:bg-muted/20',
                            isSample && 'bg-amber-500/5',
                          )}
                        >
                          <td
                            className={cn(
                              'sticky left-0 z-20 w-[11rem] min-w-[11rem] border-b border-border px-3 py-2.5 align-top',
                              stickyBg,
                              stickyHover,
                              isScrolledX &&
                                'border-r shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)]',
                            )}
                          >
                            <p className="font-medium leading-snug">
                              {serviceUserLabel(job.serviceUser)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatVisitDate(job.scheduledStartDateTime, formatDate)}
                              {employeeVisitSlotLabel(job)
                                ? ` | ${employeeVisitSlotLabel(job)}`
                                : ''}
                            </p>
                            {job.visitRef ? (
                              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                {job.visitRef}
                              </p>
                            ) : null}
                            {address ? (
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground" title={address}>
                                {address}
                              </p>
                            ) : null}
                            {isSample ? (
                              <span className="mt-1 inline-block text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
                                Sample
                              </span>
                            ) : null}
                          </td>
                          <td className="border-b border-border px-3 py-2.5 align-top whitespace-nowrap tabular-nums text-muted-foreground">
                            {formatTimeRange(
                              job.scheduledStartDateTime,
                              job.scheduledEndDateTime,
                            )}
                          </td>
                          <td className="border-b border-border px-3 py-2.5 align-top whitespace-nowrap tabular-nums text-muted-foreground">
                            {formatTimeRange(actualStart, actualEnd)}
                          </td>
                          <td className="border-b border-border px-3 py-2.5 align-top">
                            <PunctualityCell result={startPunctuality} />
                          </td>
                          <td className="border-b border-border px-3 py-2.5 align-top">
                            <PunctualityCell result={endPunctuality} />
                          </td>
                          <td className="border-b border-border px-3 py-2.5 align-top">
                            <p className="whitespace-nowrap tabular-nums">
                              {formatDurationLabel(plannedDurationMins)} /{' '}
                              {formatDurationLabel(actualDurationMins)}
                            </p>
                            {variance.kind === 'unknown' ? (
                              <p className="text-[11px] text-muted-foreground">Not assessed</p>
                            ) : (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'mt-1 w-fit font-medium',
                                  visitDurationVarianceBadgeClass(variance),
                                )}
                              >
                                {varianceExport.durationVariance}
                                {varianceExport.varianceMinutes
                                  ? ` (${varianceExport.varianceMinutes})`
                                  : ''}
                              </Badge>
                            )}
                          </td>
                          <td className="border-b border-border px-3 py-2.5 align-top">
                            <Badge
                              variant="outline"
                              className={cn(
                                'w-fit font-medium',
                                employeeVisitOutcomeBadgeClass(job, bucket),
                              )}
                            >
                              {outcome}
                            </Badge>
                            <button
                              type="button"
                              className="mt-1 block w-fit text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
                              onClick={() =>
                                selectCodeFilter({
                                  kind: 'lifecycle',
                                  code: delivery.lifecycleStatus,
                                })
                              }
                            >
                              {delivery.lifecycleLabel}
                            </button>
                          </td>
                          <td className="border-b border-border px-3 py-2.5 align-top">
                            <div className="flex max-w-[180px] flex-wrap gap-1">
                              {delivery.flags.length === 0 ? (
                                <span className="text-muted-foreground">-</span>
                              ) : (
                                delivery.flags.slice(0, 4).map((flag) => (
                                  <Badge
                                    key={`${job.id}-${flag.code}`}
                                    variant="outline"
                                    className={cn(
                                      'w-fit cursor-pointer text-[10px] font-medium',
                                      flag.severity === 'critical' &&
                                        'bg-destructive/10 text-destructive border-destructive/30',
                                      flag.severity === 'warning' &&
                                        'bg-orange-500/10 text-orange-800 border-orange-500/30 dark:text-orange-200',
                                      flag.severity === 'info' &&
                                        'bg-sky-500/10 text-sky-800 border-sky-500/30 dark:text-sky-200',
                                    )}
                                    title={`${flag.detail ?? flag.label} - click to filter`}
                                    onClick={() => {
                                      if (
                                        flag.code === 'LATE_START' ||
                                        flag.code === 'CRITICALLY_LATE' ||
                                        flag.code === 'EARLY_ARRIVAL' ||
                                        flag.code === 'ON_TIME'
                                      ) {
                                        selectCodeFilter({ kind: 'timing', code: flag.code })
                                      } else if (
                                        flag.code === 'MISSED' ||
                                        flag.code === 'CANCELLED' ||
                                        flag.code === 'CALLED_OFF'
                                      ) {
                                        selectCodeFilter({ kind: 'lifecycle', code: flag.code })
                                      } else {
                                        selectCodeFilter({ kind: 'duration', code: flag.code })
                                      }
                                    }}
                                  >
                                    {flag.label}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="border-b border-border px-3 py-2.5 align-top text-right">
                            {isSample ? (
                              <span className="text-xs text-muted-foreground">Verify</span>
                            ) : canOpenSchedule ? (
                              <Button variant="ghost" size="sm" asChild>
                                <Link
                                  to="/scheduling/visits/$jobId"
                                  params={{ jobId: job.id }}
                                  search={{
                                    date:
                                      dayKeyFromInstant(job.scheduledStartDateTime) ||
                                      job.scheduledStartDateTime.slice(0, 10),
                                    returnTo: `/employee/${employeeId}/edit?tab=visits`,
                                  }}
                                  className="inline-flex items-center gap-1"
                                >
                                  Open
                                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                </Link>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">?</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ContentCard>

          <VisitDeliveryStatusCodesReference
            defaultOpen={false}
            activeFilter={codeFilter}
            onSelectLifecycle={(code) => selectCodeFilter({ kind: 'lifecycle', code })}
            onSelectTiming={(code) => selectCodeFilter({ kind: 'timing', code })}
            onSelectDuration={(code) => selectCodeFilter({ kind: 'duration', code })}
            onClearFilter={() => setCodeFilter({ kind: 'none' })}
          />
        </>
      )}
    </div>
  )
}
