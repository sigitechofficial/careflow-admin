import { describe, expect, it } from 'vitest'
import { resolveIaPreferredVisitTimesFromAnswers } from '@/features/service-users/visit-plan/resolve-ia-preferred-visit-times'
import type { InitialAssessmentAnswer } from '@/features/service-users/initial-assessment/types'

function answer(partial: Partial<InitialAssessmentAnswer> & Pick<InitialAssessmentAnswer, 'questionId'>): InitialAssessmentAnswer {
  return {
    id: partial.id ?? 'a-1',
    questionId: partial.questionId,
    checked: partial.checked ?? null,
    booleanValue: partial.booleanValue ?? null,
    textValue: partial.textValue ?? null,
    numberValue: partial.numberValue ?? null,
    dateValue: partial.dateValue ?? null,
    timeValue: partial.timeValue ?? null,
    selectedOptions: partial.selectedOptions ?? null,
    notes: partial.notes ?? null,
    riskFlag: partial.riskFlag ?? false,
    carePlanTrigger: partial.carePlanTrigger ?? false,
    question: partial.question,
  }
}

describe('resolveIaPreferredVisitTimesFromAnswers', () => {
  it('returns null when no preferred visit times answer exists', () => {
    expect(resolveIaPreferredVisitTimesFromAnswers([])).toBeNull()
  })

  it('extracts selected slots from IA answer metadata', () => {
    const result = resolveIaPreferredVisitTimesFromAnswers([
      answer({
        questionId: 'q-visit',
        selectedOptions: { MORNING: { selected: true, from: '07:00', to: '10:00', roundName: 'Morning' } },
        question: {
          id: 'q-visit',
          questionText: 'Preferred visit times',
          questionType: 'MULTI_SELECT',
          riskFlag: false,
          carePlanTrigger: false,
          metadata: { fieldKey: 'preferredVisitTimes', optionsLookup: 'medication_administration_rounds' },
        },
      }),
    ])

    expect(result?.hasAnswer).toBe(true)
    expect(result?.summaryText).toContain('Morning (07:00–10:00)')
    expect(result?.selectedSlots).toEqual([
      { code: 'MORNING', label: 'Morning', from: '07:00', to: '10:00' },
    ])
  })
})
