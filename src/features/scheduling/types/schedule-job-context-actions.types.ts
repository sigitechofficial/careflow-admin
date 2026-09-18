import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'

export type ScheduleJobContextAction =
  | 'open-visit-workspace'
  | 'open-run'
  | 'reassign-run'
  | 'unallocate-job'
  | 'complete-job'
  | 'mark-incomplete'
  | 'cancel-job'
  | 'reinstate-job'
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

/** Carer attended (usually COMPLETED) but care did not start — carer-app Unable to start. */
export function isScheduleJobCareNotDelivered(
  job: Pick<TimelineJob, 'careNotDelivered'>,
): boolean {
  const recorded = job.careNotDelivered
  if (!recorded) return false
  return Boolean(recorded.reasonCode?.trim() || recorded.reasonLabel?.trim())
}

export function isScheduleJobReinstatable(job: Pick<TimelineJob, 'status'>): boolean {
  return job.status === 'CANCELLED' || job.status === 'CALLED_OFF'
}

export function isScheduleJobCancelled(job: Pick<TimelineJob, 'status'>): boolean {
  return isScheduleJobReinstatable(job)
}

/**
 * Outcome recording (complete / incomplete / reopen to Planned) is blocked only for
 * cancelled / called-off jobs. COMPLETED jobs may still change outcome.
 */
export function isScheduleJobOutcomeLocked(job: Pick<TimelineJob, 'status'>): boolean {
  return isScheduleJobCancelled(job)
}

/** Completed, cancelled, and called-off jobs cannot be edited on the rota board (until reinstated). */
export function isScheduleJobReadOnly(job: TimelineJob): boolean {
  return isScheduleJobTerminal(job)
}

export function scheduleJobHasAllocations(job: TimelineJob): boolean {
  return (job.allocations?.length ?? 0) > 0
}

const STARTED_JOB_STATUSES = new Set([
  'IN_PROGRESS',
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'MISSED',
])

const STARTED_VISIT_STATUSES = new Set([
  'STARTED',
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'MISSED',
])

function statusKey(value?: string | null): string {
  return String(value ?? '').trim().toUpperCase()
}

function hasStamp(value?: string | null): boolean {
  return Boolean(value?.trim())
}

/** Clock-in or this-visit delivery exists — office can reset to planned. */
export function isScheduleJobDeliveryResettable(job: TimelineJob): boolean {
  const status = statusKey(job.status)
  if (status === 'CANCELLED' || status === 'CALLED_OFF' || status === 'DRAFT') return false
  if (STARTED_JOB_STATUSES.has(status)) return true
  const assessed = statusKey(job.deliveryAssessment?.lifecycleStatus)
  if (STARTED_JOB_STATUSES.has(assessed)) return true
  if (hasStamp(job.actualStartDateTime) || hasStamp(job.actualEndDateTime)) return true
  if (job.checkIn) return true
  if (job.allocations?.some((row) => hasStamp(row.actualStartDateTime))) return true
  return Boolean(
    job.visits?.some(
      (visit) =>
        STARTED_VISIT_STATUSES.has(statusKey(visit.status)) ||
        hasStamp(visit.actualStartDateTime) ||
        hasStamp(visit.actualEndDateTime),
    ),
  )
}
