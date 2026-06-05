import { describe, expect, it } from 'vitest'
import {
  computeWaterlowScore,
  computeWaterlowScoreFromEnteredScores,
  enrichWaterlowMetadata,
  waterlowBand,
  waterlowCarePlanRequired,
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
})
