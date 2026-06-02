import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { InitialAssessmentAnswerInput } from '@/features/service-users/initial-assessment/types'

export function isSecureQuestion(q: InitialAssessmentQuestion): boolean {
  return q.metadata?.secureField === true
}

export const SECURE_MASK_PLACEHOLDER = '••••••'

export function hasTextAnswerValue(value: InitialAssessmentAnswerInput | undefined): boolean {
  if (!value) return false
  if (value.hasSecureValue || value.secureMasked) return true
  return Boolean(value.textValue?.trim())
}

export function prepareAnswersForSave(
  questions: InitialAssessmentQuestion[],
  answers: InitialAssessmentAnswerInput[],
) {
  const byId = new Map(questions.map((q) => [q.id, q]))
  return answers.map((answer) => {
    const q = byId.get(answer.questionId)
    if (!q || !isSecureQuestion(q)) return answer
    if (answer.secureMasked && answer.textValue === undefined) {
      const { secureMasked, hasSecureValue, textValue, ...rest } = answer
      return rest
    }
    const { secureMasked, hasSecureValue, ...rest } = answer
    return rest
  })
}
