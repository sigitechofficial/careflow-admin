import { describe, expect, it } from 'vitest'
import { draftAnswersEqual } from '@/features/service-users/initial-assessment/utils/draft-answers-equality'
import type { InitialAssessmentAnswerInput } from '@/features/service-users/initial-assessment/types'

describe('draftAnswersEqual', () => {
  it('returns true for identical answer maps', () => {
    const a: Record<string, InitialAssessmentAnswerInput> = {
      q1: { questionId: 'q1', selectedOptions: ['a', 'b'] },
    }
    const b: Record<string, InitialAssessmentAnswerInput> = {
      q1: { questionId: 'q1', selectedOptions: ['b', 'a'] },
    }
    expect(draftAnswersEqual(a, b)).toBe(true)
  })

  it('returns false when values differ', () => {
    const a: Record<string, InitialAssessmentAnswerInput> = {
      q1: { questionId: 'q1', booleanValue: true, checked: true },
    }
    const b: Record<string, InitialAssessmentAnswerInput> = {
      q1: { questionId: 'q1', booleanValue: false, checked: false },
    }
    expect(draftAnswersEqual(a, b)).toBe(false)
  })
})
