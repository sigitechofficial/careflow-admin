/** Display order for catalogue / Available care plan cards (matches legacy CareFlow list). */
export const INACTIVE_CARE_PLAN_ORDER = [
  'Advance',
  'Care Plan review form',
  'Cognition and Behaviour',
  'Communication',
  'Continence',
  'Culture/Religion/Spirituality',
  'Dementia Care plan',
  'Eating and Drinking',
  'Falls',
  'Final Days',
  'Home Care Plan',
  'Home Care Plan - needs/goals/support',
  'Home Support Plan',
  'Infection',
  'Medication',
  'Mobility',
  'Pain Management',
  'Person Centred care plan',
  'Personal Safety',
  'Physical Health',
  'Pressure Ulcer',
  'Psychological',
  'Risk Assessment',
  'Risk Assessment and Care Plan',
  'Skin Integrity',
  'Sleeping and Night',
  'Social Activities',
  'Test',
  'Washing and dressing',
] as const

/**
 * Care Plan page grouping no longer uses a hard-coded Active name list
 * (Medication / Risk Assessment). Lifecycle comes from instance displayStatus
 * and IA recommendation status — see care-plan-display-state.ts.
 */

/**
 * Restrict care plan cards to Form Selection choices.
 * When nothing is saved yet (empty selection), all published forms are shown.
 */
export function filterCarePlansByFormSelection<T extends { id: string }>(
  forms: T[],
  selectedFormIds: string[],
): T[] {
  if (!selectedFormIds.length) return forms
  const ids = new Set(selectedFormIds)
  return forms.filter(f => ids.has(f.id))
}

export function sortCarePlansByCatalogOrder<T extends { name: string }>(items: T[]): T[] {
  const orderIndex = new Map(INACTIVE_CARE_PLAN_ORDER.map((n, i) => [n.toLowerCase(), i]))
  return [...items].sort((a, b) => {
    const ai = orderIndex.get(a.name.toLowerCase()) ?? 999
    const bi = orderIndex.get(b.name.toLowerCase()) ?? 999
    if (ai !== bi) return ai - bi
    return a.name.localeCompare(b.name)
  })
}
