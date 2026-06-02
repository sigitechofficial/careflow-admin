import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

function isYes(patch: InitialAssessmentAnswerInput): boolean {
  return patch.checked === true || patch.booleanValue === true
}

function isNoConcernMaster(q: InitialAssessmentQuestion): boolean {
  return q.metadata?.noConcernMaster === true
}

function clearYesNo(q: InitialAssessmentQuestion): InitialAssessmentAnswerInput {
  return { questionId: q.id, checked: false, booleanValue: false }
}

export function applyNoConcernLogic(
  section: InitialAssessmentSection,
  questionId: string,
  patch: InitialAssessmentAnswerInput,
  answers: Record<string, InitialAssessmentAnswerInput>,
): Record<string, InitialAssessmentAnswerInput> {
  const question = section.questions.find((q) => q.id === questionId)
  if (!question) return answers

  const next = { ...answers, [questionId]: patch }
  const yes = isYes(patch)

  if (isNoConcernMaster(question) && yes) {
    for (const other of section.questions) {
      if (other.id === questionId) continue
      if (other.questionType === 'YES_NO' || other.questionType === 'CHECKBOX') {
        next[other.id] = clearYesNo(other)
      }
    }
    return next
  }

  if (!isNoConcernMaster(question) && yes && (question.questionType === 'YES_NO' || question.questionType === 'CHECKBOX')) {
    const master = section.questions.find(isNoConcernMaster)
    if (master) next[master.id] = clearYesNo(master)
  }

  return next
}
