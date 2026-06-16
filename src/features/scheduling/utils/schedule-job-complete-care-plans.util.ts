import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { timelineJobLinkedCarePlanIds } from '@/features/scheduling/utils/scheduling-visit-plan.util'

export function carePlanOptionsForScheduleJob(
  accepted: AcceptedCarePlanItem[],
  linkedFormIds: string[],
): AcceptedCarePlanItem[] {
  const byId = new Map(accepted.map((item) => [item.formId, item]))
  for (const formId of linkedFormIds) {
    if (byId.has(formId)) continue
    byId.set(formId, {
      formId,
      formName: 'Care plan',
      pictureUrl: null,
      acceptedAt: '',
      carePlanArea: 'Visit plan slot',
    })
  }
  return [...byId.values()].sort((a, b) => a.formName.localeCompare(b.formName, 'en'))
}

export function defaultDeliveredCarePlanIds(
  job: TimelineJob,
  options: AcceptedCarePlanItem[],
): string[] {
  const linked = new Set(timelineJobLinkedCarePlanIds(job))
  const optionIds = new Set(options.map((o) => o.formId))
  return [...linked].filter((id) => optionIds.has(id))
}
