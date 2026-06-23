import { describe, expect, it } from 'vitest'
import type { ServiceUserVisitPlan, VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import {
  formatVisitPlanStatusLabel,
  resolveEditableVisitPlan,
  sortVisitPlanVersions,
  summarizeVisitPlanDailyCalls,
  visitPlanCallsOnWeekday,
  visitPlanEnabledSlots,
} from '@/features/service-users/visit-plan/visit-plan-version.util'

function slot(partial: Partial<VisitPlanSlot> & Pick<VisitPlanSlot, 'slotCode' | 'label'>): VisitPlanSlot {
  return {
    slotCode: partial.slotCode,
    label: partial.label,
    daysOfWeek: partial.daysOfWeek ?? [1, 2, 3, 4, 5],
    plannedStartTime: partial.plannedStartTime ?? '09:00',
    plannedEndTime: partial.plannedEndTime ?? '10:00',
    requiredCarers: partial.requiredCarers ?? 1,
    isEnabled: partial.isEnabled ?? true,
    medicationRoundCode: null,
    notes: '',
    sortOrder: 0,
    scheduleFrequency: 'WEEKLY',
    repeatEvery: 1,
    repeatUnit: 'WEEKS',
    timeCritical: false,
    timeToleranceMinutes: 0,
    durationMinutes: 60,
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
    slotEffectiveFrom: null,
    slotEffectiveTo: null,
    oneOffDate: null,
    allowBackfillDays: 0,
    carerAssignments: [],
    exceptions: [],
  }
}

function plan(slots: VisitPlanSlot[]): ServiceUserVisitPlan {
  return {
    id: 'plan-1',
    serviceUserId: 'su-1',
    status: 'ACTIVE',
    effectiveFrom: '2026-01-06T00:00:00.000Z',
    effectiveTo: null,
    weeklyContractedHours: '10',
    numberOfCarers: 1,
    sourceSubmissionId: null,
    reviewDueAt: null,
    notes: '',
    respectWorkingPatternOnSync: true,
    approvedAt: null,
    approvedById: null,
    suspendedAt: null,
    suspendedById: null,
    pauseReasonCatalogId: null,
    pauseReasonCatalog: null,
    expectedResumeAt: null,
    suspensionReviewDueAt: null,
    suspensionContingencyNotes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    slots,
    amendments: [],
    statusEvents: [],
  }
}

describe('visit-plan-version.util', () => {
  it('counts enabled slots on a weekday', () => {
    const slots = [
      slot({ slotCode: 'a', label: 'Morning' }),
      slot({ slotCode: 'b', label: 'Lunch' }),
      slot({ slotCode: 'c', label: 'Evening', isEnabled: false }),
    ]
    expect(visitPlanEnabledSlots(slots).length).toBe(2)
    expect(visitPlanCallsOnWeekday(slots, 3, '2026-01-06')).toBe(2)
  })

  it('summarizes weekday call count', () => {
    const summary = summarizeVisitPlanDailyCalls(
      plan([
        slot({ slotCode: 'a', label: 'Morning' }),
        slot({ slotCode: 'b', label: 'Lunch' }),
        slot({ slotCode: 'c', label: 'Evening' }),
      ]),
    )
    expect(summary).toBe('3 calls per weekday')
  })

  it('sorts ended plans by most recently ended first', () => {
    const older = plan([slot({ slotCode: 'a', label: 'Morning' })])
    older.id = 'older'
    older.status = 'ENDED'
    older.effectiveFrom = '2024-01-01T00:00:00.000Z'
    older.effectiveTo = '2024-06-01T00:00:00.000Z'

    const newer = plan([slot({ slotCode: 'a', label: 'Morning' }), slot({ slotCode: 'b', label: 'Lunch' })])
    newer.id = 'newer'
    newer.status = 'ENDED'
    newer.effectiveFrom = '2024-06-02T00:00:00.000Z'
    newer.effectiveTo = '2026-06-01T00:00:00.000Z'

    const sorted = sortVisitPlanVersions([older, newer])
    expect(sorted.map((p) => p.id)).toEqual(['newer', 'older'])
    expect(formatVisitPlanStatusLabel(newer, [older, newer])).toBe('ENDED (most recent)')
    expect(formatVisitPlanStatusLabel(older, [older, newer])).toBe('ENDED (oldest)')
  })

  it('resolveEditableVisitPlan prefers active, then suspended, then draft', () => {
    const suspended = plan([slot({ slotCode: 'a', label: 'Morning' })])
    suspended.id = 'suspended'
    suspended.status = 'SUSPENDED'

    const draft = plan([slot({ slotCode: 'a', label: 'Morning' })])
    draft.id = 'draft'
    draft.status = 'DRAFT'

    const active = plan([slot({ slotCode: 'a', label: 'Morning' })])

    expect(resolveEditableVisitPlan([suspended, draft], null)).toEqual(suspended)
    expect(resolveEditableVisitPlan([draft], null)).toEqual(draft)
    expect(resolveEditableVisitPlan([suspended, draft], active)).toEqual(suspended)
    expect(resolveEditableVisitPlan([suspended, draft], null, 'draft')).toEqual(draft)
    expect(resolveEditableVisitPlan([], active, undefined, true)).toBeNull()
  })
})
