import { describe, expect, it } from 'vitest'
import { isFallsScreeningComplete } from '@/features/service-users/initial-assessment/utils/falls-screening'
import { syncFallsScreeningDerivedState } from '@/features/service-users/initial-assessment/utils/falls-screening-questions'
import type { InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'
import type { AdlWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/adl-scoring'

const section12: InitialAssessmentSection = {
  id: 's12',
  sectionNumber: 12,
  title: 'Section 12',
  sortOrder: 12,
  questions: [
    {
      id: 'falls-12-7',
      questionText: 'Falls in last 12 months?',
      questionType: 'YES_NO',
      isRequired: true,
      sortOrder: 1,
      riskFlag: false,
      carePlanTrigger: false,
      metadata: { specRef: '12.7' },
    },
  ],
}

describe('Falls screening completeness and §12.7 sync', () => {
  it('consent No is complete without Q1–Q6', () => {
    expect(
      isFallsScreeningComplete({
        fallOrConcern: false,
        firstScreenSinceLastFall: 'na',
        consentToSixQuestions: false,
      }),
    ).toBe(true)
  })

  it('consent Yes requires the six questions', () => {
    expect(
      isFallsScreeningComplete({
        fallOrConcern: true,
        firstScreenSinceLastFall: 'yes',
        consentToSixQuestions: true,
      }),
    ).toBe(false)
    expect(
      isFallsScreeningComplete({
        fallOrConcern: true,
        firstScreenSinceLastFall: 'yes',
        consentToSixQuestions: true,
        q1FallsNeedInvestigating: false,
        q2DizzyOrBlackouts: false,
        q3WalkingBalanceUnassessed: false,
        q4FourPlusMedsNoReview: false,
        q5TrippingMore: false,
        q6FearOfFalling: false,
      }),
    ).toBe(true)
  })

  it('never writes §12.7 and derives the ADL completion status', () => {
    const patches: string[] = []
    let adlOut: AdlWorksheetMetadata | null = null
    syncFallsScreeningDerivedState(
      [section12],
      {
        fallOrConcern: true,
        firstScreenSinceLastFall: 'yes',
        consentToSixQuestions: true,
        q1FallsNeedInvestigating: false,
        q2DizzyOrBlackouts: false,
        q3WalkingBalanceUnassessed: false,
        q4FourPlusMedsNoReview: false,
        q5TrippingMore: false,
        q6FearOfFalling: false,
      },
      { rows: [], fallsAssessmentCompleted: false },
      (next) => {
        adlOut = next
      },
      (questionId) => patches.push(questionId),
    )
    expect(patches).toEqual([])
    expect(adlOut!.fallsAssessmentCompleted).toBe(true)
    expect(adlOut!.fallsAssessmentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    syncFallsScreeningDerivedState([section12], {}, { rows: [], fallsAssessmentCompleted: true }, (next) => {
      adlOut = next
    })
    expect(adlOut!.fallsAssessmentCompleted).toBe(false)
    expect(adlOut!.fallsAssessmentDate).toBeNull()
  })
})
