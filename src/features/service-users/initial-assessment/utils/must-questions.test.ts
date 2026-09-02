import { describe, expect, it } from 'vitest'
import { enrichMustMetadata } from '@/features/service-users/initial-assessment/utils/must-scoring'
import { syncMustAssessmentAnswers } from '@/features/service-users/initial-assessment/utils/must-questions'
import type { InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'

const sections: InitialAssessmentSection[] = [
  {
    id: 's6',
    sectionNumber: 6,
    title: 'Nutrition',
    sortOrder: 6,
    questions: [
      {
        id: 'must-done',
        questionText: 'MUST assessment completed?',
        questionType: 'YES_NO',
        isRequired: false,
        sortOrder: 1,
        riskFlag: false,
        carePlanTrigger: false,
        metadata: { specRef: '6.9' },
      },
      {
        id: 'must-score',
        questionText: 'MUST score',
        questionType: 'NUMBER',
        isRequired: false,
        sortOrder: 2,
        riskFlag: false,
        carePlanTrigger: false,
        metadata: { specRef: '6.9' },
      },
      {
        id: 'bmi-value',
        questionText: 'BMI value',
        questionType: 'NUMBER',
        isRequired: false,
        sortOrder: 3,
        riskFlag: false,
        carePlanTrigger: false,
        metadata: { specRef: '6.8' },
      },
    ],
  },
]

describe('syncMustAssessmentAnswers', () => {
  it('copies derived MUST score only — never BMI', () => {
    const patches: Record<string, { numberValue?: number; booleanValue?: boolean }> = {}
    const must = enrichMustMetadata({
      bmiOptionId: 'lt18_5',
      weightLossOptionId: 'gt10',
      acuteDiseaseOptionId: 'yes',
    })
    syncMustAssessmentAnswers(sections, must, (questionId, patch) => {
      patches[questionId] = patch
    })
    expect(patches['must-done']?.booleanValue).toBe(true)
    expect(patches['must-score']?.numberValue).toBe(must.score)
    expect(patches['bmi-value']).toBeUndefined()
  })
})
