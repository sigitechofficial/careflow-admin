import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  jobEndMinutes,
  minutesFromDayStart,
  SCHEDULE_JOBS_DAY_PERIOD_BANDS,
  SCHEDULE_JOBS_HOUR_WIDTH,
  SCHEDULE_JOBS_JOB_MIN_CLICK_WIDTH,
  SCHEDULE_JOBS_TIMELINE_GRID_WIDTH,
  SCHEDULE_JOBS_TIMELINE_MINUTES,
  SCHEDULE_JOBS_TIMELINE_PAD_RIGHT,
  SCHEDULE_JOBS_TIMELINE_TRACK_WIDTH,
  scheduleJobsHourLabels,
  scheduleJobsPeriodBandForHour,
  type ScheduleJobsDayPeriodBand,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import type { JobBlockLayoutPx } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

/** Wider hour columns when a call period is zoomed in. */
export const SCHEDULE_JOBS_FOCUSED_HOUR_WIDTH = 112
export const SCHEDULE_JOBS_FOCUSED_PAD_RIGHT = 40

export type ScheduleJobsTimelineViewport = {
  mode: 'full-day' | 'focused-period'
  bandId: string | null
  band: ScheduleJobsDayPeriodBand | null
  startMinute: number
  endMinute: number
  spanMinutes: number
  hourWidth: number
  gridWidth: number
  padRight: number
  trackWidth: number
  hours: number[]
  bands: ScheduleJobsDayPeriodBand[]
}

export function findScheduleJobsPeriodBand(bandId: string): ScheduleJobsDayPeriodBand | undefined {
  return SCHEDULE_JOBS_DAY_PERIOD_BANDS.find((band) => band.id === bandId)
}

export function buildScheduleJobsFullDayViewport(): ScheduleJobsTimelineViewport {
  return {
    mode: 'full-day',
    bandId: null,
    band: null,
    startMinute: 0,
    endMinute: SCHEDULE_JOBS_TIMELINE_MINUTES,
    spanMinutes: SCHEDULE_JOBS_TIMELINE_MINUTES,
    hourWidth: SCHEDULE_JOBS_HOUR_WIDTH,
    gridWidth: SCHEDULE_JOBS_TIMELINE_GRID_WIDTH,
    padRight: SCHEDULE_JOBS_TIMELINE_PAD_RIGHT,
    trackWidth: SCHEDULE_JOBS_TIMELINE_TRACK_WIDTH,
    hours: scheduleJobsHourLabels(),
    bands: SCHEDULE_JOBS_DAY_PERIOD_BANDS,
  }
}

export function buildScheduleJobsFocusedPeriodViewport(
  bandId: string,
  timelineGridWidthPx?: number,
): ScheduleJobsTimelineViewport | null {
  const band = findScheduleJobsPeriodBand(bandId)
  if (!band) return null

  const startMinute = band.startHour * 60
  const endMinute = band.endHour * 60
  const spanMinutes = endMinute - startMinute
  const hourCount = band.endHour - band.startHour
  const fillContainer = timelineGridWidthPx != null && timelineGridWidthPx > 0
  const gridWidth = fillContainer
    ? timelineGridWidthPx
    : hourCount * SCHEDULE_JOBS_FOCUSED_HOUR_WIDTH
  const hourWidth = gridWidth / hourCount
  const padRight = fillContainer ? 0 : SCHEDULE_JOBS_FOCUSED_PAD_RIGHT

  return {
    mode: 'focused-period',
    bandId: band.id,
    band,
    startMinute,
    endMinute,
    spanMinutes,
    hourWidth,
    gridWidth,
    padRight,
    trackWidth: gridWidth + padRight,
    hours: Array.from({ length: hourCount }, (_, index) => band.startHour + index),
    bands: [band],
  }
}

export function resolveScheduleJobsTimelineViewport(
  focusedPeriodBandId: string | null,
  focusedTimelineGridWidthPx?: number,
): ScheduleJobsTimelineViewport {
  if (focusedPeriodBandId) {
    return (
      buildScheduleJobsFocusedPeriodViewport(focusedPeriodBandId, focusedTimelineGridWidthPx) ??
      buildScheduleJobsFullDayViewport()
    )
  }
  return buildScheduleJobsFullDayViewport()
}

export function jobOverlapsViewport(
  job: Pick<TimelineJob, 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'>,
  viewport: ScheduleJobsTimelineViewport,
): boolean {
  const startMin = minutesFromDayStart(job.scheduledStartDateTime)
  const endMin = Math.min(SCHEDULE_JOBS_TIMELINE_MINUTES, Math.max(startMin + 5, jobEndMinutes(job)))
  return endMin > viewport.startMinute && startMin < viewport.endMinute
}

export function jobBlockLayoutPxInViewport(
  job: Pick<TimelineJob, 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'>,
  viewport: ScheduleJobsTimelineViewport,
): JobBlockLayoutPx | null {
  if (!jobOverlapsViewport(job, viewport)) return null

  const startMin = minutesFromDayStart(job.scheduledStartDateTime)
  const endMin = Math.min(SCHEDULE_JOBS_TIMELINE_MINUTES, Math.max(startMin + 5, jobEndMinutes(job)))
  const visStart = Math.max(startMin, viewport.startMinute)
  const visEnd = Math.min(endMin, viewport.endMinute)
  const leftPx = ((visStart - viewport.startMinute) / viewport.spanMinutes) * viewport.gridWidth
  const durationPx = ((visEnd - visStart) / viewport.spanMinutes) * viewport.gridWidth
  const widthPx = Math.min(
    Math.max(durationPx, SCHEDULE_JOBS_JOB_MIN_CLICK_WIDTH),
    Math.max(SCHEDULE_JOBS_JOB_MIN_CLICK_WIDTH, viewport.trackWidth - leftPx),
  )

  return { leftPx, widthPx, startMin, endMin }
}

export function segmentPositionPxInViewport(
  segment: { startMin: number; endMin: number },
  viewport: ScheduleJobsTimelineViewport,
): { leftPx: number; widthPx: number } | null {
  const visStart = Math.max(segment.startMin, viewport.startMinute)
  const visEnd = Math.min(segment.endMin, viewport.endMinute)
  if (visEnd <= visStart) return null

  const leftPx = ((visStart - viewport.startMinute) / viewport.spanMinutes) * viewport.gridWidth
  const widthPx = Math.max(((visEnd - visStart) / viewport.spanMinutes) * viewport.gridWidth, 2)
  return { leftPx, widthPx }
}

export function scheduleJobsPeriodBandForViewportHour(
  hour: number,
  viewport: ScheduleJobsTimelineViewport,
): ScheduleJobsDayPeriodBand {
  if (viewport.mode === 'focused-period' && viewport.band) {
    return viewport.band
  }
  return scheduleJobsPeriodBandForHour(hour)
}
