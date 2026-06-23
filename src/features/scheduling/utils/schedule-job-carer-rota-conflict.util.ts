import { isScheduleJobCancelled } from '@/features/scheduling/types/schedule-job-context-actions.types'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { jobsTimeOverlap } from '@/features/scheduling/utils/schedule-jobs-overlap-lanes.util'

export const CARER_ROTA_CONFLICT_MESSAGE =
  'Carer has already a visit, please use another slot'

type JobScheduleWindow = Pick<
  TimelineJob,
  'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'
>

function jobHasCarerAllocation(job: TimelineJob, employeeId: string): boolean {
  return (job.allocations ?? []).some((allocation) => allocation.employeeId === employeeId)
}

function withScheduleWindow(
  job: TimelineJob,
  window?: JobScheduleWindow,
): Pick<TimelineJob, 'id' | 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'> {
  return {
    id: job.id,
    scheduledStartDateTime: window?.scheduledStartDateTime ?? job.scheduledStartDateTime,
    scheduledEndDateTime: window?.scheduledEndDateTime ?? job.scheduledEndDateTime,
    durationMinutes: window?.durationMinutes ?? job.durationMinutes,
  }
}

/** Returns the rota conflict message when a carer already has another visit in the same time slot. */
export function scheduleJobCarerRotaConflictMessage(
  job: TimelineJob,
  employeeId: string,
  allJobs: TimelineJob[],
  nextSchedule?: JobScheduleWindow,
): string | null {
  if (!employeeId.trim()) return null

  const candidate = withScheduleWindow(job, nextSchedule)
  const conflicting = allJobs.filter(
    (other) =>
      other.id !== job.id &&
      !isScheduleJobCancelled(other) &&
      jobHasCarerAllocation(other, employeeId) &&
      jobsTimeOverlap(candidate, other),
  )

  return conflicting.length > 0 ? CARER_ROTA_CONFLICT_MESSAGE : null
}
