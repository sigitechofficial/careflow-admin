import {
  formatPreferredVisitTimesAnswer,
  isPreferredVisitTimesQuestion,
} from '@/features/service-users/initial-assessment/utils/preferred-visit-times'
import {
  type QuestionOptionCatalogs,
  labelForQuestionOptionValue,
} from '@/features/service-users/initial-assessment/utils/question-options'
import { SECURE_MASK_PLACEHOLDER } from '@/features/service-users/initial-assessment/utils/secure-field'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
} from '@/features/service-users/initial-assessment/types'

export function formatAnswerForDisplay(
  value: InitialAssessmentAnswerInput | undefined,
  question: InitialAssessmentQuestion,
  optionCatalogs: QuestionOptionCatalogs = {},
): string {
  if (!value) return '—'
  if (value.checked === true || value.booleanValue === true) return 'Yes'
  if (value.checked === false || value.booleanValue === false) return 'No'
  if (value.secureMasked || value.hasSecureValue) return SECURE_MASK_PLACEHOLDER
  if (value.textValue?.trim()) return value.textValue.trim()
  if (value.numberValue != null) return String(value.numberValue)
  if (value.dateValue) return value.dateValue.slice(0, 10)
  if (isPreferredVisitTimesQuestion(question)) {
    return formatPreferredVisitTimesAnswer(value, question)
  }
  const sel = value.selectedOptions
  if (Array.isArray(sel) && sel.length) {
    return sel
      .map(String)
      .map((v) => labelForQuestionOptionValue(v, question, optionCatalogs))
      .join(', ')
  }
  if (typeof sel === 'string' && sel) {
    return labelForQuestionOptionValue(sel, question, optionCatalogs)
  }
  return '—'
}
