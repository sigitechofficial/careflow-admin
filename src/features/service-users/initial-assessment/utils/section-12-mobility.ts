import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

/** Enterprise §12 fields — must match SECTION_12_QUESTIONS in backend seed. */
export const SECTION_12_CANONICAL_QUESTION_TEXT = [
  'Uses hoist or sling?',
  'Restricted to bed?',
  'Any amputation?',
  'Uses prosthesis?',
  'Prosthesis care notes',
  'Transfer support required?',
  'Independent with all transfers?',
  'Transfer comments',
  'Personal care completed in — locations',
  'Other personal care location details',
  'Falls in last 12 months?',
  'Number of falls (last 12 months)',
  'Most recent fall date',
  'Injury caused by fall?',
  'Any unsteadiness, gait or balance concern?',
  'Fear of falling?',
  'Any other clinical concern about falls (e.g. dizziness, blackouts, recent change in mobility)?',
  'Falls concern details',
  'Hoist / profiling bed / air mattress in use?',
  'All mobilising aids in good working order?',
  'Further equipment required to be ordered?',
  'Further equipment details',
  'Daily living equipment ordered?',
  'Date daily living equipment ordered',
  'Finance support required?',
  'Finance support consent in place?',
] as const

const CANONICAL = new Set<string>(SECTION_12_CANONICAL_QUESTION_TEXT)

export function isSection12Question(q: InitialAssessmentQuestion): boolean {
  const ref = q.metadata?.specRef
  return typeof ref === 'string' && ref.startsWith('12.')
}

export function filterSection12Questions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return questions.filter((q) => {
    if (!isSection12Question(q)) return true
    return CANONICAL.has(q.questionText.trim())
  })
}

export function section12FallsHistoryQuestions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return questions
    .filter((q) => q.metadata?.specRef === '12.7' && CANONICAL.has(q.questionText.trim()))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

/** §12.8 template yes/no fields (rendered in the equipment panel, not a separate 12.8a group). */
export function section12EquipmentTemplateQuestions(
  questions: InitialAssessmentQuestion[],
): InitialAssessmentQuestion[] {
  return questions
    .filter((q) => {
      const ref = q.metadata?.specRef
      if (ref !== '12.8' && ref !== '12.8a') return false
      return CANONICAL.has(q.questionText.trim())
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
}
