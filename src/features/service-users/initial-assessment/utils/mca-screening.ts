import type { InitialAssessmentQuestion, InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import { fieldKeyOf, specRefOf } from '@/features/service-users/initial-assessment/utils/question-lookup'

export const MCA_SCREENING_SPEC_REF = '2.mca'

export const MCA_TWO_STAGE_FIELD_KEYS = ['mcaStage1Impairment', 'mcaStage2UnableToDecide'] as const

export const MCA_FUNCTIONAL_FIELD_KEYS = [
  'mcaFunctionalUnderstand',
  'mcaFunctionalRetain',
  'mcaFunctionalWeigh',
  'mcaFunctionalCommunicate',
] as const

export const MCA_OUTCOME_FIELD_KEY = 'mcaScreeningOutcome'
export const MCA_COMMENTS_FIELD_KEY = 'mcaScreeningComments'

export function isMcaScreeningQuestion(q: InitialAssessmentQuestion): boolean {
  return specRefOf(q) === MCA_SCREENING_SPEC_REF
}

export function mcaScreeningQuestions(sections: InitialAssessmentSection[]): InitialAssessmentQuestion[] {
  const out: InitialAssessmentQuestion[] = []
  for (const sec of sections) {
    for (const q of sec.questions) {
      if (isMcaScreeningQuestion(q)) out.push(q)
    }
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder)
}

export function findMcaQuestionByFieldKey(
  sections: InitialAssessmentSection[],
  fieldKey: string,
): InitialAssessmentQuestion | undefined {
  for (const sec of sections) {
    const q = sec.questions.find((x) => fieldKeyOf(x) === fieldKey)
    if (q && isMcaScreeningQuestion(q)) return q
  }
  return undefined
}
