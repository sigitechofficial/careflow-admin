import { describe, expect, it } from 'vitest'
import {
  computeWaterlowScore,
  enrichWaterlowMetadata,
  waterlowBand,
  waterlowCarePlanRequired,
} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'

describe('waterlow-scoring', () => {
  it('matches paper example: female + age 81+ + chair bound', () => {
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
    expect(waterlowBand(score).level).toBe('at_risk')
    expect(waterlowCarePlanRequired(score)).toBe(true)
  })

  it('enrichWaterlowMetadata sets flags', () => {
    const meta = enrichWaterlowMetadata({
      gender: 2,
      age: 5,
      mobility: 5,
      skinTypes: ['healthy'],
    })
    expect(meta.score).toBe(12)
    expect(meta.carePlanRequired).toBe(true)
    expect(meta.managerReviewSuggested).toBe(false)
  })

  it('scores unsure weight loss as 2', () => {
    const score = computeWaterlowScore({
      gender: 1,
      age: 1,
      weightLoss: 2,
      skinTypes: ['healthy'],
    })
    expect(score).toBe(4)
  })
})
