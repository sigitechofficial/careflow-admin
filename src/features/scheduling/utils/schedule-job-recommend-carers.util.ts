import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { timelineJobLinkedCarePlanIds } from '@/features/scheduling/utils/scheduling-visit-plan.util'
import { dayKeyFromInstant, formatOpsHm } from '@/shared/lib/operational-day.util'

export type ScheduleJobSuggestCarersRequest = {
  slotCode: string
  daysOfWeek: number[]
  plannedStartTime: string
  plannedEndTime: string
  requiredCarers: number
  linkedCarePlanFormIds: string[]
  scheduledDate?: string
  excludeScheduledJobId?: string
}

export function buildScheduleJobSuggestCarersRequest(job: TimelineJob): ScheduleJobSuggestCarersRequest {
  const start = new Date(job.scheduledStartDateTime)
  const end = job.scheduledEndDateTime
    ? new Date(job.scheduledEndDateTime)
    : new Date(start.getTime() + (job.durationMinutes ?? 60) * 60_000)
  const scheduledDate = dayKeyFromInstant(job.scheduledStartDateTime)
  const [y, m, d] = scheduledDate.split('-').map(Number)
  const weekday = Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)
    ? new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay()
    : start.getUTCDay()

  return {
    slotCode: job.visitPlan?.slotCode ?? 'SCHEDULED',
    daysOfWeek: [weekday],
    plannedStartTime: formatOpsHm(job.scheduledStartDateTime) || '00:00',
    plannedEndTime: formatOpsHm(end.toISOString()) || '00:00',
    requiredCarers: job.requiredCarers,
    linkedCarePlanFormIds: timelineJobLinkedCarePlanIds(job),
    scheduledDate: scheduledDate || undefined,
    excludeScheduledJobId: job.id,
  }
}
