import { describe, expect, it } from 'vitest'
import { buildAssessmentSummary } from '@/features/service-users/assessments/utils/assessment-snapshot.util'

describe('pain-tool history snapshot summary', () => {
  it('contains the actual NRS score, Abbey total/band, and pain type', () => {
    expect(
      buildAssessmentSummary('pain-tool', {
        painAssessment: { nrsScore: 4 },
      }),
    ).toBe('NRS 4/10')

    expect(
      buildAssessmentSummary('pain-tool', {
        painAssessment: {
          abbey: {
            vocalisation: 2,
            facialExpression: 2,
            bodyLanguage: 2,
            behaviouralChange: 2,
            physiologicalChange: 2,
            physicalChanges: 1,
            painType: 'acute_on_chronic',
          },
        },
      }),
    ).toBe('Abbey 11/18 (moderate), acute on chronic')

    expect(
      buildAssessmentSummary('pain-tool', {
        painAssessment: {
          nrsScore: 4,
          abbey: {
            vocalisation: 2,
            facialExpression: 2,
            bodyLanguage: 2,
            behaviouralChange: 2,
            physiologicalChange: 2,
            physicalChanges: 1,
            painType: 'acute_on_chronic',
          },
        },
      }),
    ).toBe('NRS 4/10 · Abbey 11/18 (moderate), acute on chronic')
  })
})
