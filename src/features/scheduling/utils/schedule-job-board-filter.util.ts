import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { ScheduleJobsBoard } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { isScheduleJobCompleted } from '@/features/scheduling/types/schedule-job-context-actions.types'
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
  const allJobs = board.allJobs.filter(visible)
  const carers = employeeRows.filter((row) => row.allocations.length > 0)

  return { employeeRows, carers, unassignedJobs, allJobs }
}

export function jobHasOperationalIssue(job: TimelineJob): boolean {
  return Boolean(
    job.serviceUserAbsent || job.needsCover || (job.carersOnLeave?.length ?? 0) > 0,
  )
}

export function countScheduleJobsWithOperationalIssues(jobs: TimelineJob[]): number {
  return jobs.filter(jobHasOperationalIssue).length
}

export function applyScheduleJobOperationalIssuesFilter(
  board: ScheduleJobsBoard,
  issuesOnly: boolean,
): ScheduleJobsBoard {
  if (!issuesOnly) return board
  const visible = (job: TimelineJob) => jobHasOperationalIssue(job)
  const employeeRows = board.employeeRows.map((row) => ({
    ...row,
    allocations: row.allocations.filter((allocation) => visible(allocation.job)),
  }))
  const unassignedJobs = board.unassignedJobs.filter(visible)
  const allJobs = board.allJobs.filter(visible)
  const carers = employeeRows.filter((row) => row.allocations.length > 0)
  return { employeeRows, carers, unassignedJobs, allJobs }
}
