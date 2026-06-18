import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { ScheduleJobsBoard } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

/** URL / filter value for required carers on the rota board. */
export type ScheduleJobsRequiredCarersFilter = 'all' | '1' | '2' | '3plus'

export function parseScheduleJobsRequiredCarersFilter(
  value: string | undefined,
): ScheduleJobsRequiredCarersFilter {
  if (value === '1' || value === '2' || value === '3plus') return value
  return 'all'
}

export function scheduleJobsRequiredCarersFilterLabel(
  filter: ScheduleJobsRequiredCarersFilter,
): string {
  switch (filter) {
    case '1':
      return 'Single carer'
    case '2':
      return 'Double up (2 carers)'
    case '3plus':
      return '3+ carers'
    default:
      return 'All visits'
  }
}

export function timelineJobMatchesRequiredCarersFilter(
  job: TimelineJob,
  filter: ScheduleJobsRequiredCarersFilter,
): boolean {
  if (filter === 'all') return true
  if (filter === '1') return job.requiredCarers === 1
  if (filter === '2') return job.requiredCarers === 2
  return job.requiredCarers >= 3
}

export function countScheduleJobsByRequiredCarers(jobs: TimelineJob[]) {
  let single = 0
  let doubleUp = 0
  let triplePlus = 0
  for (const job of jobs) {
    if (job.requiredCarers <= 1) single += 1
    else if (job.requiredCarers === 2) doubleUp += 1
    else triplePlus += 1
  }
  return {
    all: jobs.length,
    '1': single,
    '2': doubleUp,
    '3plus': triplePlus,
  } as const
}

export function buildScheduleJobsRequiredCarersOptions(
  counts: ReturnType<typeof countScheduleJobsByRequiredCarers>,
) {
  return [
    { value: '', label: 'All visits', description: `${counts.all} on board` },
    { value: '1', label: 'Single carer', description: `${counts['1']} visit${counts['1'] === 1 ? '' : 's'}` },
    {
      value: '2',
      label: 'Double up (2 carers)',
      description: `${counts['2']} visit${counts['2'] === 1 ? '' : 's'}`,
    },
    {
      value: '3plus',
      label: '3+ carers',
      description: `${counts['3plus']} visit${counts['3plus'] === 1 ? '' : 's'}`,
    },
  ]
}

export function applyScheduleJobsRequiredCarersFilter(
  board: ScheduleJobsBoard,
  filter: ScheduleJobsRequiredCarersFilter,
): ScheduleJobsBoard {
  if (filter === 'all') return board

  const visible = (job: TimelineJob) => timelineJobMatchesRequiredCarersFilter(job, filter)

  const employeeRows = board.employeeRows.map((row) => ({
    ...row,
    allocations: row.allocations.filter((allocation) => visible(allocation.job)),
  }))

  const unassignedJobs = board.unassignedJobs.filter(visible)
  const allJobs = board.allJobs.filter(visible)
  const carers = employeeRows.filter((row) => row.allocations.length > 0)

  return { employeeRows, carers, unassignedJobs, allJobs }
}
