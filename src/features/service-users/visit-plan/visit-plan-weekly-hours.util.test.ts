import { describe, expect, it } from 'vitest'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import {
  summarizeVisitPlanWeeklyHours,
  visitPlanWeeklyPlannedMinutes,
} from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'

function baseSlot(overrides: Partial<VisitPlanSlot> = {}): VisitPlanSlot {
  return {
    slotCode: 'MORNING',
    label: 'Morning',
    daysOfWeek: [1, 2, 3, 4, 5],
    plannedStartTime: '09:00',
    plannedEndTime: '10:00',
    requiredCarers: 1,
    isEnabled: true,
    medicationRoundCode: 'MORNING',
    notes: '',
    sortOrder: 0,
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
    slotKind: 'STANDARD',
    nightDuty: 'NONE',
    slotEffectiveFrom: null,
    slotEffectiveTo: null,
    oneOffDate: null,
    allowBackfillDays: 0,
    carerAssignments: [],
    exceptions: [],
    ...overrides,
  }
}

describe('visitPlanWeeklyPlannedMinutes', () => {
  it('sums enabled weekday slots', () => {
    const minutes = visitPlanWeeklyPlannedMinutes([baseSlot()], {
      weekStartIso: '2026-06-15',
      anchorIso: '2026-06-15',
    })
    expect(minutes).toBe(5 * 60)
  })
})

describe('summarizeVisitPlanWeeklyHours', () => {
  it('flags excess when call pattern exceeds contracted hours', () => {
    const summary = summarizeVisitPlanWeeklyHours([baseSlot()], '4', {
      anchorIso: '2026-06-15',
    })
    expect(summary.contractedHours).toBe(4)
    expect(summary.plannedMinutes).toBe(300)
    expect(summary.isOverContract).toBe(true)
    expect(summary.excessMinutes).toBe(60)
  })

  it('matches when contracted equals planned', () => {
    const summary = summarizeVisitPlanWeeklyHours([baseSlot()], '5', {
      anchorIso: '2026-06-15',
    })
    expect(summary.isOverContract).toBe(false)
    expect(summary.excessMinutes).toBe(0)
  })
})
