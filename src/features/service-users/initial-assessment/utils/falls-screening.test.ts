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

  it('does not dual-write §12.7 unless consent is true', () => {
    const patches: Array<{ id: string; value: boolean }> = []
    const adl: AdlWorksheetMetadata = { rows: [] }
    syncFallsScreeningDerivedState(
      [section12],
      {
        fallOrConcern: false,
        firstScreenSinceLastFall: 'na',
        consentToSixQuestions: false,
        q1FallsNeedInvestigating: false,
      },
      adl,
      () => undefined,
      (questionId, patch) => {
        patches.push({ id: questionId, value: patch.booleanValue === true })
      },
    )
    expect(patches).toEqual([])

    syncFallsScreeningDerivedState(
      [section12],
      {
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
      adl,
      () => undefined,
      (questionId, patch) => {
        patches.push({ id: questionId, value: patch.booleanValue === true })
      },
    )
    expect(patches).toEqual([{ id: 'falls-12-7', value: true }])
  })
})
