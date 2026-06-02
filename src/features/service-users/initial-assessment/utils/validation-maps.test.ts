import { describe, expect, it } from 'vitest'
import { buildValidationMaps, isRequiredFieldValidationMessage } from './validation-maps'
import type { InitialAssessmentSection } from '@/features/service-users/initial-assessment/types'

const section: InitialAssessmentSection = {
  id: 'sec-1',
  sectionNumber: 1,
  title: 'Test',
  questions: [
    {
      id: 'q1',
      questionText: 'Name',
      questionType: 'TEXT',
      isRequired: true,
      sortOrder: 1,
    },
  ],
}

describe('validation-maps', () => {
  it('detects required-field validation messages', () => {
    expect(isRequiredFieldValidationMessage('Required: Name')).toBe(true)
    expect(isRequiredFieldValidationMessage('Complete Waterlow')).toBe(false)
  })

  it('omits inline required errors until revealFieldErrors', () => {
    const hidden = buildValidationMaps({
      sections: [section],
      blocks: [{ message: 'Required: Name', sectionNumber: 1, blocking: true }],
      warnings: [],
      draftAnswers: {},
      editable: true,
      revealFieldErrors: false,
    })
    expect(hidden.questionErrors.size).toBe(0)
    expect(hidden.sectionNavStatus.get(1)).toBe('incomplete')

    const shown = buildValidationMaps({
      sections: [section],
      blocks: [{ message: 'Required: Name', sectionNumber: 1, blocking: true }],
      warnings: [],
      draftAnswers: {},
      editable: true,
      revealFieldErrors: true,
    })
    expect(shown.questionErrors.get('q1')).toBe('Required')
    expect(shown.sectionNavStatus.get(1)).toBe('blocking')
  })
})
