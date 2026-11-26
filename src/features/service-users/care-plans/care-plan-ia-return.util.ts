import type { CarePlanRecommendation } from '@/features/service-users/initial-assessment/types'
import type { CarePlanInstance } from '@/features/service-users/care-plans/types'

/**
 * Recommendations only carry their care plan once accepted. Fill the rest from the service user's
 * care plan for the same form, so a plan made with "Create care plan" shows as made.
 */
export function linkRecommendationsToCarePlans(
  recommendations: CarePlanRecommendation[],
  instances: CarePlanInstance[] | undefined,
): CarePlanRecommendation[] {
  if (!instances?.length) return recommendations
  const byForm = new Map(instances.map((i) => [i.carePathwayFormId, i]))
  return recommendations.map((rec) => {
    if (rec.linkedCarePlan || !rec.carePathwayFormId) return rec
    const instance = byForm.get(rec.carePathwayFormId)
    if (!instance) return rec
    return {
      ...rec,
      linkedCarePlan: {
        instanceId: instance.id,
        carePathwayFormId: instance.carePathwayFormId,
        status: instance.status,
        hasDraft: Boolean(instance.draft),
      },
    }
  })
}

/**
 * Recommended care plans still to do after one is published: one per care plan form, not declined,
 * not published yet, and not the plan just published.
 */
export function remainingRecommendedCarePlans(
  recommendations: CarePlanRecommendation[],
  publishedFormId: string,
): number {
  const remaining = new Set<string>()
  for (const rec of recommendations) {
    const formId = rec.carePathwayFormId
    if (!formId || formId === publishedFormId) continue
    if (rec.status === 'declined') continue
    if (rec.linkedCarePlan?.status === 'PUBLISHED') continue
    remaining.add(formId)
  }
  return remaining.size
}

/** "Advance published. 3 recommended care plans left." */
export function publishedReturnMessage(planName: string, remaining: number | null): string {
  const published = `${planName} published.`
  if (remaining == null) return published
  if (remaining === 0) return `${published} All recommended care plans are done.`
  return `${published} ${remaining} recommended care plan${remaining === 1 ? '' : 's'} left.`
}
