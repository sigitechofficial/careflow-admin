import * as React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  FlaskConical,
  ListChecks,
  Loader2,
  MapPin,
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
import { formatOrganisationTime } from '@/shared/lib/organisation-display-format.store'
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

function utcMonthLabel(month: string): string {
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

function currentUtcMonth(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function formatVisitDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

function formatClockTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return formatOrganisationTime(iso, { utc: true })
}

function bucketLabel(bucket: EmployeeVisitBucket): string {
  if (bucket === 'completed') return 'Completed'
  if (bucket === 'ongoing') return 'Ongoing'
  if (bucket === 'upcoming') return 'Upcoming'
  return 'Other'
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
        'rounded-xl border p-4 text-left shadow-sm transition-colors',
        active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-display font-bold tabular-nums text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <span
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
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

  const [month, setMonth] = React.useState(currentUtcMonth)
  const [filter, setFilter] = React.useState<StatusFilter>('all')
  const [codeFilter, setCodeFilter] = React.useState<CodeFilter>({ kind: 'none' })
  const [showStatusSamples, setShowStatusSamples] = React.useState(true)

  const settingsQuery = useGeneralSettings(canRead)
  const query = useEmployeeVisits(employeeId, month, canRead)
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

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view employee visits.
      </p>
    )
  }

  return (
    <div className="space-y-6" data-testid="employee-edit-visits-panel">
      <ContentSectionHeader
        title="Visits"
        description="Allocated visits for this carer — planned vs actual times, punctuality, and duration for CQC evidence."
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

      <VisitDeliveryStatusCodesReference
        defaultOpen={false}
        activeFilter={codeFilter}
        onSelectLifecycle={(code) => selectCodeFilter({ kind: 'lifecycle', code })}
        onSelectTiming={(code) => selectCodeFilter({ kind: 'timing', code })}
        onSelectDuration={(code) => selectCodeFilter({ kind: 'duration', code })}
        onClearFilter={() => setCodeFilter({ kind: 'none' })}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
              <CalendarDays className="h-4 w-4" aria-hidden />
            </span>
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
            <div className="min-w-[10rem] text-center">
              <p className="text-sm font-semibold text-foreground">{utcMonthLabel(month)}</p>
              <p className="text-xs text-muted-foreground">{month}</p>
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
              onClick={() => setMonth(currentUtcMonth())}
              data-testid="employee-visits-this-month"
            >
              This month
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={showStatusSamples ? 'default' : 'outline'}
              leftIcon={<FlaskConical className="h-3.5 w-3.5" />}
              onClick={() => setShowStatusSamples((v) => !v)}
              data-testid="employee-visits-toggle-samples"
            >
              {showStatusSamples ? 'Sample visits on' : 'Sample visits off'}
            </Button>
            {(
              [
                ['all', 'All', <ListChecks className="h-3.5 w-3.5" aria-hidden />],
                ['completed', 'Completed', <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />],
                ['ongoing', 'Ongoing', <PlayCircle className="h-3.5 w-3.5" aria-hidden />],
                ['upcoming', 'Upcoming', <CalendarClock className="h-3.5 w-3.5" aria-hidden />],
                ['other', 'Other', <AlertTriangle className="h-3.5 w-3.5" aria-hidden />],
              ] as const
            ).map(([id, label, icon]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={filter === id ? 'default' : 'outline'}
                leftIcon={icon}
                onClick={() => setFilter(id)}
                data-testid={`employee-visits-filter-${id}`}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {codeFilter.kind !== 'none' ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <Filter className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="text-muted-foreground">Code filter:</span>
          <Badge variant="outline" className="font-medium">
            {codeFilter.kind} · {codeFilter.code}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setCodeFilter({ kind: 'none' })}
          >
            Clear
          </Button>
          <div className="flex flex-wrap gap-1">
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 self-center text-xs font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Quick filters
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
              className="h-7 text-xs"
              onClick={() => selectCodeFilter({ kind, code })}
            >
              {label}
            </Button>
          ))}
        </div>
      )}

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading visits…
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

          <ContentCard className="space-y-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-500/10 text-slate-700 dark:text-slate-300">
                  <ListChecks className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Visit list</h3>
                  <p className="text-xs text-muted-foreground">
                    {visible.length} visit{visible.length === 1 ? '' : 's'}
                    {showStatusSamples
                      ? ` · ${classified.filter((r) => r.isSample).length} samples included`
                      : ''}
                    {query.data?.totalMinutes
                      ? ` · ${(query.data.totalMinutes / 60).toFixed(1)}h planned (live)`
                      : ''}
                  </p>
                </div>
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <CalendarCheck className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm text-muted-foreground">
                  No matching visits
                  {filter !== 'all' ? ` in ${bucketLabel(filter).toLowerCase()}` : ''}
                  {codeFilter.kind !== 'none' ? ` for ${codeFilter.code}` : ''} in{' '}
                  {utcMonthLabel(month)}.
                  {!showStatusSamples
                    ? ' Turn on Sample visits to load verification rows.'
                    : ''}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[1880px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                          Date
                        </span>
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Slot
                      </th>
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
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          Planned duration
                        </span>
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
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                          Exceptions
                        </span>
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          Address
                        </span>
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Action
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

                      return (
                        <tr
                          key={job.id}
                          className={cn(
                            'border-b border-border last:border-0 hover:bg-muted/20',
                            isSample && 'bg-amber-500/5',
                          )}
                        >
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                            {formatVisitDate(job.scheduledStartDateTime)}
                            {isSample ? (
                              <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
                                Sample
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 font-medium">
                            {employeeVisitSlotLabel(job)}
                          </td>
                          <td className="px-3 py-2.5">{serviceUserLabel(job.serviceUser)}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                            {formatClockTime(job.scheduledStartDateTime)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                            {formatClockTime(job.scheduledEndDateTime)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                            {formatClockTime(actualStart)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                            {formatClockTime(actualEnd)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                            {startPunctuality.varianceMinutes || '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            {startPunctuality.kind === 'unknown' ? (
                              <span className="text-muted-foreground">Not assessed</span>
                            ) : (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'w-fit font-medium',
                                  visitPunctualityBadgeClass(startPunctuality),
                                )}
                                title={`Tolerance ±${toleranceMinutes} min`}
                              >
                                {startPunctuality.outcome}
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                            {endPunctuality.varianceMinutes || '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            {endPunctuality.kind === 'unknown' ? (
                              <span className="text-muted-foreground">Not assessed</span>
                            ) : (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'w-fit font-medium',
                                  visitPunctualityBadgeClass(endPunctuality),
                                )}
                                title={`Tolerance ±${toleranceMinutes} min`}
                              >
                                {endPunctuality.outcome}
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                            {formatDurationMinutes(plannedDurationMins)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                            {formatDurationMinutes(actualDurationMins)}
                          </td>
                          <td className="px-3 py-2.5">
                            {variance.kind === 'unknown' ? (
                              <span className="text-muted-foreground">Not assessed</span>
                            ) : (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'w-fit font-medium',
                                  visitDurationVarianceBadgeClass(variance),
                                )}
                              >
                                {varianceExport.durationVariance}
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                            {varianceExport.varianceMinutes || '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-1">
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
                                className="w-fit text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
                                onClick={() =>
                                  selectCodeFilter({
                                    kind: 'lifecycle',
                                    code: delivery.lifecycleStatus,
                                  })
                                }
                              >
                                {delivery.lifecycleLabel}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex max-w-[220px] flex-wrap gap-1">
                              {delivery.flags.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
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
                                    title={`${flag.detail ?? flag.label} — click to filter`}
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
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {[job.address, job.postcode].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="px-3 py-2.5">
                            {isSample ? (
                              <span className="text-xs text-muted-foreground">Verify only</span>
                            ) : canOpenSchedule ? (
                              <Button variant="outline" size="sm" asChild>
                                <Link
                                  to="/scheduling/visits/$jobId"
                                  params={{ jobId: job.id }}
                                  search={{
                                    date: job.scheduledStartDateTime.slice(0, 10),
                                    returnTo: `/employee/${employeeId}/edit?tab=visits`,
                                  }}
                                  className="inline-flex items-center gap-1.5"
                                >
                                  Open
                                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                                </Link>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
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
        </>
      )}
    </div>
  )
}
