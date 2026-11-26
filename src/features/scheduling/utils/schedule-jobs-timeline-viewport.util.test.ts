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
    // Fallback Morning band covers 00:00–12:00 (no separate early-night band).
    expect(viewport!.hours).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(viewport!.hourWidth).toBe(SCHEDULE_JOBS_FOCUSED_HOUR_WIDTH)
    expect(viewport!.gridWidth).toBe(12 * SCHEDULE_JOBS_FOCUSED_HOUR_WIDTH)
  })

  it('fills provided container width when zooming a period', () => {
    const viewport = buildScheduleJobsFocusedPeriodViewport('morning', 900)!
    expect(viewport.gridWidth).toBe(900)
    expect(viewport.padRight).toBe(0)
    expect(viewport.trackWidth).toBe(900)
    expect(viewport.hourWidth).toBe(900 / 12)
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
    // 08:00–09:00 in the organisation timezone (Europe/London, BST in June).
    const job = {
      scheduledStartDateTime: '2026-06-19T07:00:00.000Z',
      scheduledEndDateTime: '2026-06-19T08:00:00.000Z',
      durationMinutes: 60,
    }
    const layout = jobBlockLayoutPxInViewport(job, viewport)
    expect(layout).not.toBeNull()
    expect(layout!.leftPx).toBe(8 * viewport.hourWidth)
    expect(layout!.widthPx).toBe(viewport.hourWidth)
  })
})
