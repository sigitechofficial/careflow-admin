import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

export function specRefOf(q: InitialAssessmentQuestion): string | undefined {
  const ref = q.metadata?.specRef
  return typeof ref === 'string' ? ref : undefined
}

export function fieldKeyOf(q: InitialAssessmentQuestion): string | undefined {
  const key = q.metadata?.fieldKey
  return typeof key === 'string' ? key : undefined
}

export function findQuestionBySpecRef(
  sections: InitialAssessmentSection[],
  specRef: string,
): InitialAssessmentQuestion | undefined {
  for (const sec of sections) {
    const q = sec.questions.find((x) => specRefOf(x) === specRef)
    if (q) return q
  }
  return undefined
}

export function findQuestionByFieldKey(
  sections: InitialAssessmentSection[],
  fieldKey: string,
): InitialAssessmentQuestion | undefined {
  for (const sec of sections) {
    const q = sec.questions.find((x) => x.metadata?.fieldKey === fieldKey)
    if (q) return q
  }
  return undefined
}

export function findQuestionByTextIncludes(
  sections: InitialAssessmentSection[],
  fragment: string,
): InitialAssessmentQuestion | undefined {
  const needle = fragment.toLowerCase()
  for (const sec of sections) {
    const q = sec.questions.find((x) => x.questionText.toLowerCase().includes(needle))
    if (q) return q
  }
  return undefined
}

export function findQuestionBySpecRefAndText(
  sections: InitialAssessmentSection[],
  specRef: string,
  fragment: string,
): InitialAssessmentQuestion | undefined {
  const needle = fragment.toLowerCase()
  for (const sec of sections) {
    const q = sec.questions.find(
      (x) => specRefOf(x) === specRef && x.questionText.toLowerCase().includes(needle),
    )
    if (q) return q
  }
  return undefined
}

export function isYesAnswer(value: InitialAssessmentAnswerInput | undefined): boolean {
  return value?.checked === true || value?.booleanValue === true
}

export function isExplicitNo(value: InitialAssessmentAnswerInput | undefined): boolean {
  if (value?.checked === false || value?.booleanValue === false) return true
  const sel = value?.selectedOptions
  if (Array.isArray(sel)) return sel.map(String).some((s) => s.toLowerCase() === 'no')
  if (typeof sel === 'string') return sel.toLowerCase() === 'no'
  return value?.textValue?.trim().toLowerCase() === 'no'
}
