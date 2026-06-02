import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

/** §3.11 — only the two highest-value trip/fall flooring checks. */
export const SECTION_311_CANONICAL_QUESTION_TEXT = [
  'Rugs or worn carpet (flooring risk)?',
  'Worn carpet on stairs?',
] as const

const CANONICAL = new Set<string>(SECTION_311_CANONICAL_QUESTION_TEXT)

export function isSection311FlooringQuestion(q: InitialAssessmentQuestion): boolean {
  const meta = q.metadata
  if (!meta || typeof meta !== 'object') return false
  return meta.legacyCatalogSection === 'sec_flooring' || meta.specRef === '3.11'
}

export function isCanonicalSection311Question(q: InitialAssessmentQuestion): boolean {
  return CANONICAL.has(q.questionText.trim())
}

/** Hide legacy duplicates and non-canonical §3.11 rows still active in the template. */
export function filterSection311Questions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return questions.filter((q) => {
    if (!isSection311FlooringQuestion(q)) return true
    return isCanonicalSection311Question(q)
  })
}
