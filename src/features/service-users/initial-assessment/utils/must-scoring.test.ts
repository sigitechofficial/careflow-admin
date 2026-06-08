import { describe, expect, it } from 'vitest'
import {
  computeMustScore,
  enrichMustMetadata,
  isMustScoringComplete,
  selectMustAcuteDiseaseOption,
  selectMustBmiOption,
  selectMustWeightLossOption,
} from '@/features/service-users/initial-assessment/utils/must-scoring'

describe('must-scoring', () => {
  it('sums selected option scores for total', () => {
    let meta = enrichMustMetadata({})
    meta = selectMustBmiOption(meta, '18_5to20')
    meta = selectMustWeightLossOption(meta, '5to10')
    meta = selectMustAcuteDiseaseOption(meta, 'no')

    expect(meta.bmiScore).toBe(1)
    expect(meta.weightLossScore).toBe(1)
    expect(meta.acuteDiseaseScore).toBe(0)
    expect(computeMustScore(meta)).toBe(2)
    expect(meta.riskLevel).toBe('high')
  })

  it('marks low risk when all steps score zero', () => {
    let meta = enrichMustMetadata({})
    meta = selectMustBmiOption(meta, 'gt20')
    meta = selectMustWeightLossOption(meta, 'lt5')
    meta = selectMustAcuteDiseaseOption(meta, 'no')

    expect(computeMustScore(meta)).toBe(0)
    expect(meta.riskLevel).toBe('low')
  })

  it('marks medium risk for total score of 1', () => {
    let meta = enrichMustMetadata({})
    meta = selectMustBmiOption(meta, '18_5to20')
    meta = selectMustWeightLossOption(meta, 'lt5')
    meta = selectMustAcuteDiseaseOption(meta, 'no')

    expect(computeMustScore(meta)).toBe(1)
    expect(meta.riskLevel).toBe('medium')
  })

  it('is complete only when all three steps have a selection', () => {
    let meta = enrichMustMetadata({})
    expect(isMustScoringComplete(meta)).toBe(false)

    meta = selectMustBmiOption(meta, 'gt20')
    expect(isMustScoringComplete(meta)).toBe(false)

    meta = selectMustWeightLossOption(meta, 'lt5')
    expect(isMustScoringComplete(meta)).toBe(false)

    meta = selectMustAcuteDiseaseOption(meta, 'yes')
    expect(isMustScoringComplete(meta)).toBe(true)
  })

  it('migrates legacy enteredScores to option selections', () => {
    const meta = enrichMustMetadata({
      enteredScores: { 'bmi:lt18_5': 2, 'weightLoss:gt10': 2 },
      acuteDiseaseScore: 2,
    })

    expect(meta.bmiScore).toBe(2)
    expect(meta.weightLossScore).toBe(2)
    expect(meta.acuteDiseaseScore).toBe(2)
    expect(computeMustScore(meta)).toBe(6)
    expect(meta.riskLevel).toBe('high')
  })
})
