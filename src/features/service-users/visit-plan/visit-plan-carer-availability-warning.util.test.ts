import { describe, expect, it } from 'vitest'
import {
  carerAssignmentCoversSlotDays,
  formatCarerAvailabilityWarning,
} from '@/features/service-users/visit-plan/visit-plan-carer-availability-warning.util'
import type { VisitPlanCarerCandidate } from '@/features/service-users/visit-plan/types'

function candidate(
  partial: Partial<VisitPlanCarerCandidate> & Pick<VisitPlanCarerCandidate, 'availability'>,
): VisitPlanCarerCandidate {
  return {
    employeeId: 'emp-1',
    displayName: 'Test Carer',
    role: null,
    jobTitle: null,
    fit: 'partial',
    isPreferred: false,
    isBlocked: false,
    skills: { matched: [], missing: [] },
    complianceIssues: 0,
    warnings: [],
    ...partial,
  }
}

describe('visit-plan-carer-availability-warning.util', () => {
  it('uses all slot days when assignment is for all slot days', () => {
    expect(carerAssignmentCoversSlotDays(null, [1, 3, 5])).toEqual([1, 3, 5])
  })

  it('warns when every assigned day is unavailable (no pattern)', () => {
    const warning = formatCarerAvailabilityWarning(
      candidate({
        availability: {
          availableDays: [],
          unavailableDays: [1, 2, 3, 4, 5],
          timeWindowOk: true,
          summary: 'Unavailable Mon, Tue, Wed, Thu, Fri',
        },
      }),
      [1, 3, 5],
    )
    expect(warning).toBe('Unavailable Mon, Tue, Wed, Thu, Fri')
  })

  it('warns when visit time is outside working hours on a covered day', () => {
    const warning = formatCarerAvailabilityWarning(
      candidate({
        availability: {
          availableDays: [1, 3, 5],
          unavailableDays: [],
          timeMismatchDays: [1, 3, 5],
          timeWindowOk: false,
          summary: 'Available Mon, Wed, Fri · Visit time outside working hours on some days',
        },
      }),
      [1, 3, 5],
    )
    expect(warning).toBe('Visit time is outside working hours on some assigned days')
  })

  it('does not warn about a time mismatch on a day the carer is not assigned to', () => {
    // Carer covers only Saturday (6); the Friday (5) mismatch must not leak into the warning.
    const warning = formatCarerAvailabilityWarning(
      candidate({
        availability: {
          availableDays: [6],
          unavailableDays: [5],
          timeMismatchDays: [5],
          timeMismatchMessages: ['On Fri, your visit is 30 minutes after your working pattern (07:00–08:00)'],
          timeWindowOk: false,
          summary: 'Available Sat · On Fri, your visit is 30 minutes after your working pattern (07:00–08:00)',
        },
      }),
      [6],
    )
    expect(warning).toBeNull()
  })

  it('scopes the time-mismatch message to the covered day', () => {
    // Carer covers Fri + Sat; only the Saturday message should surface, not Friday's.
    const warning = formatCarerAvailabilityWarning(
      candidate({
        availability: {
          availableDays: [6],
          unavailableDays: [5],
          timeMismatchDays: [5, 6],
          timeMismatchMessages: [
            'On Fri, your visit is 30 minutes after your working pattern (07:00–08:00)',
            'On Sat, your visit is 15 minutes before your working pattern (09:00–17:00)',
          ],
          timeWindowOk: false,
          summary: 'Available Sat',
        },
      }),
      [6],
    )
    expect(warning).toBe('On Sat, your visit is 15 minutes before your working pattern (09:00–17:00)')
  })

  it('warns for partial day mismatch', () => {
    const warning = formatCarerAvailabilityWarning(
      candidate({
        availability: {
          availableDays: [1, 5],
          unavailableDays: [3],
          timeWindowOk: true,
          summary: 'Available Mon, Fri · Unavailable Wed',
        },
      }),
      [1, 3, 5],
    )
    expect(warning).toBe('Not available on assigned days: Wed')
  })
})
