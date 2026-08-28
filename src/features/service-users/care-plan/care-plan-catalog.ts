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
 * Restrict Available / template cards to Form Selection choices.
 * When nothing is saved yet (empty selection), all published forms are shown.
 */
export function filterCarePlansByFormSelection<T extends { id: string }>(
  forms: T[],
  selectedFormIds: string[],
): T[] {
  if (!selectedFormIds.length) return forms
  const ids = new Set(selectedFormIds)
  return forms.filter((f) => ids.has(f.id))
}

export type CarePlanInstanceFormRef = {
  carePathwayFormId: string
  formName?: string | null
  pictureUrl?: string | null
}

/**
 * Live / In Progress must include every form that already has an instance for this
 * service user — even when that form is outside company Form Selection.
 *
 * Form Selection still gates Available templates. Recommended cards come from IA
 * independently. Without this merge, a published Skin Integrity plan can leave
 * Recommended (accepted) but never appear under Live if Falls was selected and
 * Skin Integrity was not.
 */
export function mergeFormsWithCarePlanInstances<
  T extends { id: string; name: string; pictureUrl?: string | null },
>(selectionFilteredForms: T[], fullCatalogue: T[], instances: CarePlanInstanceFormRef[]): T[] {
  const byId = new Map(selectionFilteredForms.map((form) => [form.id, form]))
  const catalogueById = new Map(fullCatalogue.map((form) => [form.id, form]))

  for (const instance of instances) {
    const formId = instance.carePathwayFormId
    if (!formId || byId.has(formId)) continue

    const fromCatalogue = catalogueById.get(formId)
    if (fromCatalogue) {
      byId.set(formId, fromCatalogue)
      continue
    }

    const name = instance.formName?.trim()
    if (!name) continue
    byId.set(formId, {
      id: formId,
      name,
      pictureUrl: instance.pictureUrl ?? null,
    } as T)
  }

  return [...byId.values()]
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
