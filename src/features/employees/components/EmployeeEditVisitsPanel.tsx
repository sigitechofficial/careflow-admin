import * as React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
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
  employeeVisitPlannedDurationMinutes,
  employeeVisitSlotLabel,
  useEmployeeVisits,
  type EmployeeVisitBucket,
} from '@/features/employees/hooks/useEmployeeVisits'
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
import {
  dayKeyFromInstant,
  getSyncedOperationalTimeZone,
  operationalTodayIso,
  syncOrganisationOperationalTimezone,
} from '@/shared/lib/operational-day.util'
import { formatTimezoneUtcOffset } from '@/features/settings/organisation-timezone'
import { buildEcmVisitsCsv, EcmVisitsTable } from '@/features/ecm/components/EcmVisitsTable'
import { useEcmVisitsTable } from '@/features/ecm/hooks/useEcm'
import type { EcmLiveVisitRow } from '@/features/ecm/types/ecm.types'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { VisitDeliveryAssessment } from '@/features/scheduling/utils/visit-delivery-assessment.util'
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

function monthDateRange(month: string): { dateFrom: string; dateTo: string } {
  const [y = 1970, m = 1] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { dateFrom: `${month}-01`, dateTo: `${month}-${String(lastDay).padStart(2, '0')}` }
}

/** Table row for a visit ECM has no row for (sample visits, or no ECM access). */
function jobToEcmRow(job: TimelineJob, delivery: VisitDeliveryAssessment): EcmLiveVisitRow {
  return {
    scheduledJobId: job.id,
    scheduledVisitId: job.visits?.[0]?.id ?? null,
    visitRef: job.visitRef ?? null,
    jobName: job.jobName,
    slotLabel: employeeVisitSlotLabel(job) || null,
    serviceUserId: job.serviceUserId,
    serviceUserName: serviceUserLabel(job.serviceUser),
    carers: job.allocations.map((a) => ({
      employeeId: a.employeeId,
      name: [a.employee?.firstName, a.employee?.lastName].filter(Boolean).join(' ').trim(),
      isLeadCarer: Boolean(a.isLeadCarer),
    })),
    address: job.address ?? null,
    postcode: job.postcode ?? null,
    plannedStartDateTime: job.scheduledStartDateTime,
    plannedEndDateTime: job.scheduledEndDateTime,
    actualCheckInAt: employeeVisitActualStart(job),
    actualCheckOutAt: employeeVisitActualEnd(job),
    plannedDurationMinutes: employeeVisitPlannedDurationMinutes(job),
    actualDurationMinutes: employeeVisitActualDurationMinutes(job),
    lifecycleStatus: job.status,
    arrivalClassification: 'NOT_ASSESSED',
    departureClassification: 'NOT_ASSESSED',
    durationClassification: 'NOT_ASSESSED',
    missedClassification: 'NONE',
    confidence: '',
    criticality: '',
    startVarianceMinutes: null,
    endVarianceMinutes: null,
    durationVarianceMinutes: null,
    appliedSettingsLevel: '',
    operationalExceptionCodes: delivery.flags.map((flag) => flag.code),
    buckets: [],
  }
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
  const canReadEcm = useAuthStore((s) => s.can('ecm.read') || s.can('ecm.monitor'))

  const [month, setMonth] = React.useState(currentOrgMonth)
  const [filter, setFilter] = React.useState<StatusFilter>('all')
  const [codeFilter, setCodeFilter] = React.useState<CodeFilter>({ kind: 'none' })
  const [showStatusSamples, setShowStatusSamples] = React.useState(false)

  const settingsQuery = useGeneralSettings(canRead)
  React.useEffect(() => {
    if (settingsQuery.data?.timezone) {
      syncOrganisationOperationalTimezone(settingsQuery.data.timezone)
    }
  }, [settingsQuery.data?.timezone])
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

  // Same columns and timings as ECM live monitoring, for the visits shown below.
  const ecmQuery = useEcmVisitsTable(
    { employeeId, ...monthDateRange(month) },
    canRead && canReadEcm,
  )
  const tableRows = React.useMemo(() => {
    const ecmByJob = new Map((ecmQuery.data?.rows ?? []).map((row) => [row.scheduledJobId, row]))
    return visible.map(
      ({ job, delivery, isSample }) =>
        (!isSample && ecmByJob.get(job.id)) || jobToEcmRow(job, delivery),
    )
  }, [ecmQuery.data?.rows, visible])
  const sampleJobIds = React.useMemo(
    () => new Set(visible.filter((r) => r.isSample).map((r) => r.job.id)),
    [visible],
  )
  // Sample visits are demo rows — never exported.
  const exportRows = tableRows.filter((row) => !sampleJobIds.has(row.scheduledJobId))
  const downloadCsv = () => {
    // BOM so Excel reads UTF-8 characters correctly.
    const blob = new Blob(['﻿', buildEcmVisitsCsv(exportRows)], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `employee-visits-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
                  {ecmQuery.isLoading ? ' | loading ECM timings…' : ''}
                  {!canReadEcm || ecmQuery.isError
                    ? ' | punctuality and variance need ECM access'
                    : ''}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                disabled={exportRows.length === 0 || ecmQuery.isLoading}
                onClick={downloadCsv}
                data-testid="employee-visits-export-csv"
              >
                Export CSV
              </Button>
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
              <EcmVisitsTable
                rows={tableRows}
                className="max-h-[min(70vh,36rem)] overflow-auto"
                rowClassName={(row) =>
                  sampleJobIds.has(row.scheduledJobId) ? 'bg-amber-500/5' : undefined
                }
                renderAction={(row) =>
                  sampleJobIds.has(row.scheduledJobId) ? (
                    <span className="text-xs text-muted-foreground">Verify</span>
                  ) : canOpenSchedule ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        to="/scheduling/visits/$jobId"
                        params={{ jobId: row.scheduledJobId }}
                        search={{
                          date:
                            dayKeyFromInstant(row.plannedStartDateTime) ||
                            row.plannedStartDateTime.slice(0, 10),
                          returnTo: `/employee/${employeeId}/edit?tab=visits`,
                        }}
                        className="inline-flex items-center gap-1"
                      >
                        Open
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )
                }
              />
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
