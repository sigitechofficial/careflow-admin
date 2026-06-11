import { describe, expect, it } from 'vitest'
import {
  isVisitPlanCalendarSlotOverdue,
  visitPlanCalendarOutcomeNeedsAction,
} from '@/features/service-users/visit-plan/visit-plan-calendar-overdue.util'

describe('visitPlanCalendarOutcomeNeedsAction', () => {
  it('treats planned visits as needing action', () => {
    expect(visitPlanCalendarOutcomeNeedsAction('PLANNED')).toBe(true)
    expect(visitPlanCalendarOutcomeNeedsAction('NOT_GENERATED')).toBe(true)
  })

  it('treats recorded outcomes as resolved', () => {
    expect(visitPlanCalendarOutcomeNeedsAction('COMPLETED')).toBe(false)
    expect(visitPlanCalendarOutcomeNeedsAction('MISSED')).toBe(false)
  })
})

describe('isVisitPlanCalendarSlotOverdue', () => {
  it('flags past planned visits with no outcome', () => {
    expect(
      isVisitPlanCalendarSlotOverdue({
        occurrenceIso: '2020-01-01',
        plannedEndTime: '10:00',
        outcomeStatus: 'PLANNED',
        now: new Date('2026-05-22T12:00:00'),
      }),
    ).toBe(true)
  })

  it('does not flag completed past visits', () => {
    expect(
      isVisitPlanCalendarSlotOverdue({
        occurrenceIso: '2020-01-01',
        plannedEndTime: '10:00',
        outcomeStatus: 'COMPLETED',
        now: new Date('2026-05-22T12:00:00'),
      }),
    ).toBe(false)
  })

  it('flags today only after the planned end time', () => {
    const today = new Date()
    const y = today.getUTCFullYear()
    const m = String(today.getUTCMonth() + 1).padStart(2, '0')
    const d = String(today.getUTCDate()).padStart(2, '0')
    const iso = `${y}-${m}-${d}`

    expect(
      isVisitPlanCalendarSlotOverdue({
        occurrenceIso: iso,
        plannedEndTime: '23:59',
        outcomeStatus: 'PLANNED',
        now: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, 0),
      }),
    ).toBe(false)

    expect(
      isVisitPlanCalendarSlotOverdue({
        occurrenceIso: iso,
        plannedEndTime: '08:00',
        outcomeStatus: 'PLANNED',
        now: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0),
      }),
    ).toBe(true)
  })
})
