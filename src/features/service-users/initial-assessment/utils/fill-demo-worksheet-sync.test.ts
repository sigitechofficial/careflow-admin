import { describe, expect, it } from 'vitest'
import { enrichMustMetadata } from '@/features/service-users/initial-assessment/utils/must-scoring'
import { syncFillDemoCatalogueAnswers } from '@/features/service-users/initial-assessment/utils/fill-demo-worksheet-sync'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

function q(
  id: string,
  questionText: string,
  extras: Partial<InitialAssessmentQuestion> = {},
): InitialAssessmentQuestion {
  return {
    id,
    questionText,
    questionType: extras.questionType ?? 'YES_NO',
    isRequired: false,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: extras.metadata ?? {},
    ...extras,
  }
}

const sections: InitialAssessmentSection[] = [
  {
    id: 's',
    sectionNumber: 1,
    title: 'Test',
    sortOrder: 1,
    questions: [
      q('must-done', 'MUST assessment completed?', { metadata: { specRef: '6.9' } }),
      q('must-score', 'MUST score', { questionType: 'NUMBER', metadata: { specRef: '6.9' } }),
      q('bmi-value', 'BMI value', { questionType: 'NUMBER', metadata: { specRef: '6.8' } }),
      q('pain-score', 'Pain score (0-10)', { questionType: 'NUMBER', metadata: { specRef: '5.3' } }),
      q('falls-12-7', 'Falls in last 12 months?', { metadata: { specRef: '12.7' } }),
    ],
  },
]

describe('syncFillDemoCatalogueAnswers', () => {
  it('copies MUST completed + calculated score and never BMI', () => {
    const patches: Record<string, InitialAssessmentAnswerInput> = {}
    const must = enrichMustMetadata({
      bmiOptionId: 'lt18_5',
      weightLossOptionId: 'gt10',
      acuteDiseaseOptionId: 'yes',
    })
    syncFillDemoCatalogueAnswers(sections, { mustAssessment: must }, { rows: [] }, () => undefined, (id, patch) => {
      patches[id] = patch
    })
    expect(patches['must-done']?.booleanValue).toBe(true)
    expect(patches['must-score']?.numberValue).toBe(must.score)
    expect(patches['bmi-value']).toBeUndefined()
  })

  it('copies NRS 0 to §5.3 and never writes Abbey into the NRS field', () => {
    const patches: Record<string, InitialAssessmentAnswerInput> = {}
    syncFillDemoCatalogueAnswers(
      sections,
      {
        painAssessment: {
          nrsScore: 0,
          abbey: {
            vocalisation: 2,
            facialExpression: 2,
            bodyLanguage: 2,
            behaviouralChange: 2,
            physiologicalChange: 2,
            physicalChanges: 1,
          },
        },
      },
      { rows: [] },
      () => undefined,
      (id, patch) => {
        patches[id] = patch
      },
    )
    expect(patches['pain-score']?.numberValue).toBe(0)
  })

  it('does not write §12.7 when Falls consent is No', () => {
    const patches: Record<string, InitialAssessmentAnswerInput> = {}
    syncFillDemoCatalogueAnswers(
      sections,
      {
        fallsScreening: {
          fallOrConcern: false,
          firstScreenSinceLastFall: 'na',
          consentToSixQuestions: false,
          q1FallsNeedInvestigating: false,
        },
      },
      { rows: [] },
      () => undefined,
      (id, patch) => {
        patches[id] = patch
      },
    )
    expect(patches['falls-12-7']).toBeUndefined()
  })

  it('writes §12.7 from Q1 only when Falls consent is Yes', () => {
    const patches: Record<string, InitialAssessmentAnswerInput> = {}
    syncFillDemoCatalogueAnswers(
      sections,
      {
        fallsScreening: {
          fallOrConcern: true,
          firstScreenSinceLastFall: 'yes',
          consentToSixQuestions: true,
          q1FallsNeedInvestigating: true,
          q2DizzyOrBlackouts: false,
          q3WalkingBalanceUnassessed: false,
          q4FourPlusMedsNoReview: false,
          q5TrippingMore: false,
          q6FearOfFalling: false,
        },
      },
      { rows: [] },
      () => undefined,
      (id, patch) => {
        patches[id] = patch
      },
    )
    expect(patches['falls-12-7']?.booleanValue).toBe(true)
  })
})
