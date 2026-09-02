import { describe, expect, it } from 'vitest'
import {
  abbeySeverityFromTotal,
  computeAbbeyTotal,
  enrichAbbeyMetadata,
  formatAbbeyCarePlanSuggestion,
  formatPainAssessmentHistorySummary,
  isAbbeyAssessmentComplete,
  isNrsAssessmentComplete,
  isPainAssessmentComplete,
  isPainElevatedReview,
  NRS_SCALE_ANCHORS,
  NRS_VERBAL_LABELS,
  parseAbbeyScoreInput,
} from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'

const allZero = {
  vocalisation: 0 as const,
  facialExpression: 0 as const,
  bodyLanguage: 0 as const,
  behaviouralChange: 0 as const,
  physiologicalChange: 0 as const,
  physicalChanges: 0 as const,
}

const mixedMild = {
  vocalisation: 1 as const,
  facialExpression: 2 as const,
  bodyLanguage: 0 as const,
  behaviouralChange: 1 as const,
  physiologicalChange: 2 as const,
  physicalChanges: 1 as const,
}

const abbey11 = {
  vocalisation: 2 as const,
  facialExpression: 2 as const,
  bodyLanguage: 2 as const,
  behaviouralChange: 2 as const,
  physiologicalChange: 2 as const,
  physicalChanges: 1 as const,
}

const abbey14 = {
  vocalisation: 3 as const,
  facialExpression: 3 as const,
  bodyLanguage: 2 as const,
  behaviouralChange: 2 as const,
  physiologicalChange: 2 as const,
  physicalChanges: 2 as const,
}

describe('pain-assessment-scoring', () => {
  it('all six 0 → total 0 → none', () => {
    expect(computeAbbeyTotal(allZero)).toBe(0)
    expect(abbeySeverityFromTotal(computeAbbeyTotal(allZero))).toBe('none')
    expect(isAbbeyAssessmentComplete(allZero)).toBe(true)
  })

  it('mixed scores → correct total', () => {
    expect(computeAbbeyTotal(mixedMild)).toBe(7)
  })

  it('maps Abbey total to severity band', () => {
    expect(abbeySeverityFromTotal(2)).toBe('none')
    expect(abbeySeverityFromTotal(3)).toBe('mild')
    expect(abbeySeverityFromTotal(7)).toBe('mild')
    expect(abbeySeverityFromTotal(8)).toBe('moderate')
    expect(abbeySeverityFromTotal(13)).toBe('moderate')
    expect(abbeySeverityFromTotal(14)).toBe('severe')
    expect(abbeySeverityFromTotal(computeAbbeyTotal(abbey11))).toBe('moderate')
    expect(abbeySeverityFromTotal(computeAbbeyTotal(abbey14))).toBe('severe')
  })

  it('persists calculated total and overwrites independent severityBand', () => {
    const enriched = enrichAbbeyMetadata({ ...abbey11, severityBand: 'none' })
    expect(enriched?.total).toBe(11)
    expect(enriched?.severityBand).toBe('moderate')
  })

  it('one Abbey item missing → incomplete; all six including all-zero → complete', () => {
    expect(isAbbeyAssessmentComplete({ ...allZero, physicalChanges: undefined })).toBe(false)
    expect(isAbbeyAssessmentComplete(allZero)).toBe(true)
  })

  it('NRS 0 is complete; missing NRS is not; values outside 0–10 are incomplete', () => {
    expect(isNrsAssessmentComplete(0)).toBe(true)
    expect(isNrsAssessmentComplete(10)).toBe(true)
    expect(isNrsAssessmentComplete(undefined)).toBe(false)
    expect(isNrsAssessmentComplete(null)).toBe(false)
    expect(isNrsAssessmentComplete(11)).toBe(false)
    expect(isNrsAssessmentComplete(-1)).toBe(false)
  })

  it('pain tool complete if Abbey complete OR NRS complete; neither is incomplete', () => {
    expect(isPainAssessmentComplete({ abbey: allZero })).toBe(true)
    expect(isPainAssessmentComplete({ nrsScore: 0 })).toBe(true)
    expect(isPainAssessmentComplete({ nrsScore: 4 })).toBe(true)
    expect(isPainAssessmentComplete({ abbey: { vocalisation: 2 } })).toBe(false)
    expect(isPainAssessmentComplete({})).toBe(false)
  })

  it('does not treat total > 0 as completeness', () => {
    expect(isAbbeyAssessmentComplete({ vocalisation: 3, facialExpression: 3 })).toBe(false)
    expect(computeAbbeyTotal({ vocalisation: 3, facialExpression: 3 })).toBe(6)
  })

  it('history snapshot summary uses calculated score/band/type with /18 and optional date', () => {
    expect(formatPainAssessmentHistorySummary({ nrsScore: 4 })).toBe('NRS 4/10')
    expect(
      formatPainAssessmentHistorySummary({
        abbey: { ...abbey11, painType: 'acute_on_chronic' },
      }),
    ).toBe('Abbey 11/18 (moderate), acute on chronic')
    expect(
      formatPainAssessmentHistorySummary({
        nrsScore: 4,
        abbey: { ...abbey11, painType: 'acute_on_chronic' },
      }),
    ).toBe('NRS 4/10 · Abbey 11/18 (moderate), acute on chronic')
    expect(
      formatPainAssessmentHistorySummary({
        nrsScore: 0,
        abbey: { ...allZero, dateCompleted: '2026-09-02' },
      }),
    ).toMatch(/^NRS 0\/10 · Abbey 0\/18 \(none\) · .+2026$/)
  })

  it('elevated review is Abbey >= 8 or NRS >= 4', () => {
    expect(isPainElevatedReview({ nrsScore: 4 })).toBe(true)
    expect(isPainElevatedReview({ nrsScore: 3 })).toBe(false)
    expect(isPainElevatedReview({ abbey: abbey11 })).toBe(true)
    expect(isPainElevatedReview({ abbey: mixedMild })).toBe(false)
  })

  it('Abbey Care Plan suggestion is never an NRS 0–10 value', () => {
    const text = formatAbbeyCarePlanSuggestion({
      abbey: { ...abbey11, painType: 'acute_on_chronic' },
    })
    expect(text).toBe('Abbey 11/18 — moderate; acute on chronic (IA Pain Assessment Tool)')
    expect(text).not.toMatch(/^[0-9]+$/)
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
