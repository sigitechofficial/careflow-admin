import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  jobDurationMinutes,
  minutesFromDayStart,
  SCHEDULE_JOBS_DAY_START_HOUR,
  SCHEDULE_JOBS_SNAP_MINUTES,
  SCHEDULE_JOBS_TIMELINE_MINUTES,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'

export type ScheduleJobsRowRef =
  | { kind: 'unassigned' }
  | { kind: 'carer'; employeeId: string }

export function scheduleJobsRowKey(row: ScheduleJobsRowRef): string {
  return row.kind === 'unassigned' ? 'unassigned' : `carer:${row.employeeId}`
}

export function parseScheduleJobsRowKey(key: string | null): ScheduleJobsRowRef | null {
  if (!key) return null
  if (key === 'unassigned') return { kind: 'unassigned' }
  if (key.startsWith('carer:')) return { kind: 'carer', employeeId: key.slice(6) }
  return null
}

export function snapTimelineMinutes(minutes: number): number {
  return Math.round(minutes / SCHEDULE_JOBS_SNAP_MINUTES) * SCHEDULE_JOBS_SNAP_MINUTES
}

export function dateTimeFromScheduleMinutes(dateIso: string, minutesFromTimelineStart: number): string {
  const totalMin = SCHEDULE_JOBS_DAY_START_HOUR * 60 + minutesFromTimelineStart
  const h = Math.floor(totalMin / 60) % 24
  const m = totalMin % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  const d = new Date(`${dateIso}T${pad(h)}:${pad(m)}:00.000Z`)
  return d.toISOString()
}

export function jobScheduleDateIso(job: Pick<TimelineJob, 'scheduledStartDateTime'>): string {
  const d = new Date(job.scheduledStartDateTime)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** HH:mm from ISO using UTC wall clock (matches visit plan + backend schedule generation). */
export function isoToLocalTimeInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

export function buildJobScheduleDateTimes(
  dateIso: string,
  startTime: string,
  endTime: string,
): { scheduledStartDateTime: string; scheduledEndDateTime: string } | null {
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return null
  const start = new Date(`${dateIso}T${startTime}:00.000Z`)
  let end = new Date(`${dateIso}T${endTime}:00.000Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
  if (end.getTime() - start.getTime() < 5 * 60 * 1000) return null
  return {
    scheduledStartDateTime: start.toISOString(),
    scheduledEndDateTime: end.toISOString(),
  }
}

export function shiftJobScheduleTimes(
  job: TimelineJob,
  date: string,
  deltaMinutes: number,
): { scheduledStartDateTime: string; scheduledEndDateTime: string } {
  const duration = jobDurationMinutes(job)
  const currentStart = minutesFromDayStart(job.scheduledStartDateTime)
  const maxStart = Math.max(0, SCHEDULE_JOBS_TIMELINE_MINUTES - duration)
  const nextStart = snapTimelineMinutes(Math.min(maxStart, Math.max(0, currentStart + deltaMinutes)))
  const nextEnd = nextStart + duration

  return {
    scheduledStartDateTime: dateTimeFromScheduleMinutes(date, nextStart),
    scheduledEndDateTime: dateTimeFromScheduleMinutes(date, nextEnd),
  }
}

export function pixelsToTimelineMinutes(deltaPx: number, trackWidthPx: number): number {
  if (trackWidthPx <= 0) return 0
  return (deltaPx / trackWidthPx) * SCHEDULE_JOBS_TIMELINE_MINUTES
}

/** Apply a pixel drag offset to a job block layout (unsnapped — for live drag preview). */
export function jobBlockLayoutPxWithDragOffset(
  baseLeftPx: number,
  baseWidthPx: number,
  deltaPx: number,
  gridWidthPx: number,
): { leftPx: number; widthPx: number } {
  const maxLeft = Math.max(0, gridWidthPx - baseWidthPx)
  return {
    leftPx: Math.min(maxLeft, Math.max(0, baseLeftPx + deltaPx)),
    widthPx: baseWidthPx,
  }
}

export function shiftJobScheduleTimesFromDeltaPx(
  job: TimelineJob,
  date: string,
  deltaPx: number,
  trackWidthPx: number,
): { scheduledStartDateTime: string; scheduledEndDateTime: string } {
  const deltaMinutes = pixelsToTimelineMinutes(deltaPx, trackWidthPx)
  return shiftJobScheduleTimes(job, date, deltaMinutes)
}

export type JobDropPayload = {
  job: TimelineJob
  sourceRow: ScheduleJobsRowRef
  targetRow: ScheduleJobsRowRef
  scheduledStartDateTime: string
  scheduledEndDateTime: string
}

export function scheduleTimesChanged(
  job: TimelineJob,
  next: { scheduledStartDateTime: string; scheduledEndDateTime: string },
): boolean {
  return (
    job.scheduledStartDateTime !== next.scheduledStartDateTime ||
    (job.scheduledEndDateTime ?? '') !== next.scheduledEndDateTime
  )
}

export function rowsEqual(a: ScheduleJobsRowRef, b: ScheduleJobsRowRef): boolean {
  return scheduleJobsRowKey(a) === scheduleJobsRowKey(b)
}

/** Pick the row whose vertical centre is closest to the pointer. */
export function pickClosestScheduleJobsRowKey(
  clientY: number,
  rows: Array<{ key: string; top: number; height: number }>,
): string | null {
  if (rows.length === 0) return null

  let bestKey: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const row of rows) {
    if (row.height <= 0) continue
    const centerY = row.top + row.height / 2
    const distance = Math.abs(clientY - centerY)
    if (distance < bestDistance) {
      bestDistance = distance
      bestKey = row.key
    }
  }

  return bestKey
}

/** Pick the gantt row whose vertical centre is nearest the pointer. */
export function resolveScheduleJobsRowKeyAtPoint(
  clientY: number,
  root: ParentNode | null = document.querySelector('[data-schedule-jobs-board]'),
): string | null {
  if (!root) return null

  const rows = [...root.querySelectorAll<HTMLElement>('[data-schedule-row-id]')].map((row) => {
    const rect = row.getBoundingClientRect()
    return {
      key: row.dataset.scheduleRowId ?? '',
      top: rect.top,
      height: rect.height,
    }
  }).filter((row) => row.key)

  return pickClosestScheduleJobsRowKey(clientY, rows)
}
