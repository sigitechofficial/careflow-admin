import { hasTextAnswerValue } from '@/features/service-users/initial-assessment/utils/secure-field'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
} from '@/features/service-users/initial-assessment/types'

export function isAnsweredForStep(
  q: InitialAssessmentQuestion,
  value: InitialAssessmentAnswerInput | undefined,
): boolean {
  if (!value) return !q.isRequired
  if (q.questionType === 'CHECKBOX' || q.questionType === 'YES_NO') {
    return value.checked === true || value.booleanValue === true || value.checked === false || value.booleanValue === false
  }
  if (q.questionType === 'NUMBER') {
    return value.numberValue != null && !Number.isNaN(value.numberValue)
  }
  if (q.questionType === 'DATE') return Boolean(value.dateValue?.trim())
  if (q.questionType === 'MULTI_SELECT') {
    const opts = value.selectedOptions
    return Array.isArray(opts) && opts.length > 0
  }
  if (q.questionType === 'SINGLE_SELECT') {
    const opts = value.selectedOptions
    if (Array.isArray(opts)) return opts.length > 0
    return typeof opts === 'string' && opts.length > 0
  }
  if (value.hasSecureValue) return true
  if (hasTextAnswerValue(value)) return true
  return !q.isRequired
}
