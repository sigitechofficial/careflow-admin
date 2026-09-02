import { describe, expect, it } from 'vitest'
import { buildHolisticWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/ia-holistic-metadata-autofill'
import {
  abbeySeverityFromTotal,
  computeAbbeyTotal,
  isAbbeyAssessmentComplete,
  type PainAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'

describe('QA demo pain assessment (generic Service User)', () => {
  it.each(['critical', 'normal', 'low'] as const)(
    '%s populates all six Abbey domains and calculates total (not hardcoded)',
    (level) => {
      const meta = buildHolisticWorksheetMetadata(level)
      const pain = meta.painAssessment as PainAssessmentMetadata
      expect(isAbbeyAssessmentComplete(pain.abbey)).toBe(true)
      const expected = computeAbbeyTotal(pain.abbey)
      expect(pain.abbey?.total).toBe(expected)
      expect(pain.abbey?.severityBand).toBe(abbeySeverityFromTotal(expected))
      expect(pain.nrsScore).not.toBe(Math.round(expected / 2))
    },
  )

  it('Very Critical uses independent NRS and calculated severe Abbey', () => {
    const pain = buildHolisticWorksheetMetadata('critical').painAssessment as PainAssessmentMetadata
    expect(pain.nrsScore).toBe(7)
    expect(pain.abbey?.total).toBe(computeAbbeyTotal(pain.abbey))
    expect(pain.abbey?.severityBand).toBe('severe')
    expect(pain.abbey?.painType).toBe('acute_on_chronic')
    expect(pain.abbey?.assessorNameDesignation).toContain('E2E Assessor')
  })

  it('Moderate calculates Abbey moderate without faking NRS from Abbey', () => {
    const pain = buildHolisticWorksheetMetadata('normal').painAssessment as PainAssessmentMetadata
    expect(pain.nrsScore).toBe(4)
    expect(pain.abbey?.total).toBe(computeAbbeyTotal(pain.abbey))
    expect(pain.abbey?.severityBand).toBe('moderate')
    expect(pain.nrsScore).not.toBe(pain.abbey?.total)
  })

  it('Stable all-zero Abbey is a calculated none band', () => {
    const pain = buildHolisticWorksheetMetadata('low').painAssessment as PainAssessmentMetadata
    expect(pain.abbey?.total).toBe(0)
    expect(pain.abbey?.severityBand).toBe('none')
    expect(isAbbeyAssessmentComplete(pain.abbey)).toBe(true)
  })
})
