import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  findQuestionByFieldKey,
  isExplicitNo,
  isYesAnswer,
} from '@/features/service-users/initial-assessment/utils/question-lookup'

/**
 * Falls case-finding (NICE NG249): §12.7 records falls history and concerns (always asked, no consent
 * gate) and indicates whether the multifactorial Falls assessment is needed. No score predicts falls.
 * Mirrors careflow-api `initial-assessment-falls.util.ts` — change both together.
 */
export type FallsCaseFindingStatus = 'required' | 'suggested' | 'not_needed' | 'pending'

export type FallsCaseFindingInput = {
  fallsLast12Months: boolean | null
  unsteadiness: boolean | null
  fearOfFalling: boolean | null
  clinicalConcern: boolean | null
}

export type FallsCaseFinding = { status: FallsCaseFindingStatus; reasons: string[] }

export const FALLS_CASE_FINDING_FIELD_KEYS = {
  fallsLast12Months: 'fallsLast12Months',
  unsteadiness: 'fallsUnsteadiness',
  fearOfFalling: 'fallsFearOfFalling',
  clinicalConcern: 'fallsClinicalConcern',
} as const

export const FALLS_ASSESSMENT_REQUIRED_MESSAGE =
  'Falls assessment required — falls case-finding is positive; complete the Falls tab (section 12.7)'

export function fallsCaseFinding(input: FallsCaseFindingInput): FallsCaseFinding {
  const reasons: string[] = []
  if (input.fallsLast12Months === true) reasons.push('Fall in the last 12 months')
  if (input.unsteadiness === true) reasons.push('Unsteadiness, gait or balance concern')
  if (input.fearOfFalling === true) reasons.push('Fear of falling')
  if (input.clinicalConcern === true) reasons.push('Other clinical concern about falls')

  if (input.fallsLast12Months === true || input.unsteadiness === true) {
    return { status: 'required', reasons }
  }
  if (input.fearOfFalling === true || input.clinicalConcern === true) {
    return { status: 'suggested', reasons }
  }
  const answers = [input.fallsLast12Months, input.unsteadiness, input.fearOfFalling, input.clinicalConcern]
  if (answers.every((a) => a === false)) return { status: 'not_needed', reasons: [] }
  return { status: 'pending', reasons: [] }
}

function yesNo(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
  fieldKey: string,
): boolean | null {
  const q = findQuestionByFieldKey(sections, fieldKey)
  if (!q) return null
  const value = answers[q.id]
  if (isYesAnswer(value)) return true
  if (isExplicitNo(value)) return false
  return null
}

/** Case-finding from the draft answers. */
export function fallsCaseFindingFromAnswers(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
): FallsCaseFinding {
  const k = FALLS_CASE_FINDING_FIELD_KEYS
  return fallsCaseFinding({
    fallsLast12Months: yesNo(sections, answers, k.fallsLast12Months),
    unsteadiness: yesNo(sections, answers, k.unsteadiness),
    fearOfFalling: yesNo(sections, answers, k.fearOfFalling),
    clinicalConcern: yesNo(sections, answers, k.clinicalConcern),
  })
}
