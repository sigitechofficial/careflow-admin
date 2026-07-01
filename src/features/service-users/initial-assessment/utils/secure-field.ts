import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import type { InitialAssessmentAnswerInput } from '@/features/service-users/initial-assessment/types'

export function isSecureQuestion(q: InitialAssessmentQuestion): boolean {
  return q.metadata?.secureField === true
}

export const SECURE_MASK_PLACEHOLDER = '••••••'

export function textAnswerHasVisibleContent(textValue: string | null | undefined): boolean {
  if (!textValue?.trim()) return false
  if (/<[a-z][\s\S]*>/i.test(textValue.trim())) {
    return Boolean(
      textValue
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\u00a0/g, ' ')
        .trim(),
    )
  }
  return true
}

export function hasTextAnswerValue(value: InitialAssessmentAnswerInput | undefined): boolean {
  if (!value) return false
  if (value.hasSecureValue || value.secureMasked) return true
  return textAnswerHasVisibleContent(value.textValue)
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
