import { fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type {
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

const KEY_SAFE_PRESENT_TEXT = 'Key safe present?'
const KEY_SAFE_CODE_TEXT = 'Key safe code'

export function isHolisticKeySafeQuestion(q: InitialAssessmentQuestion): boolean {
  const key = fieldKeyOf(q)
  if (key === 'keySafePresentHolistic' || key === 'keySafeCodeHolistic') return true
  const text = q.questionText.trim()
  return text === KEY_SAFE_PRESENT_TEXT || text === KEY_SAFE_CODE_TEXT
}

export function findHolisticKeySafeQuestions(sections: InitialAssessmentSection[]): {
  keySafePresent?: InitialAssessmentQuestion
  keySafeCode?: InitialAssessmentQuestion
} {
  let keySafePresent: InitialAssessmentQuestion | undefined
  let keySafeCode: InitialAssessmentQuestion | undefined

  for (const section of sections) {
    for (const q of section.questions) {
      if (!isHolisticKeySafeQuestion(q)) continue
      if (q.questionText.trim() === KEY_SAFE_PRESENT_TEXT || fieldKeyOf(q) === 'keySafePresentHolistic') {
        keySafePresent = q
      }
      if (q.questionText.trim() === KEY_SAFE_CODE_TEXT || fieldKeyOf(q) === 'keySafeCodeHolistic') {
        keySafeCode = q
      }
    }
  }

  return { keySafePresent, keySafeCode }
}
