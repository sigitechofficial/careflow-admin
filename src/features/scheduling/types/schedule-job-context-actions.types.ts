import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'

export type ScheduleJobContextAction =
  | 'open-visit-workspace'
  | 'open-run'
  | 'unallocate-job'
  | 'complete-job'
  | 'cancel-job'
  | 'add-notes'
  | 'allocate-employees'
  | 'unallocate-employees'
  | 'change-time'

export type ScheduleJobAllocateDialogPanel = 'allocate' | 'time' | 'unallocate'

const TERMINAL_JOB_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'CALLED_OFF'])

export function isScheduleJobTerminal(job: TimelineJob): boolean {
  return TERMINAL_JOB_STATUSES.has(job.status)
}

export function isScheduleJobCompleted(job: Pick<TimelineJob, 'status'>): boolean {
  return job.status === 'COMPLETED'
}

/** Completed, cancelled, and called-off jobs cannot be edited on the rota board. */
export function isScheduleJobReadOnly(job: TimelineJob): boolean {
  return isScheduleJobTerminal(job)
}

export function scheduleJobHasAllocations(job: TimelineJob): boolean {
  return (job.allocations?.length ?? 0) > 0
}
