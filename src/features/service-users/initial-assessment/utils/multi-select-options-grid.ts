import { fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

const OPTIONS_GRID_FIELD_KEYS = new Set([
  'oralHealthOptions',
  'bladderContinenceOptions',
  'bowelContinenceOptions',
  'speechOptions',
])

export function isMultiSelectOptionsGridQuestion(q: InitialAssessmentQuestion): boolean {
  if (q.questionType !== 'MULTI_SELECT') return false
  const key = fieldKeyOf(q)
  return key != null && OPTIONS_GRID_FIELD_KEYS.has(key)
}
