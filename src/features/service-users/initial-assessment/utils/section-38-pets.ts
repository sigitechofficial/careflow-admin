import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

/** §3.8 — pets (enterprise YES/NO; smoking lives on Fire Safety §18). */
export const SECTION_38_CANONICAL_QUESTION_TEXT = [
  'Pets present?',
  'Pets secured during visits?',
  'Pet infestation or hygiene risk?',
] as const

const CANONICAL = new Set<string>(SECTION_38_CANONICAL_QUESTION_TEXT)

export function isSection38PetsQuestion(q: InitialAssessmentQuestion): boolean {
  const meta = q.metadata
  if (!meta || typeof meta !== 'object') return false
  return meta.legacyCatalogSection === 'sec_pets' || meta.specRef === '3.8'
}

export function isCanonicalSection38Question(q: InitialAssessmentQuestion): boolean {
  return CANONICAL.has(q.questionText.trim())
}

/** Hide legacy duplicates and non-canonical §3.8 rows still active in the template. */
export function filterSection38Questions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return questions.filter((q) => {
    if (!isSection38PetsQuestion(q)) return true
    return isCanonicalSection38Question(q)
  })
}
