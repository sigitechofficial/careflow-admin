import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CalendarDays, ExternalLink, Layers, List, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { dayKeyFromInstant, formatOpsClockTime } from '@/shared/lib/operational-day.util'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { listCarePlanFormsForRules } from '@/features/care-pathway/api/care-plan-recommendation-rules.api'
import { ScheduleJobAllocateDialog } from '@/features/scheduling/components/ScheduleJobAllocateDialog'
import { ScheduleFilterBar } from '@/features/scheduling/components/schedule-filters/ScheduleFilterBar'
import { ScheduleJobsOpsSummaryBar } from '@/features/scheduling/components/schedule-filters/ScheduleJobsOpsSummaryBar'
import { ScheduleVisitSlotLabel } from '@/features/scheduling/components/schedule-filters/ScheduleVisitSlotLabel'
import { ScheduleLeadCarerBadge } from '@/features/scheduling/components/schedule-filters/ScheduleLeadCarerBadge'
import { ScheduleJobStatusBadge } from '@/features/scheduling/components/schedule-filters/ScheduleJobStatusBadge'
import { useScheduleListFilterState } from '@/features/scheduling/hooks/useScheduleListFilterState'
import { useScheduleListRange } from '@/features/scheduling/hooks/useScheduleListRange'
import { useScheduleAreas } from '@/features/scheduling/hooks/useScheduling'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
import {
  buildBranchSummariesFromTimelineJobs,
  buildServiceUserBranchFilterOptions,
} from '@/features/settings/location-management/build-service-user-branch-filter-options'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  activeJobAllocationCount,
  jobNeedsAlert,
  jobNeedsCarerAssignment,
  serviceUserLabel,
} from '@/features/scheduling/utils/scheduling-format'
import {
  buildCarePlanFormNameMap,
  formatLinkedCarePlanLabels,
  jobAttentionReason,
  timelineJobLinkedCarePlanIds,
} from '@/features/scheduling/utils/scheduling-visit-plan.util'
import { buildScheduleJobsServiceUserOptions } from '@/features/scheduling/utils/schedule-jobs-service-user-filter.util'
import {
  buildScheduleJobsRequiredCarersOptions,
  countScheduleJobsByRequiredCarers,
} from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'
import {
  applyScheduleSharedJobFilters,
  buildCarerFilterOptionsFromJobs,
} from '@/features/scheduling/utils/schedule-shared-job-filters.util'
import {
  countScheduleJobsByOperationalFilter,
  countScheduleJobsByOutcome,
  countScheduleJobsWithOperationalIssues,
  filterTimelineJobsByOperational,
  filterTimelineJobsByOutcome,
} from '@/features/scheduling/utils/schedule-job-board-filter.util'
import { jobScheduleDateIso } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import {
  formatPeriodDayShort,
} from '@/features/ecm/utils/ecm-operational-period.util'
import {
  jobDurationMinutes,
  jobRequiredCarerMinutes,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import {
  buildScheduleListJobOverlapInfo,
  scheduleListJobHasOverlap,
  scheduleListJobOverlapCount,
  type ScheduleListJobOverlapInfo,
} from '@/features/scheduling/utils/schedule-list-job-overlap.util'

function jobBookedCarerMinutes(job: TimelineJob): number {
  return jobDurationMinutes(job) * activeJobAllocationCount(job)
}

function jobEndIso(job: TimelineJob): string {
  if (job.scheduledEndDateTime) return job.scheduledEndDateTime
  const start = new Date(job.scheduledStartDateTime).getTime()
  return new Date(start + jobDurationMinutes(job) * 60_000).toISOString()
}

function overlapBadgeLabel(info: ScheduleListJobOverlapInfo): string {
  const su = info.serviceUserOverlapJobIds.length > 0
  const carer = info.carerOverlapJobIds.length > 0
  if (su && carer) return 'Overlaps (SU + carer)'
  if (su) return 'Overlaps (service user)'
  return 'Overlaps (carer)'
}

function groupJobsByDay(jobs: TimelineJob[]): Array<{ day: string; jobs: TimelineJob[] }> {
  const map = new Map<string, TimelineJob[]>()
  for (const job of jobs) {
    const day = jobScheduleDateIso(job)
    const list = map.get(day)
    if (list) list.push(job)
    else map.set(day, [job])
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, dayJobs]) => ({ day, jobs: dayJobs }))
}

export default function ScheduleListPage() {
  const hasApi = !!getApiBaseUrl()
  const filters = useScheduleListFilterState()
  const [allocateJobId, setAllocateJobId] = React.useState<string | null>(null)
  const [allocateOpen, setAllocateOpen] = React.useState(false)
  const [overlapsOnly, setOverlapsOnly] = React.useState(false)

  const {
    jobs: rangeJobs,
    isLoading,
    isError,
    refetch,
    rangeTruncated,
    maxDays,
    fullDayCount,
  } = useScheduleListRange(filters.period.dateFrom, filters.period.dateTo, hasApi)
  const scheduleAreasQuery = useScheduleAreas()
  const serviceUserLocationsQuery = useServiceUserLocations(hasApi)

  const carePlanFormsQuery = useQuery({
    queryKey: ['care-plan-forms-catalog'],
    queryFn: listCarePlanFormsForRules,
    enabled: hasApi,
    staleTime: 5 * 60_000,
  })

  const carePlanNameById = React.useMemo(
    () => buildCarePlanFormNameMap(carePlanFormsQuery.data ?? []),
    [carePlanFormsQuery.data],
  )

  const allJobs = rangeJobs

  const branchFilterOptions = React.useMemo(() => {
    const summariesByLocationId = buildBranchSummariesFromTimelineJobs(allJobs)
    return buildServiceUserBranchFilterOptions({
      scheduleAreas: scheduleAreasQuery.data ?? [],
      zones: serviceUserLocationsQuery.data?.zones,
      summariesByLocationId,
    })
  }, [allJobs, scheduleAreasQuery.data, serviceUserLocationsQuery.data?.zones])

  const serviceUserOptions = React.useMemo(
    () => buildScheduleJobsServiceUserOptions(allJobs),
    [allJobs],
  )

  const jobsAfterLocationAndSu = React.useMemo(
    () =>
      applyScheduleSharedJobFilters(allJobs, {
        locationIds: filters.locationFilterIds,
        serviceUserIds: filters.serviceUserFilterIds,
        employeeIds: [],
        requiredCarersFilters: [],
      }),
    [allJobs, filters.locationFilterIds, filters.serviceUserFilterIds],
  )

  const carerOptions = React.useMemo(
    () => buildCarerFilterOptionsFromJobs(jobsAfterLocationAndSu),
    [jobsAfterLocationAndSu],
  )

  const requiredCarersOptions = React.useMemo(
    () =>
      buildScheduleJobsRequiredCarersOptions(
        countScheduleJobsByRequiredCarers(jobsAfterLocationAndSu),
      ),
    [jobsAfterLocationAndSu],
  )

  const jobsAfterShared = React.useMemo(
    () =>
      applyScheduleSharedJobFilters(allJobs, {
        locationIds: filters.locationFilterIds,
        serviceUserIds: filters.serviceUserFilterIds,
        employeeIds: filters.employeeFilterIds,
        requiredCarersFilters: filters.requiredCarersFilters,
      }),
    [
      allJobs,
      filters.locationFilterIds,
      filters.serviceUserFilterIds,
      filters.employeeFilterIds,
      filters.requiredCarersFilters,
    ],
  )

  const jobOutcomeCounts = React.useMemo(
    () => countScheduleJobsByOutcome(jobsAfterShared),
    [jobsAfterShared],
  )

  const jobOperationalCounts = React.useMemo(
    () => countScheduleJobsByOperationalFilter(jobsAfterShared),
    [jobsAfterShared],
  )

  const operationalIssuesCount = React.useMemo(
    () => countScheduleJobsWithOperationalIssues(jobsAfterShared),
    [jobsAfterShared],
  )

  const jobs = React.useMemo(() => {
    const afterOutcome = filterTimelineJobsByOutcome(jobsAfterShared, filters.jobOutcomeFilters)
    return filterTimelineJobsByOperational(afterOutcome, new Set(filters.jobOperationalFilters))
  }, [jobsAfterShared, filters.jobOutcomeFilters, filters.jobOperationalFilters])

  const requiredMinutes = React.useMemo(
    () => jobsAfterShared.reduce((sum, job) => sum + jobRequiredCarerMinutes(job), 0),
    [jobsAfterShared],
  )
  const bookedMinutes = React.useMemo(
    () => jobsAfterShared.reduce((sum, job) => sum + jobBookedCarerMinutes(job), 0),
    [jobsAfterShared],
  )
  const overBookedMinutes = Math.max(0, bookedMinutes - requiredMinutes)
  const unassignedCount = React.useMemo(
    () => jobsAfterShared.filter((job) => jobNeedsCarerAssignment(job)).length,
    [jobsAfterShared],
  )
  const carersWorking = React.useMemo(() => {
    const ids = new Set<string>()
    for (const job of jobsAfterShared) {
      for (const allocation of job.allocations ?? []) {
        if (allocation.employee?.id) ids.add(allocation.employee.id)
      }
    }
    return ids.size
  }, [jobsAfterShared])

  const overlapByJobId = React.useMemo(() => {
    const map = new Map<string, ScheduleListJobOverlapInfo>()
    for (const { jobs: dayJobs } of groupJobsByDay(jobs)) {
      for (const [jobId, info] of buildScheduleListJobOverlapInfo(dayJobs)) {
        map.set(jobId, info)
      }
    }
    return map
  }, [jobs])

  const overlapJobCount = React.useMemo(
    () => jobs.filter((job) => scheduleListJobHasOverlap(overlapByJobId.get(job.id))).length,
    [jobs, overlapByJobId],
  )

  const visibleJobs = React.useMemo(() => {
    if (!overlapsOnly) return jobs
    return jobs.filter((job) => scheduleListJobHasOverlap(overlapByJobId.get(job.id)))
  }, [jobs, overlapsOnly, overlapByJobId])

  const dayGroups = React.useMemo(() => groupJobsByDay(visibleJobs), [visibleJobs])
  const multiDay = filters.period.dateFrom !== filters.period.dateTo
  const attentionCount = visibleJobs.filter(
    (job) => jobNeedsAlert(job) || jobAttentionReason(job),
  ).length
  const allocateJob = allocateJobId ? allJobs.find((j) => j.id === allocateJobId) ?? null : null

  const openAllocate = (job: TimelineJob) => {
    setAllocateJobId(job.id)
    setAllocateOpen(true)
  }

  if (!hasApi) {
    return <p className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL.</p>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-5 md:p-6">
      <PageHeader
        title="List View of Schedule"
        description="Tabular list of scheduled jobs for the selected operational period, with the same filters and issue chips as the rota board."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Scheduling', href: '/scheduling/schedule-jobs' },
          { label: 'List view' },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button size="sm" variant="outline" className="gap-1.5" asChild>
          <Link to="/scheduling/schedule-jobs" search={filters.boardLinkSearch}>
            <CalendarDays className="h-3.5 w-3.5" />
            Rota board
          </Link>
        </Button>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          Refresh
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <ScheduleFilterBar
          date={filters.date}
          onDateChange={filters.setScheduleDate}
          period={filters.periodControls}
          showDateControls
          locationIds={filters.locationFilterIds}
          branchFilterOptions={branchFilterOptions}
          allBranchesLabel={`All branches (${allJobs.length})`}
          onLocationChange={filters.setScheduleLocationFilter}
          locationFilterDisabled={filters.locationFilterDisabled}
          serviceUserIds={filters.serviceUserFilterIds}
          serviceUsers={serviceUserOptions}
          allServiceUsersLabel={`All service users (${serviceUserOptions.length})`}
          onServiceUserChange={filters.setScheduleServiceUserFilter}
          employeeIds={filters.employeeFilterIds}
          carers={carerOptions}
          allCarersLabel={`All carers (${carerOptions.length})`}
          onEmployeeChange={filters.setScheduleEmployeeFilter}
          requiredCarersFilters={filters.requiredCarersFilters}
          requiredCarersOptions={requiredCarersOptions}
          allVisitsLabel={`All visits (${jobsAfterLocationAndSu.length})`}
          onRequiredCarersFiltersChange={filters.setScheduleRequiredCarersFilters}
          onClearFilters={filters.clearFilters}
          className="border-0 bg-transparent p-0 shadow-none"
        />

        <ScheduleJobsOpsSummaryBar
          requiredMinutes={requiredMinutes}
          bookedMinutes={bookedMinutes}
          overBookedMinutes={overBookedMinutes}
          unassignedCount={unassignedCount}
          carersWorking={carersWorking}
          jobOutcomeFilters={filters.jobOutcomeFilters}
          jobOutcomeCounts={jobOutcomeCounts}
          onToggleJobOutcomeFilter={filters.toggleJobOutcomeFilter}
          jobOperationalFilters={filters.jobOperationalFilters}
          jobOperationalCounts={jobOperationalCounts}
          onToggleJobOperationalFilter={filters.toggleJobOperationalFilter}
          operationalIssuesCount={operationalIssuesCount}
          statsScopeNote={
            multiDay
              ? 'Totals for visits in the selected period (after branch / SU / carer filters)'
              : 'Totals for this day (after branch / SU / carer filters)'
          }
        />
      </div>

      {rangeTruncated ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Showing the first {maxDays} days of this {fullDayCount}-day period. Narrow the operational
          period for the full range.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 text-sm font-semibold">
          <List className="h-4 w-4" />
          Jobs ({visibleJobs.length}
          {visibleJobs.length !== allJobs.length ? ` of ${allJobs.length}` : ''})
          {attentionCount > 0 ? (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
              <AlertCircle className="h-3 w-3" aria-hidden />
              {attentionCount} need attention
            </span>
          ) : null}
          {overlapJobCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
              <Layers className="h-3 w-3" aria-hidden />
              {overlapJobCount} overlapping
            </span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={overlapsOnly ? 'default' : 'outline'}
            className="ml-auto h-8 gap-1.5"
            aria-pressed={overlapsOnly}
            disabled={overlapJobCount === 0}
            onClick={() => setOverlapsOnly((v) => !v)}
          >
            <Layers className="h-3.5 w-3.5" />
            {overlapsOnly ? 'Showing overlaps' : 'Overlaps only'}
          </Button>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        {isError && (
          <p className="p-4 text-sm text-destructive">
            Failed to load jobs. Check schedule_timelines.read permission.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                {!multiDay ? (
                  <th className="px-3 py-2 font-medium text-muted-foreground">Time</th>
                ) : (
                  <th className="px-3 py-2 font-medium text-muted-foreground">When</th>
                )}
                <th className="px-3 py-2 font-medium text-muted-foreground">Visit</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Service user</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Carers</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Req.</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Run</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleJobs.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                    {allJobs.length === 0
                      ? 'No jobs for this period. Build a schedule or generate rota from a visit plan.'
                      : overlapsOnly
                        ? 'No overlapping visits in the current filter set.'
                        : 'No jobs match the current filters.'}
                  </td>
                </tr>
              ) : (
                dayGroups.map(({ day, jobs: dayJobs }) => (
                  <React.Fragment key={day}>
                    {multiDay ? (
                      <tr className="border-b bg-muted/30">
                        <td colSpan={8} className="px-3 py-2 text-xs font-semibold text-foreground">
                          {formatPeriodDayShort(day)}
                          <span className="ml-2 font-normal text-muted-foreground">
                            {dayJobs.length} visit{dayJobs.length === 1 ? '' : 's'}
                          </span>
                        </td>
                      </tr>
                    ) : null}
                    {dayJobs.map((job) => {
                      const attention = jobAttentionReason(job)
                      const alert = jobNeedsAlert(job) || Boolean(attention)
                      const allocated = activeJobAllocationCount(job)
                      const carers =
                        job.allocations?.filter((a) => a.employee) ?? []
                      const overlap = overlapByJobId.get(job.id)
                      const hasOverlap = scheduleListJobHasOverlap(overlap)
                      const overlapCount = scheduleListJobOverlapCount(overlap)
                      const endIso = jobEndIso(job)
                      return (
                        <tr
                          key={job.id}
                          className={cn(
                            'border-b last:border-0 hover:bg-muted/20',
                            alert && 'bg-amber-50/50 dark:bg-amber-950/20',
                            hasOverlap && !alert && 'bg-violet-50/40 dark:bg-violet-950/15',
                          )}
                        >
                          <td className="whitespace-nowrap px-3 py-2 align-top">
                            <div className="space-y-1">
                              <p className="font-medium tabular-nums">
                                {formatOpsClockTime(job.scheduledStartDateTime)}
                                <span className="mx-1 text-muted-foreground">–</span>
                                {formatOpsClockTime(endIso)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {multiDay ? (
                                  <>
                                    {formatOrganisationDate(`${dayKeyFromInstant(job.scheduledStartDateTime)}T12:00:00.000Z`, {
                                      utc: true,
                                    })}
                                    {' · '}
                                  </>
                                ) : null}
                                {jobDurationMinutes(job)} min
                              </p>
                              {hasOverlap && overlap ? (
                                <Badge
                                  variant="secondary"
                                  size="sm"
                                  className="gap-1 border-violet-300/80 bg-violet-100 text-violet-950 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100"
                                  title={overlapBadgeLabel(overlap)}
                                >
                                  <Layers className="h-2.5 w-2.5" aria-hidden />
                                  Overlaps · {overlapCount}
                                </Badge>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <ScheduleVisitSlotLabel
                              job={job}
                              subtitle={
                                formatLinkedCarePlanLabels(
                                  timelineJobLinkedCarePlanIds(job),
                                  carePlanNameById,
                                ) !== '—' ? (
                                  <p className="max-w-[180px] truncate text-[11px] text-muted-foreground">
                                    {formatLinkedCarePlanLabels(
                                      timelineJobLinkedCarePlanIds(job),
                                      carePlanNameById,
                                    )}
                                  </p>
                                ) : null
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Link
                              to="/service-users/$serviceUserId/view"
                              params={{ serviceUserId: job.serviceUserId }}
                              className="font-medium text-primary underline-offset-2 hover:underline"
                            >
                              {serviceUserLabel(job.serviceUser)}
                            </Link>
                          </td>
                          <td className="px-3 py-2 align-top">
                            {carers.length === 0 ? (
                              <span className="text-muted-foreground">Unassigned</span>
                            ) : (
                              <ul className="space-y-0.5">
                                {carers.map((allocation) => {
                                  const employee = allocation.employee!
                                  const name = [employee.firstName, employee.lastName]
                                    .filter(Boolean)
                                    .join(' ')
                                  return (
                                    <li
                                      key={allocation.id ?? employee.id}
                                      className="flex flex-wrap items-center gap-1.5"
                                    >
                                      <Link
                                        to="/employee/$employeeId/edit"
                                        params={{ employeeId: employee.id }}
                                        className="text-primary underline-offset-2 hover:underline"
                                      >
                                        {name}
                                      </Link>
                                      {allocation.isLeadCarer ? <ScheduleLeadCarerBadge /> : null}
                                    </li>
                                  )
                                })}
                              </ul>
                            )}
                            {attention ? (
                              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-200">
                                {attention}
                              </p>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 align-top tabular-nums">
                            {allocated}/{job.requiredCarers}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <ScheduleJobStatusBadge status={job.status} />
                          </td>
                          <td className="px-3 py-2 align-top text-muted-foreground">
                            {job.scheduleRun?.name ?? '—'}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex flex-col items-start gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant={jobNeedsCarerAssignment(job) ? 'default' : 'outline'}
                                onClick={() => openAllocate(job)}
                              >
                                {jobNeedsCarerAssignment(job) ? 'Assign' : 'Carers'}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" asChild>
                                <Link
                                  to="/scheduling/visits/$jobId"
                                  params={{ jobId: job.id }}
                                >
                                  Visit
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ScheduleJobAllocateDialog
        open={allocateOpen}
        onOpenChange={(open) => {
          setAllocateOpen(open)
          if (!open) setAllocateJobId(null)
        }}
        job={allocateJob}
        onAllocated={() => void refetch()}
      />
    </div>
  )
}
