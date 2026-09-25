import { describe, expect, it } from 'vitest'
import type {
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  findMcaRequiredQuestion,
  isMcaRequiredYes,
} from '@/features/service-users/initial-assessment/utils/mca-required'

function q(
  id: string,
  text: string,
  metadata?: Record<string, unknown>,
): InitialAssessmentQuestion {
  return {
    id,
    questionText: text,
    questionType: 'YES_NO',
    isRequired: false,
    sortOrder: 1,
    riskFlag: false,
    carePlanTrigger: false,
    metadata,
  }
}

describe('mca-required', () => {
  const sections: InitialAssessmentSection[] = [
    {
      id: 's2',
      sectionNumber: 2,
      title: 'Consent',
      description: null,
      sortOrder: 2,
      questions: [q('m1', 'MCA required?', { specRef: '2.5', fieldKey: 'mcaRequired' })],
    },
  ]

  it('finds master by fieldKey', () => {
    expect(findMcaRequiredQuestion(sections)?.id).toBe('m1')
  })

  it('detects Yes on master', () => {
    expect(isMcaRequiredYes(sections, { m1: { questionId: 'm1', booleanValue: true } })).toBe(true)
    expect(isMcaRequiredYes(sections, { m1: { questionId: 'm1', booleanValue: false } })).toBe(false)
  })
})
