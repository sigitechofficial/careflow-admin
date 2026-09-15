import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { resolveVisitPlanSlotForJob } from '@/features/scheduling/utils/schedule-job-hover-details.util'

export type JobTimeCriticalInfo = {
  timeToleranceMinutes: number
}

export function resolveJobTimeCritical(
  job: TimelineJob,
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>,
): JobTimeCriticalInfo | null {
  if (job.timeSensitive?.hasAny) {
    const first = job.timeSensitive.items[0]
    return {
      timeToleranceMinutes:
        first?.toleranceMinutes ?? job.visitPlan?.timeToleranceMinutes ?? 30,
    }
  }
  const slot = resolveVisitPlanSlotForJob(job, visitPlanSlotsByServiceUser)
  if (!slot?.timeCritical) return null
  return { timeToleranceMinutes: slot.timeToleranceMinutes }
}

export function jobIsTimeCritical(
  job: TimelineJob,
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>,
): boolean {
  return resolveJobTimeCritical(job, visitPlanSlotsByServiceUser) != null
}
