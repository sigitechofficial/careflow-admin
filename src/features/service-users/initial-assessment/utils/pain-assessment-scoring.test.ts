import { describe, expect, it } from 'vitest'
import {
  abbeySeverityFromTotal,
  computeAbbeyTotal,
  NRS_SCALE_ANCHORS,
  NRS_VERBAL_LABELS,
  parseAbbeyScoreInput,
} from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'

describe('pain-assessment-scoring', () => {
  it('computes Abbey total', () => {
    expect(
      computeAbbeyTotal({
        vocalisation: 1,
        facialExpression: 2,
        bodyLanguage: 0,
        behaviouralChange: 1,
        physiologicalChange: 2,
        physicalChanges: 1,
      }),
    ).toBe(7)
  })

  it('maps Abbey total to severity band', () => {
    expect(abbeySeverityFromTotal(2)).toBe('none')
    expect(abbeySeverityFromTotal(7)).toBe('mild')
    expect(abbeySeverityFromTotal(13)).toBe('moderate')
    expect(abbeySeverityFromTotal(14)).toBe('severe')
  })

  it('labels NRS endpoints', () => {
    expect(NRS_VERBAL_LABELS[0]).toBe('No Pain')
    expect(NRS_VERBAL_LABELS[10]).toBe('Worst Pain Possible')
  })

  it('exposes paper NRS anchor labels', () => {
    expect(NRS_SCALE_ANCHORS.map((a) => a.score)).toEqual([0, 2, 4, 6, 8, 10])
  })

  it('parses Abbey score inputs', () => {
    expect(parseAbbeyScoreInput('2')).toBe(2)
    expect(parseAbbeyScoreInput('')).toBeUndefined()
    expect(parseAbbeyScoreInput('4')).toBeUndefined()
  })
})
