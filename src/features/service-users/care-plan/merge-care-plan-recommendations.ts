import type { CarePlanRecommendation } from '@/features/service-users/initial-assessment/types'

function recommendationFormKey(rec: CarePlanRecommendation): string | null {
  if (rec.carePathwayFormId?.trim()) return `id:${rec.carePathwayFormId.trim()}`
  if (rec.carePathwayFormName?.trim()) {
    return `name:${rec.carePathwayFormName.trim().toLowerCase()}`
  }
  return null
}

/**
 * Merge IA/rule recommendations with medical-condition recommendations.
 * Same care plan form → keep primary (IA), append condition triggers.
 */
export function mergeCarePlanRecommendations(
  primary: CarePlanRecommendation[],
  fromConditions: CarePlanRecommendation[],
): CarePlanRecommendation[] {
  if (fromConditions.length === 0) return primary

  const byKey = new Map<string, CarePlanRecommendation>()
  const withoutForm: CarePlanRecommendation[] = []

  for (const rec of primary) {
    const key = recommendationFormKey(rec)
    if (!key) {
      withoutForm.push(rec)
      continue
    }
    byKey.set(key, { ...rec, triggers: [...rec.triggers] })
  }

  for (const rec of fromConditions) {
    const key = recommendationFormKey(rec)
    if (!key) continue
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { ...rec, triggers: [...rec.triggers] })
      continue
    }
    const seen = new Set(existing.triggers.map((t) => t.questionId))
    for (const trigger of rec.triggers) {
      if (seen.has(trigger.questionId)) continue
      existing.triggers.push(trigger)
      seen.add(trigger.questionId)
    }
    existing.triggerCount = existing.triggers.length
  }

  return [...byKey.values(), ...withoutForm].sort(
    (a, b) => a.sectionNumber - b.sectionNumber || a.title.localeCompare(b.title),
  )
}
