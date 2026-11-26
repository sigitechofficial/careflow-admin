import { describe, expect, it } from 'vitest'
import {
  answerIsPrefillValue,
  buildAnswerFromPrefill,
  prefillKeyForQuestion,
} from '@/features/service-users/initial-assessment/utils/question-prefill'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

const q = (over: Partial<InitialAssessmentQuestion>): InitialAssessmentQuestion =>
  ({ id: 'q1', questionText: '', questionType: 'TEXT', metadata: {}, ...over }) as InitialAssessmentQuestion

describe('DOM Care / About Me prefill links', () => {
  it('links questions without a prefill key', () => {
    expect(prefillKeyForQuestion(q({ questionText: 'Staff gender preference for personal care' }))).toBe('staffGenderPreference')
    expect(prefillKeyForQuestion(q({ metadata: { fieldKey: 'accommodationType' } }))).toBe('accommodationType')
    expect(prefillKeyForQuestion(q({ questionText: 'Bathing / shower and dressing preferences' }))).toBe('aboutMe_personalHygiene')
  })

  it('prefills a multi-select with one option per line', () => {
    const accom = q({ questionType: 'MULTI_SELECT', metadata: { fieldKey: 'accommodationType' } })
    expect(buildAnswerFromPrefill(accom, 'private_flat\nother')).toEqual({ questionId: 'q1', selectedOptions: ['private_flat', 'other'] })
    const map = new Map([['accommodationType', 'private_flat\nother']])
    expect(answerIsPrefillValue(accom, { questionId: 'q1', selectedOptions: ['private_flat', 'other'] }, map)).toBe(true)
    expect(answerIsPrefillValue(accom, { questionId: 'q1', selectedOptions: ['private_flat'] }, map)).toBe(false)
  })
})
