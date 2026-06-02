import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

/** §3.10 — minimum property environment checklist (enterprise YES/NO + notes). */
export const SECTION_310_CANONICAL_QUESTION_TEXT = [
  'Smoke alarm fitted and working?',
  'Referral required for smoke, CO or fire alarm?',
  'Steps or uneven access at entrance?',
  'Level access throughout the property?',
  'Hoarding or clutter risk?',
  'Environment / access hazard notes',
] as const

const CANONICAL = new Set<string>(SECTION_310_CANONICAL_QUESTION_TEXT)

export function isSection310EnvironmentQuestion(q: InitialAssessmentQuestion): boolean {
  const meta = q.metadata
  if (!meta || typeof meta !== 'object') return false
  return meta.legacyCatalogSection === 'sec_environment' || meta.specRef === '3.10'
}

export function isCanonicalSection310Question(q: InitialAssessmentQuestion): boolean {
  return CANONICAL.has(q.questionText.trim())
}

/** Hide legacy duplicates and non-canonical §3.10 rows still active in the template. */
export function filterSection310Questions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return questions.filter((q) => {
    if (!isSection310EnvironmentQuestion(q)) return true
    return isCanonicalSection310Question(q)
  })
}
