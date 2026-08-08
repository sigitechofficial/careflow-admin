import type { EmployeeDayRow, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { ScheduleJobsBoard } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import {
  isScheduleJobCancelled,
  isScheduleJobCompleted,
} from '@/features/scheduling/types/schedule-job-context-actions.types'
import { activeJobAllocationCount } from '@/features/scheduling/utils/scheduling-format'
import { jobBlockTone } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

export type ScheduleJobOutcomeFilter = 'booked' | 'not-available' | 'completed'

export const SCHEDULE_JOB_OUTCOME_FILTERS: ScheduleJobOutcomeFilter[] = [
  'booked',
  'not-available',
  'completed',
]

export const DEFAULT_SCHEDULE_JOB_OUTCOME_FILTERS: ReadonlySet<ScheduleJobOutcomeFilter> = new Set(
  SCHEDULE_JOB_OUTCOME_FILTERS,
)

/** Aligns with rota job card / availability hover labels. */
export function scheduleJobOutcomeCategory(job: TimelineJob): ScheduleJobOutcomeFilter {
  if (isScheduleJobCompleted(job)) return 'completed'
  if (jobBlockTone(job) === 'green') return 'booked'
  return 'not-available'
}

export function countScheduleJobsByOutcome(jobs: TimelineJob[]): Record<ScheduleJobOutcomeFilter, number> {
  const counts: Record<ScheduleJobOutcomeFilter, number> = {
    booked: 0,
    'not-available': 0,
    completed: 0,
  }
  for (const job of jobs) {
    counts[scheduleJobOutcomeCategory(job)] += 1
  }
  return counts
}

export function isScheduleJobOutcomeVisible(
  job: TimelineJob,
  enabled: ReadonlySet<ScheduleJobOutcomeFilter>,
): boolean {
  if (enabled.size === 0) return false
  if (enabled.size === SCHEDULE_JOB_OUTCOME_FILTERS.length) return true
  return enabled.has(scheduleJobOutcomeCategory(job))
}

export function applyScheduleJobOutcomeFilters(
  board: ScheduleJobsBoard,
  enabled: ReadonlySet<ScheduleJobOutcomeFilter>,
): ScheduleJobsBoard {
  if (enabled.size === SCHEDULE_JOB_OUTCOME_FILTERS.length) return board

  const visible = (job: TimelineJob) => isScheduleJobOutcomeVisible(job, enabled)

  const employeeRows = board.employeeRows.map((row) => ({
    ...row,
    allocations: row.allocations.filter((allocation) => visible(allocation.job)),
  }))

  const unassignedJobs = board.unassignedJobs.filter(visible)
  const cancelledJobs = board.cancelledJobs.filter(visible)
  const allJobs = board.allJobs.filter(visible)
  const carers = employeeRows.filter((row) => row.allocations.length > 0)

  return { employeeRows, carers, unassignedJobs, cancelledJobs, allJobs }
}

export function jobHasOperationalIssue(job: TimelineJob): boolean {
  return Boolean(
    job.serviceUserAbsent || job.needsCover || (job.carersOnLeave?.length ?? 0) > 0,
  )
}

export function countScheduleJobsWithOperationalIssues(jobs: TimelineJob[]): number {
  return jobs.filter(jobHasOperationalIssue).length
}

/** Visit-level operational filters (leave, cover, absence, unassigned). */
export type ScheduleJobOperationalFilter =
  | 'carer-on-leave'
  | 'needs-cover'
  | 'client-absent'
  | 'unassigned'
  | 'outside-pattern'

/** Carer-row filters (e.g. approved leave on the viewed day). */
export type ScheduleCarerOperationalFilter = 'carer-on-leave-today'

export const SCHEDULE_JOB_OPERATIONAL_FILTERS: ScheduleJobOperationalFilter[] = [
  'carer-on-leave',
  'needs-cover',
  'client-absent',
  'unassigned',
  'outside-pattern',
]

export const SCHEDULE_CARER_OPERATIONAL_FILTERS: ScheduleCarerOperationalFilter[] = [
  'carer-on-leave-today',
]

export function parseScheduleJobOperationalFilters(
  value?: string | null,
): ScheduleJobOperationalFilter[] {
  if (!value?.trim()) return []
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is ScheduleJobOperationalFilter =>
      SCHEDULE_JOB_OPERATIONAL_FILTERS.includes(part as ScheduleJobOperationalFilter),
    )
}

export function parseScheduleCarerOperationalFilters(
  value?: string | null,
): ScheduleCarerOperationalFilter[] {
  if (!value?.trim()) return []
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is ScheduleCarerOperationalFilter =>
      SCHEDULE_CARER_OPERATIONAL_FILTERS.includes(part as ScheduleCarerOperationalFilter),
    )
}

export function scheduleJobOperationalFilterLabel(filter: ScheduleJobOperationalFilter): string {
  switch (filter) {
    case 'carer-on-leave':
      return 'Carer on leave'
    case 'needs-cover':
      return 'Needs cover'
    case 'client-absent':
      return 'Client absent'
    case 'unassigned':
      return 'Unassigned'
    case 'outside-pattern':
      return 'Outside pattern'
  }
}

export function scheduleCarerOperationalFilterLabel(filter: ScheduleCarerOperationalFilter): string {
  switch (filter) {
    case 'carer-on-leave-today':
      return 'Carer on leave today'
  }
}

export function jobMatchesOperationalFilter(
  job: TimelineJob,
  filter: ScheduleJobOperationalFilter,
  outsidePatternJobIds?: Set<string>,
): boolean {
  switch (filter) {
    case 'carer-on-leave':
      return (job.carersOnLeave?.length ?? 0) > 0
    case 'needs-cover':
      return Boolean(job.needsCover)
    case 'client-absent':
      return Boolean(job.serviceUserAbsent)
    case 'unassigned':
      return (
        !isScheduleJobCancelled(job) &&
        !isScheduleJobCompleted(job) &&
        activeJobAllocationCount(job) < job.requiredCarers
      )
    case 'outside-pattern':
      return outsidePatternJobIds?.has(job.id) ?? false
  }
}

export function countScheduleJobsByOperationalFilter(
  jobs: TimelineJob[],
  outsidePatternJobIds?: Set<string>,
): Record<ScheduleJobOperationalFilter, number> {
  const counts: Record<ScheduleJobOperationalFilter, number> = {
    'carer-on-leave': 0,
    'needs-cover': 0,
    'client-absent': 0,
    unassigned: 0,
    'outside-pattern': 0,
  }
  for (const job of jobs) {
    for (const filter of SCHEDULE_JOB_OPERATIONAL_FILTERS) {
      if (jobMatchesOperationalFilter(job, filter, outsidePatternJobIds)) counts[filter] += 1
    }
  }
  return counts
}

export function countScheduleCarersOnLeaveToday(rows: EmployeeDayRow[]): number {
  return rows.filter((row) => row.onHoliday).length
}

export function isScheduleJobOperationalVisible(
  job: TimelineJob,
  enabled: ReadonlySet<ScheduleJobOperationalFilter>,
  outsidePatternJobIds?: Set<string>,
): boolean {
  if (!enabled.size) return true
  return SCHEDULE_JOB_OPERATIONAL_FILTERS.some(
    (filter) => enabled.has(filter) && jobMatchesOperationalFilter(job, filter, outsidePatternJobIds),
  )
}

export function filterTimelineJobsByOutcome(
  jobs: TimelineJob[],
  enabled: ReadonlySet<ScheduleJobOutcomeFilter>,
): TimelineJob[] {
  if (enabled.size === SCHEDULE_JOB_OUTCOME_FILTERS.length) return jobs
  return jobs.filter((job) => isScheduleJobOutcomeVisible(job, enabled))
}

export function filterTimelineJobsByOperational(
  jobs: TimelineJob[],
  enabled: ReadonlySet<ScheduleJobOperationalFilter>,
  outsidePatternJobIds?: Set<string>,
): TimelineJob[] {
  if (!enabled.size) return jobs
  return jobs.filter((job) => isScheduleJobOperationalVisible(job, enabled, outsidePatternJobIds))
}

export function applyScheduleOperationalFilters(
  board: ScheduleJobsBoard,
  jobFilters: ReadonlySet<ScheduleJobOperationalFilter>,
  carerFilters: ReadonlySet<ScheduleCarerOperationalFilter>,
  outsidePatternJobIds?: Set<string>,
): ScheduleJobsBoard {
  if (!jobFilters.size && !carerFilters.size) return board

  const jobVisible = (job: TimelineJob) =>
    isScheduleJobOperationalVisible(job, jobFilters, outsidePatternJobIds)

  const employeeRows = board.employeeRows
    .map((row) => ({
      ...row,
      allocations: row.allocations.filter((allocation) => jobVisible(allocation.job)),
    }))
    .filter((row) => {
      if (row.allocations.length > 0) return true
      return carerFilters.has('carer-on-leave-today') && row.onHoliday
    })

  const unassignedJobs = board.unassignedJobs.filter(jobVisible)
  const cancelledJobs = board.cancelledJobs.filter(jobVisible)
  const allJobs = board.allJobs.filter(jobVisible)
  const carers = employeeRows.filter((row) => row.allocations.length > 0)

  return { employeeRows, carers, unassignedJobs, cancelledJobs, allJobs }
}

/** @deprecated Use `applyScheduleOperationalFilters` with job filters set. */
export function applyScheduleJobOperationalIssuesFilter(
  board: ScheduleJobsBoard,
  issuesOnly: boolean,
): ScheduleJobsBoard {
  if (!issuesOnly) return board
  return applyScheduleOperationalFilters(
    board,
    new Set(['carer-on-leave', 'needs-cover', 'client-absent']),
    new Set(),
  )
}
