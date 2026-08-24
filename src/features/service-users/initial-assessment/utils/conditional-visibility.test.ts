import { describe, expect, it } from 'vitest'
import { shouldShowQuestion } from './conditional-visibility'
import type { InitialAssessmentQuestion, InitialAssessmentSection } from '../types'

function q(
  id: string,
  questionText: string,
  questionType: InitialAssessmentQuestion['questionType'],
  metadata?: Record<string, unknown>,
): InitialAssessmentQuestion {
  return {
    id,
    questionText,
    questionType,
    isRequired: false,
    riskFlag: false,
    carePlanTrigger: false,
    sortOrder: 0,
    metadata: metadata ?? null,
  }
}

describe('Falls IA follow-up visibility', () => {
  const fallsYn = q('falls-yn', 'Falls in last 12 months?', 'YES_NO', {
    specRef: '12.7',
    fieldKey: 'fallsLast12Months',
  })
  const count = q('count', 'Number of falls (last 12 months)', 'NUMBER', {
    specRef: '12.7',
    showWhen: { gateTextIncludes: 'falls in last 12 months', yes: true },
  })
  const date = q('date', 'Most recent fall date', 'DATE', {
    specRef: '12.7',
    showWhen: { gateTextIncludes: 'falls in last 12 months', yes: true },
  })
  const injury = q('injury', 'Injury caused by fall?', 'YES_NO', {
    specRef: '12.7',
    showWhen: { gateTextIncludes: 'falls in last 12 months', yes: true },
  })
  const sections: InitialAssessmentSection[] = [
    {
      id: 's12',
      sectionNumber: 12,
      title: 'Mobility, ADL and Practical Support',
      sortOrder: 12,
      questions: [fallsYn, count, date, injury],
    },
  ]

  it('hides count/date/injury until Falls in last 12 months is Yes', () => {
    const unanswered = {}
    expect(shouldShowQuestion(fallsYn, sections, unanswered)).toBe(true)
    expect(shouldShowQuestion(count, sections, unanswered)).toBe(false)
    expect(shouldShowQuestion(date, sections, unanswered)).toBe(false)
    expect(shouldShowQuestion(injury, sections, unanswered)).toBe(false)

    const no = { [fallsYn.id]: { questionId: fallsYn.id, booleanValue: false, checked: false } }
    expect(shouldShowQuestion(count, sections, no)).toBe(false)

    const yes = { [fallsYn.id]: { questionId: fallsYn.id, booleanValue: true, checked: true } }
    expect(shouldShowQuestion(count, sections, yes)).toBe(true)
    expect(shouldShowQuestion(date, sections, yes)).toBe(true)
    expect(shouldShowQuestion(injury, sections, yes)).toBe(true)
  })
})
