import { describe, expect, it } from 'vitest'
import {
  computeWaterlowScore,
  computeWaterlowScoreFromEnteredScores,
  computeWaterlowScoreFromSelections,
  enrichWaterlowMetadata,
  selectWaterlowSingleOption,
  selectWaterlowWeightLossOption,
  toggleWaterlowMultiOption,
  waterlowBand,
  waterlowCarePlanRequired,
  WATERLOW_TABLE_SECTIONS,
  defaultWaterlowMetadata,
  waterlowSelectionBreakdown,
  waterlowFollowUpPrefill,
  waterlowNextReviewHint,
  waterlowReviewIntervalDays,
} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'

describe('waterlow-scoring', () => {
  it('sums user-entered scores for total', () => {
    const score = computeWaterlowScoreFromEnteredScores({
      'gender:female': 2,
      'age:81+': 5,
      'mobility:chair': 5,
      'skin:healthy': 0,
    })
    expect(score).toBe(12)
    expect(waterlowBand(score).level).toBe('at_risk')
    expect(waterlowCarePlanRequired(score)).toBe(true)
  })

  it('matches legacy example when enteredScores is not used', () => {
    const score = computeWaterlowScore({
      gender: 2,
      age: 5,
      build: 0,
      appetite: 0,
      mobility: 5,
      continence: 0,
      neurological: 0,
      surgery: 0,
      medication: 0,
      weightLoss: 0,
      skinTypes: ['healthy'],
      tissueMalnutrition: [],
    })
    expect(score).toBe(12)
  })

  it('enrichWaterlowMetadata sets flags from entered scores', () => {
    const meta = enrichWaterlowMetadata({
      enteredScores: {
        'gender:female': 2,
        'age:81+': 5,
        'mobility:chair': 5,
      },
    })
    expect(meta.score).toBe(12)
    expect(meta.carePlanRequired).toBe(true)
    expect(meta.managerReviewSuggested).toBe(false)
  })

  it('scores unsure weight loss from entered scores', () => {
    const score = computeWaterlowScore({
      enteredScores: {
        'gender:male': 1,
        'age:14-49': 1,
        'weightLoss:unsure': 2,
      },
    })
    expect(score).toBe(4)
  })

  it('scores > 15 kg weight loss as 4', () => {
    const score = computeWaterlowScore({
      enteredScores: {
        'gender:male': 1,
        'age:14-49': 1,
        'weightLoss:15+': 4,
      },
    })
    expect(score).toBe(6)
  })

  it('sums scores from checked single- and multi-select options', () => {
    let meta = defaultWaterlowMetadata()
    const gender = WATERLOW_TABLE_SECTIONS.find((s) => s.id === 'gender')!
    const age = WATERLOW_TABLE_SECTIONS.find((s) => s.id === 'age')!
    const mobility = WATERLOW_TABLE_SECTIONS.find((s) => s.id === 'mobility')!
    const skin = WATERLOW_TABLE_SECTIONS.find((s) => s.id === 'skin')!

    meta = selectWaterlowSingleOption(meta, gender as Extract<typeof gender, { kind: 'single' }>, 'female')
    meta = selectWaterlowSingleOption(meta, age as Extract<typeof age, { kind: 'single' }>, '81+')
    meta = selectWaterlowSingleOption(meta, mobility as Extract<typeof mobility, { kind: 'single' }>, 'chair')
    meta = toggleWaterlowMultiOption(meta, skin as Extract<typeof skin, { kind: 'multi' }>, 'broken', true)
    meta = selectWaterlowWeightLossOption(meta, 'unsure')

    expect(computeWaterlowScoreFromSelections(meta)).toBe(17)
    expect(computeWaterlowScore(meta)).toBe(17)
    expect(waterlowBand(17).level).toBe('high')
  })
})

describe('waterlowSelectionBreakdown', () => {
  it('lists the chosen options and adds up to the score', () => {
    const meta = {
      singleOptionIds: { gender: 'female', age: '65-74', mobility: 'restricted', continence: 'continent' },
      gender: 2,
      age: 3,
      mobility: 3,
      continence: 0,
      skinTypes: ['dry'],
      weightLossOptionId: 'none',
      weightLoss: 0,
    }
    const items = waterlowSelectionBreakdown(meta)
    expect(items.filter((i) => i.score > 0).map((i) => `${i.category}:${i.score}`)).toEqual([
      'Gender:2',
      'Age:3',
      'Skin type — visual risk areas:1',
      'Mobility:3',
    ])
    expect(items.reduce((sum, i) => sum + i.score, 0)).toBe(computeWaterlowScore(meta))
  })

  it('is empty when nothing is chosen', () => {
    expect(waterlowSelectionBreakdown({})).toEqual([])
  })
})

describe('waterlowFollowUpPrefill', () => {
  const scored = { singleOptionIds: { gender: 'female', age: '65-74' }, gender: 2, age: 3 }
  // As served by GET /service-user-assessments/review-schedules (key waterlow).
  const reviewSchedule = {
    defaultIntervalDays: 30,
    elevatedRiskIntervalDays: 7,
    elevatedRiskScoreFrom: 15,
    guidanceSource: 'NWCSP clinical recommendations',
  }

  it('fills empty follow-up fields with the review date from the schedule', () => {
    expect(
      waterlowFollowUpPrefill(scored, { assessorName: 'A. Assessor', assessmentDate: '2026-09-30', reviewSchedule }),
    ).toEqual({
      recommendation: 'Minimal risk (0–9): Follow agency policy.',
      recommendationBy: 'A. Assessor',
      recommendationDate: '2026-09-30',
      nextReviewDate: '2026-10-30',
    })
  })

  it('never overwrites what is already written, and waits for a score', () => {
    const filled = { ...scored, recommendation: '<p>Own text</p>', recommendationBy: 'X', recommendationDate: '2026-01-01', nextReviewDate: '2026-02-01' }
    expect(waterlowFollowUpPrefill(filled, { assessorName: 'A', assessmentDate: '2026-09-30', reviewSchedule })).toBeNull()
    expect(waterlowFollowUpPrefill({}, { assessorName: 'A', assessmentDate: '2026-09-30', reviewSchedule })).toBeNull()
  })

  it('leaves the review date empty until the schedule has loaded', () => {
    expect(waterlowFollowUpPrefill(scored, { assessmentDate: '2026-09-30' })?.nextReviewDate).toBeUndefined()
  })

  it('uses the high-risk interval from the threshold score', () => {
    expect(waterlowReviewIntervalDays(14, reviewSchedule)).toBe(30)
    expect(waterlowReviewIntervalDays(15, reviewSchedule)).toBe(7)
    expect(waterlowReviewIntervalDays(15, { ...reviewSchedule, elevatedRiskIntervalDays: 3 })).toBe(3)
    expect(waterlowReviewIntervalDays(15, null)).toBeNull()
    expect(waterlowFollowUpPrefill(scored, { assessmentDate: '2027-01-31', reviewSchedule })?.nextReviewDate).toBe('2027-03-02')
  })

  it('describes where the date comes from', () => {
    expect(waterlowNextReviewHint(reviewSchedule)).toContain('30 days after the assessment, or 7 days when the score is 15 or more')
    expect(waterlowNextReviewHint(null)).toBeNull()
  })
})
