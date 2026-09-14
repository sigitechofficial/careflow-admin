import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { isScheduleJobDeliveryResettable } from '@/features/scheduling/types/schedule-job-context-actions.types'

function job(partial: Partial<TimelineJob> & Pick<TimelineJob, 'status'>): TimelineJob {
  return {
    id: 'job-1',
    jobName: 'Visit',
    serviceUserId: 'su-1',
    requiredCarers: 1,
    scheduledStartDateTime: '2026-09-14T08:00:00.000Z',
    allocations: [],
    ...partial,
  } as TimelineJob
}

describe('isScheduleJobDeliveryResettable', () => {
  it('allows reset after clock-in or completed', () => {
    expect(isScheduleJobDeliveryResettable(job({ status: 'IN_PROGRESS' }))).toBe(true)
    expect(isScheduleJobDeliveryResettable(job({ status: 'COMPLETED' }))).toBe(true)
    expect(isScheduleJobDeliveryResettable(job({ status: 'completed' }))).toBe(true)
    expect(
      isScheduleJobDeliveryResettable(
        job({
          status: 'ALLOCATED',
          deliveryAssessment: { lifecycleStatus: 'COMPLETED' } as TimelineJob['deliveryAssessment'],
        }),
      ),
    ).toBe(true)
    expect(
      isScheduleJobDeliveryResettable(
        job({ status: 'ALLOCATED', actualStartDateTime: '2026-09-14T08:05:00.000Z' }),
      ),
    ).toBe(true)
    expect(
      isScheduleJobDeliveryResettable(
        job({ status: 'ALLOCATED', checkIn: { method: 'GPS', methodLabel: 'GPS' } }),
      ),
    ).toBe(true)
  })

  it('hides reset for cancelled or untouched planned visits', () => {
    expect(isScheduleJobDeliveryResettable(job({ status: 'CANCELLED' }))).toBe(false)
    expect(isScheduleJobDeliveryResettable(job({ status: 'ALLOCATED' }))).toBe(false)
  })
})
