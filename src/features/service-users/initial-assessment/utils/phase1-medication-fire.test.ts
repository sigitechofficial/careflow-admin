import { describe, expect, it } from 'vitest'
import { SECTION_9_GROUP_ORDER } from '@/features/service-users/initial-assessment/utils/section-4-physical-assessment-display-order'
import { isSection31FireQuestion } from '@/features/service-users/initial-assessment/utils/section-31-fire-safety'
import { filterSection9Questions } from '@/features/service-users/initial-assessment/utils/section-phase1-filters'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

function q(text: string, specRef: string, fieldKey?: string): InitialAssessmentQuestion {
  return {
    id: text,
    questionText: text,
    questionType: 'YES_NO',
    isRequired: false,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: { specRef, ...(fieldKey ? { fieldKey } : {}) },
  }
}

describe('Phase 1 medication and fire UI wiring helpers', () => {
  it('keeps §9.2–§9.5 in the existing medication group order', () => {
    expect(SECTION_9_GROUP_ORDER).toEqual(['9.1', '9.2', '9.3', '9.4', '9.5', '9.6'])
  })

  it('does not filter restored §9 medication support questions out of the IA UI', () => {
    const support = q('Recommended medication support level', '9.2', 'medicationSupportLevel')
    support.questionType = 'SINGLE_SELECT'
    const shown = filterSection9Questions([
      q('Taking prescribed medication?', '9.1', 'takingPrescribedMedication'),
      support,
      q('MAR / eMAR required?', '9.5', 'emarRequired'),
    ])
    expect(shown.map((row) => row.metadata?.fieldKey)).toEqual([
      'takingPrescribedMedication',
      'medicationSupportLevel',
      'emarRequired',
    ])
  })

  it('treats rehomed fire questions as Fire Safety, not Environment manage-home', () => {
    expect(isSection31FireQuestion(q('Any fire safety risks identified?', '18.1', 'fireSafetyRisksIdentified'))).toBe(
      true,
    )
    expect(isSection31FireQuestion(q('Smoke alarm fitted and working?', '18.3', 'smokeAlarmFittedWorking'))).toBe(true)
    expect(
      isSection31FireQuestion(q('Can client manage home environment safely?', '3.3', 'manageHomeEnvironmentSafely')),
    ).toBe(false)
  })
})
