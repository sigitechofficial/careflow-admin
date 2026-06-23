import { describe, expect, it } from 'vitest'
import {
  resolveVisitPlanCalendarCarerAllocation,
  visitPlanCalendarEffectiveOutcomeStatus,
} from '@/features/service-users/visit-plan/visit-plan-calendar-carer-allocation.util'
import type { VisitPlanCalendarVisit } from '@/features/service-users/visit-plan/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'

const slot = {
  id: 'slot-1',
  slotCode: 'MORNING',
  label: 'Morning',
  sortOrder: 0,
  isEnabled: true,
  requiredCarers: 1,
  assignedEmployeeIds: ['emp-1'],
  daysOfWeek: [3],
  plannedStartTime: '07:00',
  plannedEndTime: '10:00',
  durationMinutes: 180,
  timeCritical: false,
  timeToleranceMinutes: 0,
  linkedCarePlanFormIds: [],
  carerAssignments: [],
} as unknown as VisitPlanSlot

const outcome: VisitPlanCalendarVisit = {
  id: 'visit-1',
  visitPlanSlotId: 'slot-1',
  status: 'PLANNED',
  displayStatus: 'NEEDS_ATTENTION',
  requiredCarers: 1,
  allocatedCount: 0,
  allocatedEmployeeIds: [],
  notes: null,
  scheduledStartDateTime: '2026-06-24T07:00:00.000Z',
  scheduledEndDateTime: '2026-06-24T10:00:00.000Z',
  occurrenceDate: '2026-06-24',
}

describe('visit-plan-calendar-carer-allocation.util', () => {
  it('counts visit-plan slot carers when rota allocation is zero', () => {
    const result = resolveVisitPlanCalendarCarerAllocation({
      outcome,
      slot,
      carerNames: ['Tufail Khan'],
    })
    expect(result.carersAllocated).toBe(1)
    expect(result.carersRequired).toBe(1)
    expect(result.understaffed).toBe(false)
  })

  it('prefers rota allocation count when carers are on the schedule', () => {
    const result = resolveVisitPlanCalendarCarerAllocation({
      outcome: {
        ...outcome,
        allocatedCount: 1,
        allocatedEmployeeIds: ['emp-1'],
        displayStatus: 'PLANNED',
      },
      slot,
      carerNames: ['Tufail Khan'],
    })
    expect(result.carersAllocated).toBe(1)
    expect(result.understaffed).toBe(false)
  })

  it('shows planned when visit-plan carers satisfy required count', () => {
    const status = visitPlanCalendarEffectiveOutcomeStatus({
      outcome,
      slot,
      carerNames: ['Tufail Khan'],
    })
    expect(status).toBe('PLANNED')
  })
})
