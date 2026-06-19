import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  computeScheduleJobOverlapLayout,
  jobsTimeOverlap,
  scheduleJobLaneTopPx,
} from '@/features/scheduling/utils/schedule-jobs-overlap-lanes.util'
import { SCHEDULE_JOBS_JOB_LANE_HEIGHT } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

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
    const a = job('a', '2026-06-15T09:00:00.000Z', '2026-06-15T10:00:00.000Z')
    const b = job('b', '2026-06-15T09:30:00.000Z', '2026-06-15T10:30:00.000Z')
    const c = job('c', '2026-06-15T11:00:00.000Z', '2026-06-15T12:00:00.000Z')
    expect(jobsTimeOverlap(a, b)).toBe(true)
    expect(jobsTimeOverlap(a, c)).toBe(false)
  })

  it('assigns separate lanes for simultaneous visits', () => {
    const jobs = [
      job('a', '2026-06-15T09:00:00.000Z', '2026-06-15T10:00:00.000Z'),
      job('b', '2026-06-15T09:00:00.000Z', '2026-06-15T10:00:00.000Z'),
      job('c', '2026-06-15T09:00:00.000Z', '2026-06-15T10:00:00.000Z'),
    ]
    const { byJobId, rowHeightPx } = computeScheduleJobOverlapLayout(jobs)
    expect(byJobId.get('a')).toMatchObject({ lane: 0, laneCount: 3, overlapCount: 3 })
    expect(byJobId.get('b')).toMatchObject({ lane: 1, laneCount: 3, overlapCount: 3 })
    expect(byJobId.get('c')).toMatchObject({ lane: 2, laneCount: 3, overlapCount: 3 })
    expect(rowHeightPx).toBeGreaterThan(56)
  })

  it('reuses a lane after a visit ends', () => {
    const jobs = [
      job('a', '2026-06-15T08:00:00.000Z', '2026-06-15T09:00:00.000Z'),
      job('b', '2026-06-15T08:30:00.000Z', '2026-06-15T09:30:00.000Z'),
      job('c', '2026-06-15T09:00:00.000Z', '2026-06-15T10:00:00.000Z'),
    ]
    const { byJobId } = computeScheduleJobOverlapLayout(jobs)
    expect(byJobId.get('a')?.lane).toBe(0)
    expect(byJobId.get('b')?.lane).toBe(1)
    expect(byJobId.get('c')?.lane).toBe(0)
    expect(byJobId.get('c')?.laneCount).toBe(2)
  })

  it('keeps default row height for non-overlapping jobs', () => {
    const jobs = [job('a', '2026-06-15T09:00:00.000Z', '2026-06-15T10:00:00.000Z')]
    const { rowHeightPx } = computeScheduleJobOverlapLayout(jobs)
    expect(rowHeightPx).toBe(56)
    expect(scheduleJobLaneTopPx(0)).toBeLessThan(SCHEDULE_JOBS_JOB_LANE_HEIGHT)
  })
})
