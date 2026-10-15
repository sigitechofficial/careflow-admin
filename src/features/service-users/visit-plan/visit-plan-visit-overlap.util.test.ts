import { describe, expect, it } from 'vitest'
import { findVisitPlanVisitOverlap, formatVisitPlanWeekdays } from './visit-plan-visit-overlap.util'

const visit = (over: Record<string, unknown>) => ({
  slotCode: 'MORNING',
  label: 'Morning',
  isEnabled: true,
  daysOfWeek: [1, 2, 3, 4, 5],
  plannedStartTime: '07:00',
  plannedEndTime: '08:00',
  scheduleFrequency: 'DAILY' as const,
  slotKind: 'STANDARD' as const,
  slotEffectiveFrom: null,
  slotEffectiveTo: null,
  ...over,
})

describe('findVisitPlanVisitOverlap', () => {
  it('finds a visit at the same time on a shared weekday', () => {
    const second = visit({ slotCode: 'MORNING__2', plannedStartTime: '07:30', plannedEndTime: '08:30', daysOfWeek: [5, 6] })
    const hit = findVisitPlanVisitOverlap(second, [visit({})])
    expect(hit?.other.slotCode).toBe('MORNING')
    expect(hit?.days).toEqual([5])
  })

  it('allows back-to-back visits and visits on different days', () => {
    expect(findVisitPlanVisitOverlap(visit({ slotCode: 'MORNING__2', plannedStartTime: '08:00', plannedEndTime: '09:00' }), [visit({})])).toBeNull()
    expect(findVisitPlanVisitOverlap(visit({ slotCode: 'MORNING__2', daysOfWeek: [6, 0] }), [visit({})])).toBeNull()
  })

  it('ignores switched-off visits, the visit itself, and visits whose dates never meet', () => {
    expect(findVisitPlanVisitOverlap(visit({ slotCode: 'MORNING__2' }), [visit({ isEnabled: false })])).toBeNull()
    expect(findVisitPlanVisitOverlap(visit({}), [visit({})])).toBeNull()
    expect(
      findVisitPlanVisitOverlap(visit({ slotCode: 'MORNING__2', slotEffectiveFrom: '2026-11-01' }), [
        visit({ slotEffectiveTo: '2026-10-31' }),
      ]),
    ).toBeNull()
  })

  it('treats a visit ending after midnight as running to the end of the day', () => {
    const night = visit({ slotCode: 'NIGHT', plannedStartTime: '22:00', plannedEndTime: '07:00' })
    expect(findVisitPlanVisitOverlap(visit({ slotCode: 'EVENING', plannedStartTime: '23:00', plannedEndTime: '23:30' }), [night])).not.toBeNull()
  })

  it('does not compare monthly or one-off visits', () => {
    expect(findVisitPlanVisitOverlap(visit({ slotCode: 'MORNING__2', scheduleFrequency: 'MONTHLY' }), [visit({})])).toBeNull()
  })
})

describe('formatVisitPlanWeekdays', () => {
  it('lists days Monday first', () => {
    expect(formatVisitPlanWeekdays([0, 1, 5])).toBe('Mon, Fri, Sun')
    expect(formatVisitPlanWeekdays([0, 1, 2, 3, 4, 5, 6])).toBe('every day')
  })

  it('catches a clash with the morning after an overnight visit', () => {
    const night = visit({ slotCode: 'NIGHT', label: 'Night', daysOfWeek: [1], plannedStartTime: '20:00', plannedEndTime: '07:00' })
    const tuesdayMorning = visit({ slotCode: 'MORNING', label: 'Morning', daysOfWeek: [2], plannedStartTime: '06:30', plannedEndTime: '07:30' })
    const mondayMorning = visit({ slotCode: 'MORNING', label: 'Morning', daysOfWeek: [1], plannedStartTime: '06:30', plannedEndTime: '07:30' })
    const tuesdayLate = visit({ slotCode: 'MORNING', label: 'Morning', daysOfWeek: [2], plannedStartTime: '07:00', plannedEndTime: '08:00' })
    expect(findVisitPlanVisitOverlap(night, [tuesdayMorning])?.days).toEqual([1])
    expect(findVisitPlanVisitOverlap(tuesdayMorning, [night])?.days).toEqual([2])
    expect(findVisitPlanVisitOverlap(night, [mondayMorning])).toBeNull()
    expect(findVisitPlanVisitOverlap(night, [tuesdayLate])).toBeNull()
  })
})
