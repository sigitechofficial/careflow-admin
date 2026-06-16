import { describe, expect, it } from 'vitest'
import {
  applySuggestedCarePlanLinks,
  resolveCarePlansForSlot,
  resolveExplicitCarePlansForSlot,
} from './visit-plan-care-plan-links.util'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'

const medication: AcceptedCarePlanItem = {
  formId: 'med-1',
  formName: 'Medication',
  pictureUrl: null,
  acceptedAt: '2026-01-01T00:00:00.000Z',
  carePlanArea: 'Medication',
}

const nutrition: AcceptedCarePlanItem = {
  formId: 'nut-1',
  formName: 'Eating and Drinking',
  pictureUrl: null,
  acceptedAt: '2026-01-01T00:00:00.000Z',
  carePlanArea: 'Nutrition',
}

function slot(partial: Partial<VisitPlanSlot> & Pick<VisitPlanSlot, 'slotCode'>): VisitPlanSlot {
  return {
    label: partial.slotCode,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    plannedStartTime: '08:00',
    plannedEndTime: '12:00',
    requiredCarers: 1,
    isEnabled: true,
    medicationRoundCode: partial.slotCode,
    notes: '',
    sortOrder: 1,
    scheduleFrequency: 'DAILY',
    repeatEvery: 1,
    repeatUnit: 'DAYS',
    timeCritical: false,
    timeToleranceMinutes: 30,
    durationMinutes: null,
    notesRequired: false,
    photoAllowed: false,
    shareOutcomeWithFamily: false,
    analysisArea: null,
    monthlyDayMode: 'BY_DATE',
    monthlyDaysOfMonth: [],
    monthlyPatternOrdinal: null,
    monthlyPatternWeekday: null,
    linkedCarePlanFormIds: [],
    assignedEmployeeIds: [],
    ...partial,
  }
}

describe('visit-plan-care-plan-links', () => {
  it('suggests medication on all med rounds when no explicit links', () => {
    const morning = slot({ slotCode: 'MORNING' })
    const linked = resolveCarePlansForSlot(morning, [medication, nutrition])
    expect(linked.map((p) => p.formId)).toContain('med-1')
    expect(linked.map((p) => p.formId)).not.toContain('nut-1')
  })

  it('uses explicit links only when set', () => {
    const morning = slot({ slotCode: 'MORNING', linkedCarePlanFormIds: ['nut-1'] })
    const linked = resolveCarePlansForSlot(morning, [medication, nutrition])
    expect(linked).toHaveLength(1)
    expect(linked[0]?.formId).toBe('nut-1')
  })

  it('resolveExplicitCarePlansForSlot ignores suggestions', () => {
    const morning = slot({ slotCode: 'MORNING' })
    expect(resolveExplicitCarePlansForSlot(morning, [medication])).toHaveLength(0)
  })

  it('applySuggestedCarePlanLinks fills empty slots', () => {
    const slots = applySuggestedCarePlanLinks(
      [slot({ slotCode: 'MORNING' }), slot({ slotCode: 'MIDDAY' })],
      [medication, nutrition],
    )
    expect(slots[0]?.linkedCarePlanFormIds).toContain('med-1')
    expect(slots[1]?.linkedCarePlanFormIds).toEqual(
      expect.arrayContaining(['med-1', 'nut-1']),
    )
  })
})
