import { afterEach, describe, expect, it } from 'vitest'
import {
  isVisitPlanCalendarSlotOverdue,
  visitPlanCalendarOutcomeNeedsAction,
} from '@/features/service-users/visit-plan/visit-plan-calendar-overdue.util'
import { visitPlanTodayIsoDate } from '@/features/service-users/visit-plan/visit-plan-calendar-view.util'
import {
  DEFAULT_OPERATIONAL_TIMEZONE,
  syncOrganisationOperationalTimezone,
} from '@/shared/lib/operational-day.util'

afterEach(() => {
  syncOrganisationOperationalTimezone(DEFAULT_OPERATIONAL_TIMEZONE)
})

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
        now: new Date('2026-05-22T12:00:00.000Z'),
      }),
    ).toBe(true)
  })

  it('does not flag completed past visits', () => {
    expect(
      isVisitPlanCalendarSlotOverdue({
        occurrenceIso: '2020-01-01',
        plannedEndTime: '10:00',
        outcomeStatus: 'COMPLETED',
        now: new Date('2026-05-22T12:00:00.000Z'),
      }),
    ).toBe(false)
  })

  it('flags today only after the planned end time (org timezone)', () => {
    syncOrganisationOperationalTimezone('Europe/London')
    // 11:00 UTC = 12:00 BST in London on 22 May 2026
    const now = new Date('2026-05-22T11:00:00.000Z')
    const iso = visitPlanTodayIsoDate(now)
    expect(iso).toBe('2026-05-22')

    expect(
      isVisitPlanCalendarSlotOverdue({
        occurrenceIso: iso,
        plannedEndTime: '13:00',
        outcomeStatus: 'PLANNED',
        now,
      }),
    ).toBe(false)

    expect(
      isVisitPlanCalendarSlotOverdue({
        occurrenceIso: iso,
        plannedEndTime: '10:00',
        outcomeStatus: 'PLANNED',
        now,
      }),
    ).toBe(true)
  })
})
