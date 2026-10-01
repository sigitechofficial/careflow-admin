import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

const LEGACY_SECTIONS = new Set(['sec_appetite', 'sec_hydration', 'sec_nutrition'])

/** Enterprise §6 fields — must match SECTION_6_QUESTIONS in backend seed. */
export const SECTION_6_CANONICAL_QUESTION_TEXT = [
  'No concerns identified in this section',
  'Requires aids for eating or drinking?',
  'Enterally fed?',
  'Eating / drinking equipment details',
  'Assistance level for eating and drinking',
  'Eating / drinking routine or state',
  'Appetite status',
  'Appetite concern (poor appetite)?',
  'Adequately hydrated?',
  'Hydration comment',
  'Daily fluid target (ml)',
  'Nutrition status',
  'Malnourished or at nutrition risk?',
  'BMI completed?',
  'BMI value',
  'MUST assessment completed?',
  'MUST score',
  'Dietitian referral date',
  'Nutrition / hydration comments',
] as const

/** Synced from appetite multi-select — hidden from UI but kept for triggers. */
const APPETITE_DERIVED_HIDDEN = new Set([
  'Nutritional supplements prescribed?',
  'Dietitian referral made or required?',
  'GP review requested for appetite or nutrition?',
])

const CANONICAL = new Set<string>(SECTION_6_CANONICAL_QUESTION_TEXT)

export function isSection6NutritionQuestion(q: InitialAssessmentQuestion): boolean {
  const meta = q.metadata
  if (!meta || typeof meta !== 'object') return false
  const legacy = meta.legacyCatalogSection
  if (typeof legacy === 'string' && LEGACY_SECTIONS.has(legacy)) return true
  const ref = meta.specRef
  return typeof ref === 'string' && ref.startsWith('6.')
}

export function isHiddenAppetiteDerivedQuestion(q: InitialAssessmentQuestion): boolean {
  return APPETITE_DERIVED_HIDDEN.has(q.questionText.trim())
}

export function filterSection6Questions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return questions.filter((q) => {
    if (!isSection6NutritionQuestion(q)) return true
    const text = q.questionText.trim()
    if (APPETITE_DERIVED_HIDDEN.has(text)) return false
    return CANONICAL.has(text)
  })
}
