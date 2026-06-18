import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { timelineJobLinkedCarePlanIds } from '@/features/scheduling/utils/scheduling-visit-plan.util'

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

function formatHm(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

export function buildScheduleJobSuggestCarersRequest(job: TimelineJob): ScheduleJobSuggestCarersRequest {
  const start = new Date(job.scheduledStartDateTime)
  const end = job.scheduledEndDateTime
    ? new Date(job.scheduledEndDateTime)
    : new Date(start.getTime() + (job.durationMinutes ?? 60) * 60_000)

  return {
    slotCode: job.visitPlan?.slotCode ?? 'SCHEDULED',
    daysOfWeek: [start.getUTCDay()],
    plannedStartTime: formatHm(start),
    plannedEndTime: formatHm(end),
    requiredCarers: job.requiredCarers,
    linkedCarePlanFormIds: timelineJobLinkedCarePlanIds(job),
    scheduledDate: job.scheduledStartDateTime.slice(0, 10),
    excludeScheduledJobId: job.id,
  }
}
