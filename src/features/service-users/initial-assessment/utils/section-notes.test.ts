import { describe, expect, it } from 'vitest'
import {
  questionsExcludingSectionFooterNotes,
  sectionFooterNotesQuestion,
} from './section-notes'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

function q(text: string): InitialAssessmentQuestion {
  return {
    id: text,
    questionText: text,
    questionType: 'TEXTAREA',
    isRequired: false,
    riskFlag: false,
    carePlanTrigger: false,
    sortOrder: 1,
  }
}

describe('section-notes', () => {
  it('extracts footer notes per section', () => {
    const notes = q('Continence / oral care notes')
    const other = q('Bladder continence options')
    expect(sectionFooterNotesQuestion(7, [other, notes])?.questionText).toBe('Continence / oral care notes')
    expect(questionsExcludingSectionFooterNotes(7, [other, notes])).toEqual([other])
  })
})
