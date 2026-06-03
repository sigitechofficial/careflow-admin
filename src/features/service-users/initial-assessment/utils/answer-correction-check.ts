import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
} from '@/features/service-users/initial-assessment/types'

function comparableDraftValue(
  questionType: string,
  answer: InitialAssessmentAnswerInput | undefined,
): string | null {
  if (!answer) return null
  if (questionType === 'CHECKBOX' || questionType === 'YES_NO') {
    if (answer.checked === true || answer.booleanValue === true) return 'Yes'
    if (answer.checked === false || answer.booleanValue === false) return 'No'
    return null
  }
  if (answer.numberValue != null && !Number.isNaN(answer.numberValue)) {
    return String(answer.numberValue)
  }
  if (answer.dateValue) return answer.dateValue.slice(0, 10)
  if (answer.textValue?.trim()) {
    if (answer.secureMasked || answer.hasSecureValue) return '[secure]'
    return answer.textValue.trim()
  }
  if (answer.selectedOptions != null) {
    if (Array.isArray(answer.selectedOptions)) {
      return JSON.stringify(answer.selectedOptions)
    }
    if (typeof answer.selectedOptions === 'string') return answer.selectedOptions.trim()
    return JSON.stringify(answer.selectedOptions)
  }
  return null
}

/** True when draft changes a question that already had a saved answer on the server. */
export function draftCorrectsSavedAnswer(
  question: Pick<InitialAssessmentQuestion, 'id' | 'questionType'>,
  baseline: Record<string, InitialAssessmentAnswerInput>,
  draft: InitialAssessmentAnswerInput,
): boolean {
  const prior = baseline[question.id]
  if (!prior) return false
  return (
    comparableDraftValue(question.questionType, prior) !==
    comparableDraftValue(question.questionType, draft)
  )
}

export function batchRequiresCorrectionReason(
  questions: Pick<InitialAssessmentQuestion, 'id' | 'questionType'>[],
  baseline: Record<string, InitialAssessmentAnswerInput>,
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
  questionIds: string[],
): boolean {
  const byId = new Map(questions.map((q) => [q.id, q]))
  for (const id of questionIds) {
    const q = byId.get(id)
    const draft = draftAnswers[id]
    if (!q || !draft) continue
    if (draftCorrectsSavedAnswer(q, baseline, draft)) return true
  }
  return false
}
