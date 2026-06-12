import { describe, expect, it } from 'vitest'
import {
  activeConcernFollowUpGroups,
  BREATHING_CONCERN_FOLLOW_UP_GROUPS,
  inlineConcernFollowUpQuestionIds,
  SWALLOWING_CONCERN_FOLLOW_UP_GROUPS,
} from '@/features/service-users/initial-assessment/utils/section-5-concern-follow-ups'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

function q(
  id: string,
  text: string,
  meta?: Record<string, unknown>,
): InitialAssessmentQuestion {
  return {
    id,
    questionText: text,
    questionType: 'TEXT',
    sortOrder: 0,
    isRequired: false,
    riskFlag: false,
    carePlanTrigger: false,
    metadata: meta,
  }
}

describe('section-5-concern-follow-ups', () => {
  it('activates breathing history when exertion option selected', () => {
    const active = activeConcernFollowUpGroups(BREATHING_CONCERN_FOLLOW_UP_GROUPS, ['mild_exertion'])
    expect(active.map((g) => g.id)).toEqual(['breathing-history'])
  })

  it('activates choking history for choking options', () => {
    const active = activeConcernFollowUpGroups(SWALLOWING_CONCERN_FOLLOW_UP_GROUPS, ['choking_all'])
    expect(active.map((g) => g.id)).toEqual(['choking-history'])
  })

  it('collects inline swallowing follow-up question ids', () => {
    const questions = [
      q('1', 'Swallowing concern options', { fieldKey: 'swallowingConcerns' }),
      q('2', 'Choking history details'),
      q('3', 'Food texture requirement', { fieldKey: 'foodTexture' }),
      q('4', 'Fluid thickness requirement', { fieldKey: 'fluidThickness' }),
    ]
    const ids = inlineConcernFollowUpQuestionIds('swallowingConcerns', questions)
    expect([...ids].sort()).toEqual(['2', '3', '4'])
  })
})
