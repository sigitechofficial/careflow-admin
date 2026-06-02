import { describe, expect, it } from 'vitest'
import {
  formatPreferredVisitTimesAnswer,
  hasPreferredVisitTimesAnswer,
  parsePreferredVisitTimesValue,
  serializePreferredVisitTimesValue,
} from '@/features/service-users/initial-assessment/utils/preferred-visit-times'
import { visitTimeSlotOptionsFromRounds } from '@/features/service-users/initial-assessment/utils/visit-time-slot-options'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

const question: InitialAssessmentQuestion = {
  id: 'q-visit',
  questionText: 'Preferred visit times',
  questionType: 'MULTI_SELECT',
  isRequired: false,
  riskFlag: false,
  carePlanTrigger: false,
  sortOrder: 1,
  metadata: { fieldKey: 'preferredVisitTimes', optionsLookup: 'medication_administration_rounds' },
}

const slotOptions = visitTimeSlotOptionsFromRounds([])

describe('preferred-visit-times with medication rounds', () => {
  it('uses administration round codes and default windows', () => {
    expect(slotOptions.map((s) => s.value)).toEqual(['MORNING', 'MIDDAY', 'AFTERNOON', 'EVENING', 'NIGHT'])
    expect(slotOptions[0]?.defaultFrom).toBe('07:00')
    expect(slotOptions[0]?.defaultTo).toBe('10:00')
  })

  it('migrates legacy array selections to round codes', () => {
    const parsed = parsePreferredVisitTimesValue(['morning', 'early_evening'], slotOptions)
    expect(parsed.MORNING?.selected).toBe(true)
    expect(parsed.EVENING?.selected).toBe(true)
  })

  it('serializes selected slots with custom times', () => {
    const serialized = serializePreferredVisitTimesValue(
      {
        MORNING: { selected: true, from: '08:30', to: '11:00', roundName: 'Morning' },
      },
      slotOptions,
    )
    expect(serialized).toEqual({
      MORNING: { selected: true, from: '08:30', to: '11:00', roundName: 'Morning' },
    })
  })

  it('formats display with round name and edited times', () => {
    const text = formatPreferredVisitTimesAnswer(
      {
        questionId: 'q-visit',
        selectedOptions: { MORNING: { selected: true, from: '08:30', to: '11:00', roundName: 'Morning' } },
      },
      question,
    )
    expect(text).toContain('Morning (08:30–11:00)')
  })

  it('detects answered state from structured record', () => {
    expect(
      hasPreferredVisitTimesAnswer(
        {
          questionId: 'q-visit',
          selectedOptions: { EVENING: { selected: true, from: '17:00', to: '19:00', roundName: 'Evening' } },
        },
        question,
      ),
    ).toBe(true)
  })
})
