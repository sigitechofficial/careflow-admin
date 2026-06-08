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
