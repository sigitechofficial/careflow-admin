import { describe, expect, it } from 'vitest'
import {
  buildScheduleJobsFocusedPeriodViewport,
  buildScheduleJobsFullDayViewport,
  jobBlockLayoutPxInViewport,
  jobOverlapsViewport,
  resolveScheduleJobsTimelineViewport,
  SCHEDULE_JOBS_FOCUSED_HOUR_WIDTH,
} from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'

describe('schedule-jobs-timeline-viewport.util', () => {
  it('builds full-day viewport with 24 hours', () => {
    const viewport = buildScheduleJobsFullDayViewport()
    expect(viewport.mode).toBe('full-day')
    expect(viewport.hours).toHaveLength(24)
    expect(viewport.bands.length).toBeGreaterThan(1)
  })

  it('builds focused morning viewport with wider hours', () => {
    const viewport = buildScheduleJobsFocusedPeriodViewport('morning')
    expect(viewport).not.toBeNull()
    expect(viewport!.mode).toBe('focused-period')
    expect(viewport!.bandId).toBe('morning')
    expect(viewport!.hours).toEqual([6, 7, 8, 9, 10, 11])
    expect(viewport!.hourWidth).toBe(SCHEDULE_JOBS_FOCUSED_HOUR_WIDTH)
    expect(viewport!.gridWidth).toBe(6 * SCHEDULE_JOBS_FOCUSED_HOUR_WIDTH)
  })

  it('fills provided container width when zooming a period', () => {
    const viewport = buildScheduleJobsFocusedPeriodViewport('morning', 900)!
    expect(viewport.gridWidth).toBe(900)
    expect(viewport.padRight).toBe(0)
    expect(viewport.trackWidth).toBe(900)
    expect(viewport.hourWidth).toBe(150)
  })

  it('resolveScheduleJobsTimelineViewport falls back to full day for unknown band', () => {
    const viewport = resolveScheduleJobsTimelineViewport('not-a-band')
    expect(viewport.mode).toBe('full-day')
  })

  it('jobOverlapsViewport excludes jobs outside focused band', () => {
    const viewport = buildScheduleJobsFocusedPeriodViewport('morning')!
    const job = {
      scheduledStartDateTime: '2026-06-19T13:00:00.000Z',
      scheduledEndDateTime: '2026-06-19T14:00:00.000Z',
      durationMinutes: 60,
    }
    expect(jobOverlapsViewport(job, viewport)).toBe(false)
  })

  it('jobBlockLayoutPxInViewport maps morning job from zero in focused view', () => {
    const viewport = buildScheduleJobsFocusedPeriodViewport('morning')!
    const job = {
      scheduledStartDateTime: '2026-06-19T08:00:00.000Z',
      scheduledEndDateTime: '2026-06-19T09:00:00.000Z',
      durationMinutes: 60,
    }
    const layout = jobBlockLayoutPxInViewport(job, viewport)
    expect(layout).not.toBeNull()
    expect(layout!.leftPx).toBe(2 * viewport.hourWidth)
    expect(layout!.widthPx).toBe(viewport.hourWidth)
  })
})
