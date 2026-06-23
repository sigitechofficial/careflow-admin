import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  computeScheduleJobOverlapLayout,
  jobsTimeOverlap,
} from '@/features/scheduling/utils/schedule-jobs-overlap-lanes.util'

function job(
  id: string,
  start: string,
  end: string,
): Pick<TimelineJob, 'id' | 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'> {
  return {
    id,
    scheduledStartDateTime: start,
    scheduledEndDateTime: end,
    durationMinutes: 60,
  }
}

describe('schedule-jobs-overlap-lanes.util', () => {
  it('detects overlapping jobs', () => {
    const a = job('a', '2026-06-21T08:00:00.000Z', '2026-06-21T09:00:00.000Z')
    const b = job('b', '2026-06-21T08:00:00.000Z', '2026-06-21T09:00:00.000Z')
    expect(jobsTimeOverlap(a, b)).toBe(true)
  })

  it('assigns separate lanes for simultaneous visits', () => {
    const jobs = [
      job('a', '2026-06-21T08:00:00.000Z', '2026-06-21T09:00:00.000Z'),
      job('b', '2026-06-21T08:00:00.000Z', '2026-06-21T09:00:00.000Z'),
      job('c', '2026-06-21T08:00:00.000Z', '2026-06-21T09:00:00.000Z'),
    ]
    const { byJobId, rowHeightPx } = computeScheduleJobOverlapLayout(jobs)
    expect(byJobId.get('a')).toMatchObject({ lane: 0, laneCount: 3, overlapCount: 3 })
    expect(byJobId.get('b')).toMatchObject({ lane: 1, laneCount: 3, overlapCount: 3 })
    expect(byJobId.get('c')).toMatchObject({ lane: 2, laneCount: 3, overlapCount: 3 })
    expect(rowHeightPx).toBeGreaterThan(56)
  })
})
