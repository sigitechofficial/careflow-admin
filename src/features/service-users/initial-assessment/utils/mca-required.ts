import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  findQuestionByFieldKey,
  findQuestionByTextIncludes,
  isYesAnswer,
} from '@/features/service-users/initial-assessment/utils/question-lookup'

/** Consent §2.5 master — single writable “MCA required?” gate for screening + checklist. */
export function findMcaRequiredQuestion(
  sections: InitialAssessmentSection[],
): InitialAssessmentQuestion | undefined {
  return (
    findQuestionByFieldKey(sections, 'mcaRequired') ??
    findQuestionByTextIncludes(sections, 'mca required')
  )
}

export function findMcaCompletedQuestion(
  sections: InitialAssessmentSection[],
): InitialAssessmentQuestion | undefined {
  return findQuestionByTextIncludes(sections, 'mca completed')
}

export function isMcaRequiredYes(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
): boolean {
  const q = findMcaRequiredQuestion(sections)
  return q ? isYesAnswer(answers[q.id]) : false
}
