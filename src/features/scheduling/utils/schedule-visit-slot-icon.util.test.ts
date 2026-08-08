import { describe, expect, it } from 'vitest'
import { resolveScheduleVisitSlotPeriod } from '@/features/scheduling/utils/schedule-visit-slot-icon.util'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'

function job(
  partial: Partial<TimelineJob> & Pick<TimelineJob, 'scheduledStartDateTime'>,
): Pick<TimelineJob, 'jobName' | 'scheduledStartDateTime' | 'visitPlan' | 'visits'> {
  return {
    jobName: partial.jobName ?? 'Visit',
    scheduledStartDateTime: partial.scheduledStartDateTime,
    visitPlan: partial.visitPlan,
    visits: partial.visits,
  }
}

describe('resolveScheduleVisitSlotPeriod', () => {
  it('uses slot code when present', () => {
    expect(
      resolveScheduleVisitSlotPeriod(
        job({
          scheduledStartDateTime: '2026-08-09T15:00:00.000Z',
          visitPlan: {
            slotId: '1',
            slotCode: 'morning',
            label: 'Morning call',
            linkedCarePlanFormIds: [],
          },
        }),
      ),
    ).toBe('morning')
  })

  it('detects evening from label', () => {
    expect(
      resolveScheduleVisitSlotPeriod(
        job({
          scheduledStartDateTime: '2026-08-09T10:00:00.000Z',
          visitPlan: {
            slotId: '1',
            slotCode: 'custom',
            label: 'Evening tea',
            linkedCarePlanFormIds: [],
          },
        }),
      ),
    ).toBe('evening')
  })

  it('falls back to UTC hour band', () => {
    expect(
      resolveScheduleVisitSlotPeriod(
        job({
          scheduledStartDateTime: '2026-08-09T19:30:00.000Z',
          jobName: 'Visit',
        }),
      ),
    ).toBe('evening')
  })
})
