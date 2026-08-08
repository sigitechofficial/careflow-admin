import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  buildScheduleListJobOverlapInfo,
  scheduleListJobHasOverlap,
} from '@/features/scheduling/utils/schedule-list-job-overlap.util'

function baseJob(
  id: string,
  serviceUserId: string,
  start: string,
  end: string,
  employeeIds: string[] = [],
): TimelineJob {
  return {
    id,
    jobName: 'Visit',
    status: 'ALLOCATED',
    serviceUserId,
    serviceUser: {
      id: serviceUserId,
      firstName: 'A',
      lastName: 'B',
    },
    scheduledStartDateTime: start,
    scheduledEndDateTime: end,
    durationMinutes: 60,
    requiredCarers: Math.max(1, employeeIds.length),
    allocations: employeeIds.map((employeeId, index) => ({
      id: `${id}-a${index}`,
      employeeId,
      status: 'ALLOCATED',
      employee: {
        id: employeeId,
        firstName: 'Carer',
        lastName: String(index + 1),
      },
    })),
  } as TimelineJob
}

describe('buildScheduleListJobOverlapInfo', () => {
  it('flags same service user overlapping visits', () => {
    const jobs = [
      baseJob('a', 'su-1', '2026-08-09T08:00:00.000Z', '2026-08-09T09:00:00.000Z'),
      baseJob('b', 'su-1', '2026-08-09T08:30:00.000Z', '2026-08-09T09:30:00.000Z'),
      baseJob('c', 'su-2', '2026-08-09T08:00:00.000Z', '2026-08-09T09:00:00.000Z'),
    ]
    const map = buildScheduleListJobOverlapInfo(jobs)
    expect(scheduleListJobHasOverlap(map.get('a'))).toBe(true)
    expect(map.get('a')?.serviceUserOverlapJobIds).toEqual(['b'])
    expect(scheduleListJobHasOverlap(map.get('c'))).toBe(false)
  })

  it('flags carer double-booking across service users', () => {
    const jobs = [
      baseJob('a', 'su-1', '2026-08-09T08:00:00.000Z', '2026-08-09T09:00:00.000Z', ['e-1']),
      baseJob('b', 'su-2', '2026-08-09T08:30:00.000Z', '2026-08-09T09:30:00.000Z', ['e-1']),
    ]
    const map = buildScheduleListJobOverlapInfo(jobs)
    expect(map.get('a')?.carerOverlapJobIds).toEqual(['b'])
    expect(map.get('b')?.carerOverlapJobIds).toEqual(['a'])
  })
})
