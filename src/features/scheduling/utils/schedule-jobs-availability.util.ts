import type { EmployeeDayPattern, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  jobBlockPosition,
  minutesFromDayStart,
  SCHEDULE_JOBS_DAY_START_HOUR,
  SCHEDULE_JOBS_TIMELINE_GRID_WIDTH,
  SCHEDULE_JOBS_TIMELINE_MINUTES,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'

export type CarerAvailabilityKind = 'free' | 'booked' | 'possibly-available' | 'unavailable'

export type CarerAvailabilitySegment = {
  kind: CarerAvailabilityKind
  startMin: number
  endMin: number
}

function parseHmToTimelineMinutes(hm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hm.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

function hmFromTimelineMinutes(totalMinutesFromMidnight: number): string {
  const h = Math.floor(totalMinutesFromMidnight / 60)
  const m = totalMinutesFromMidnight % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Minutes from schedule timeline start (07:00) using wall-clock HH:mm. */
function timelineMinutesFromHm(hm: string, dayStartHour: number): number {
  const fromMidnight = parseHmToTimelineMinutes(hm)
  if (fromMidnight == null) return 0
  return Math.max(0, fromMidnight - dayStartHour * 60)
}

export function timelineMinutesToHm(minutes: number, dayStartHour: number): string {
  return hmFromTimelineMinutes(dayStartHour * 60 + minutes)
}

function mergeBookedIntervals(jobs: TimelineJob[]): Array<{ startMin: number; endMin: number }> {
  const intervals = jobs
    .map((job) => jobBlockPosition(job))
    .sort((a, b) => a.startMin - b.startMin)

  const merged: Array<{ startMin: number; endMin: number }> = []
  for (const interval of intervals) {
    const last = merged[merged.length - 1]
    if (last && interval.startMin <= last.endMin + 1) {
      last.endMin = Math.max(last.endMin, interval.endMin)
    } else {
      merged.push({ startMin: interval.startMin, endMin: interval.endMin })
    }
  }
  return merged
}

function workingWindow(
  dayPattern: EmployeeDayPattern | null | undefined,
  dayStartHour: number,
): { workStart: number; workEnd: number; unavailable: boolean; isPartial: boolean } {
  const dayEnd = SCHEDULE_JOBS_TIMELINE_MINUTES
  if (!dayPattern) {
    return { workStart: 0, workEnd: dayEnd, unavailable: false, isPartial: false }
  }
  if (!dayPattern.isAvailable) {
    return { workStart: 0, workEnd: dayEnd, unavailable: true, isPartial: false }
  }

  let workStart = 0
  let workEnd = dayEnd
  if (dayPattern.startTime) {
    workStart = Math.min(dayEnd, timelineMinutesFromHm(dayPattern.startTime, dayStartHour))
  }
  if (dayPattern.endTime) {
    workEnd = Math.max(workStart, Math.min(dayEnd, timelineMinutesFromHm(dayPattern.endTime, dayStartHour)))
  }

  return {
    workStart,
    workEnd,
    unavailable: false,
    isPartial: dayPattern.isPartial,
  }
}

export type CarerWorkingHoursCheck =
  | { ok: true }
  | { ok: false; message: string }

/** True when visit start/end fall inside the carer's working window for the day. */
export function scheduleTimesFitCarerDayPattern(
  dayPattern: EmployeeDayPattern | null | undefined,
  scheduledStartDateTime: string,
  scheduledEndDateTime: string,
  dayStartHour = SCHEDULE_JOBS_DAY_START_HOUR,
): CarerWorkingHoursCheck {
  const { workStart, workEnd, unavailable } = workingWindow(dayPattern, dayStartHour)

  if (unavailable) {
    return { ok: false, message: 'Carer is not available on this day.' }
  }

  if (!dayPattern?.startTime && !dayPattern?.endTime) {
    return { ok: true }
  }

  const startMin = minutesFromDayStart(scheduledStartDateTime, dayStartHour)
  let endMin = scheduledEndDateTime
    ? minutesFromDayStart(scheduledEndDateTime, dayStartHour)
    : startMin + 60
  if (endMin <= startMin) {
    endMin = Math.min(SCHEDULE_JOBS_TIMELINE_MINUTES, startMin + 60)
  }

  if (startMin < workStart || endMin > workEnd) {
    const range = `${timelineMinutesToHm(workStart, dayStartHour)} – ${timelineMinutesToHm(workEnd, dayStartHour)}`
    return {
      ok: false,
      message: `Visit must be within carer working hours (${range}).`,
    }
  }

  return { ok: true }
}

export function buildCarerAvailabilitySegments(
  jobs: TimelineJob[],
  dayPattern?: EmployeeDayPattern | null,
  dayStartHour = SCHEDULE_JOBS_DAY_START_HOUR,
  options?: { onHoliday?: boolean },
): CarerAvailabilitySegment[] {
  const dayEnd = SCHEDULE_JOBS_TIMELINE_MINUTES
  if (options?.onHoliday) {
    return [{ kind: 'unavailable', startMin: 0, endMin: dayEnd }]
  }

  const { workStart, workEnd, unavailable, isPartial } = workingWindow(dayPattern, dayStartHour)

  if (unavailable) {
    return [{ kind: 'unavailable', startMin: 0, endMin: dayEnd }]
  }

  const segments: CarerAvailabilitySegment[] = []
  const booked = mergeBookedIntervals(jobs)

  if (workStart > 0) {
    segments.push({ kind: 'unavailable', startMin: 0, endMin: workStart })
  }
  if (workEnd < dayEnd) {
    segments.push({ kind: 'unavailable', startMin: workEnd, endMin: dayEnd })
  }

  let cursor = workStart
  for (const block of booked) {
    if (block.endMin <= workStart || block.startMin >= workEnd) continue
    const blockStart = Math.max(workStart, block.startMin)
    const blockEnd = Math.min(workEnd, block.endMin)

    if (blockEnd > blockStart) {
      segments.push({ kind: 'booked', startMin: blockStart, endMin: blockEnd })
    }

    if (blockStart > cursor) {
      segments.push({
        kind: isPartial ? 'possibly-available' : 'free',
        startMin: cursor,
        endMin: blockStart,
      })
    }
    cursor = Math.max(cursor, blockEnd)
  }

  if (cursor < workEnd) {
    segments.push({
      kind: isPartial ? 'possibly-available' : 'free',
      startMin: cursor,
      endMin: workEnd,
    })
  }

  return segments.filter((segment) => segment.endMin > segment.startMin)
}

export function formatAvailabilitySegmentLabel(
  segment: CarerAvailabilitySegment,
  dayStartHour = SCHEDULE_JOBS_DAY_START_HOUR,
): { title: string; timeRange: string } {
  const start = timelineMinutesToHm(segment.startMin, dayStartHour)
  const end = timelineMinutesToHm(segment.endMin, dayStartHour)
  const timeRange = `${start} – ${end}`

  switch (segment.kind) {
    case 'free':
      return { title: 'Available', timeRange: `Available from ${start} to ${end}` }
    case 'booked':
      return { title: 'Booked', timeRange: `Booked from ${start} to ${end}` }
    case 'possibly-available':
      return { title: 'Possibly available', timeRange: `Possibly available from ${start} to ${end}` }
    case 'unavailable':
      return { title: 'Not available', timeRange: `Not available from ${start} to ${end}` }
  }
}

export function segmentPosition(segment: CarerAvailabilitySegment): { leftPct: number; widthPct: number } {
  const dayMinutes = SCHEDULE_JOBS_TIMELINE_MINUTES
  const leftPct = (segment.startMin / dayMinutes) * 100
  const widthPct = Math.max(((segment.endMin - segment.startMin) / dayMinutes) * 100, 0.5)
  return { leftPct, widthPct }
}

export function segmentPositionPx(segment: CarerAvailabilitySegment): { leftPx: number; widthPx: number } {
  const dayMinutes = SCHEDULE_JOBS_TIMELINE_MINUTES
  const gridWidth = SCHEDULE_JOBS_TIMELINE_GRID_WIDTH
  const leftPx = (segment.startMin / dayMinutes) * gridWidth
  const widthPx = Math.max(((segment.endMin - segment.startMin) / dayMinutes) * gridWidth, 2)
  return { leftPx, widthPx }
}

export type CarerDayAvailabilityBadgeKind = 'not-available' | 'partial'

export type CarerDayAvailabilityBadge = {
  kind: CarerDayAvailabilityBadgeKind
  /** Short label for the row badge. */
  label: string
  /** Full description for tooltips. */
  title: string
  timeRange?: string
}

export function formatDayPatternTimeRange(dayPattern: EmployeeDayPattern): string | null {
  const start = dayPattern.startTime?.trim()
  const end = dayPattern.endTime?.trim()
  if (start && end) return `${start}–${end}`
  if (start) return `from ${start}`
  if (end) return `until ${end}`
  return null
}

/** Row-label badge for working-pattern availability (leave is handled separately). */
export function resolveCarerDayAvailabilityBadge(
  dayPattern: EmployeeDayPattern | null | undefined,
  onHoliday?: boolean,
): CarerDayAvailabilityBadge | null {
  if (onHoliday) return null
  if (!dayPattern) return null

  const timeRange = formatDayPatternTimeRange(dayPattern)

  if (!dayPattern.isAvailable) {
    return {
      kind: 'not-available',
      label: 'Not available',
      title: 'Not available on this day',
    }
  }

  // "Fully" in the pattern editor = isPartial false, even when hours are bounded (e.g. 09:00–17:00).
  // Outside those hours the timeline shows grey stripes; the row label should not say "Partial".
  if (dayPattern.isPartial) {
    const title = timeRange
      ? `Partially available · ${timeRange}`
      : 'Partially available today'
    const label = timeRange ? `Partial · ${timeRange}` : 'Partially available'
    return { kind: 'partial', label, title, timeRange: timeRange ?? undefined }
  }

  return null
}
