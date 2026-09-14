import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  boardShowsCheckInMethod,
  timelineJobCheckInMethodLabel,
  timelineJobCheckInMethodTitle,
} from './schedule-job-check-in-method.util'

function job(checkIn: TimelineJob['checkIn']): TimelineJob {
  return {
    id: 'job-1',
    jobName: 'Visit',
    status: 'IN_PROGRESS',
    requiredCarers: 1,
    scheduledStartDateTime: '2026-09-14T10:00:00.000Z',
    serviceUser: { id: 'su-1', firstName: 'Harry' },
    allocations: [],
    checkIn,
  } as TimelineJob
}

describe('schedule-job-check-in-method.util', () => {
  it('reads the admin method label after clock-in', () => {
    expect(timelineJobCheckInMethodLabel(job({ method: 'MANUAL', methodLabel: 'Manual' }))).toBe(
      'Manual',
    )
    expect(timelineJobCheckInMethodLabel(job(null))).toBeNull()
  })

  it('shows next to Crit. late, and hides only for live office alerts', () => {
    expect(
      boardShowsCheckInMethod({ methodLabel: 'Manual', liveAlertCount: 0 }),
    ).toBe(true)
    expect(
      boardShowsCheckInMethod({ methodLabel: 'GPS', liveAlertCount: 1 }),
    ).toBe(false)
    expect(
      boardShowsCheckInMethod({ methodLabel: null, liveAlertCount: 0 }),
    ).toBe(false)
  })

  it('puts the manual reason on the tooltip', () => {
    expect(
      timelineJobCheckInMethodTitle(
        job({
          method: 'MANUAL',
          methodLabel: 'Manual',
          reasonLabel: 'GPS unavailable',
        }),
      ),
    ).toBe('Clock-in: Manual · GPS unavailable')
  })
})
