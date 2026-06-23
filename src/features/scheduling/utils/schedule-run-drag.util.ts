import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { ScheduleJobsRowRef } from '@/features/scheduling/utils/schedule-jobs-drag.util'

export function scheduleRunDragConflictMessage(
  job: TimelineJob,
  payload: {
    targetRow: ScheduleJobsRowRef
    scheduledStartDateTime: string
  },
): string | null {
  if (!job.scheduleRunId || !job.scheduleRun) return null

  const runDate = job.scheduleRun.runDate
  const movedDate = payload.scheduledStartDateTime.slice(0, 10)
  if (runDate !== movedDate) {
    return 'This visit belongs to a run. Moving it may conflict with the run schedule (date).'
  }

  const runCarerId = job.scheduleRun.employeeId
  if (
    runCarerId &&
    payload.targetRow.kind === 'carer' &&
    payload.targetRow.employeeId !== runCarerId
  ) {
    return 'This visit belongs to a run. Moving it may conflict with the run schedule (carer).'
  }

  return null
}
