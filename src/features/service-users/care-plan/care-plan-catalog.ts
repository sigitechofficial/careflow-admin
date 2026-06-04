/** Display order for inactive care plan cards (matches legacy CareFlow list). */
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

/** Care plans treated as active for this service user (shown in Active section, excluded from Inactive). */
export const ACTIVE_CARE_PLAN_NAMES = new Set(
  ['Medication care plan', 'Medication', 'Risk Assessment and Care Plan V2', 'Risk Assessment and Care Plan'].map(
    n => n.toLowerCase(),
  ),
)

export function isActiveCarePlanName(name: string): boolean {
  return ACTIVE_CARE_PLAN_NAMES.has(name.trim().toLowerCase())
}

/** Active when accepted in initial assessment; falls back to legacy name list when none accepted yet. */
export function isServiceUserActiveCarePlan(
  form: { id: string; name: string },
  acceptedFormIds: ReadonlySet<string>,
): boolean {
  if (acceptedFormIds.size > 0) return acceptedFormIds.has(form.id)
  return isActiveCarePlanName(form.name)
}

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
