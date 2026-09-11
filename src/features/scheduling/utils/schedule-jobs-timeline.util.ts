import type { EmployeeBrief, EmployeeDayRow, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { isScheduleJobCancelled, isScheduleJobCareNotDelivered } from '@/features/scheduling/types/schedule-job-context-actions.types'
import { activeJobAllocationCount } from '@/features/scheduling/utils/scheduling-format'
import {
  formatDisplayDateLong,
  formatDisplayDateShort,
  formatDisplayHourLabel,
  formatDisplayPeriodRange,
  formatDisplayWeekdayShort,
  type DateDisplayFormat,
  type TimeDisplayFormat,
} from '@/shared/lib/display-format.util'
import { formatOpsHm, minutesFromOperationalDayStart } from '@/shared/lib/operational-day.util'

export const SCHEDULE_JOBS_DAY_START_HOUR = 0
export const SCHEDULE_JOBS_DAY_END_HOUR = 24
export const SCHEDULE_JOBS_ROW_HEIGHT = 64
export const SCHEDULE_JOBS_JOB_LANE_HEIGHT = 40
/** Taller overlap lane when rota board shows icons / name / run on separate lines. */
export const SCHEDULE_JOBS_JOB_LANE_HEIGHT_RUNS_BOARD = 56
export const SCHEDULE_JOBS_ROW_LANE_GAP = 2
export const SCHEDULE_JOBS_ROW_VERTICAL_PAD = 4
export const SCHEDULE_JOBS_CARER_COL_WIDTH = 260
/** Pixels per hour on the 24h grid. */
export const SCHEDULE_JOBS_HOUR_WIDTH = 64
/** Extra space after 24:00 so end-of-day job labels are not clipped. */
export const SCHEDULE_JOBS_TIMELINE_PAD_RIGHT = 180
/** Minimum click target for very short visits (does not stretch timeline past duration). */
export const SCHEDULE_JOBS_JOB_MIN_CLICK_WIDTH = 32
/** @deprecated Timeline width is duration-based; kept for tests/tooling that referenced the old floor. */
export const SCHEDULE_JOBS_JOB_MIN_WIDTH = 128

export const SCHEDULE_JOBS_TIMELINE_MINUTES = SCHEDULE_JOBS_DAY_END_HOUR * 60
export const SCHEDULE_JOBS_TIMELINE_HOURS = SCHEDULE_JOBS_DAY_END_HOUR

export const SCHEDULE_JOBS_TIMELINE_GRID_WIDTH =
  SCHEDULE_JOBS_TIMELINE_HOURS * SCHEDULE_JOBS_HOUR_WIDTH

export const SCHEDULE_JOBS_TIMELINE_TRACK_WIDTH =
  SCHEDULE_JOBS_TIMELINE_GRID_WIDTH + SCHEDULE_JOBS_TIMELINE_PAD_RIGHT

/** @deprecated Use SCHEDULE_JOBS_TIMELINE_TRACK_WIDTH */
export const SCHEDULE_JOBS_TIMELINE_TOTAL_WIDTH = SCHEDULE_JOBS_TIMELINE_TRACK_WIDTH

export const SCHEDULE_JOBS_SNAP_MINUTES = 15

export function employeeBriefDisplayName(employee: EmployeeBrief): string {
  const first = employee.firstName?.trim() ?? ''
  const last = employee.lastName?.trim() ?? ''
  const full = [first, last].filter(Boolean).join(' ').trim()
  if (!full) return 'Unknown carer'
  if (last.length > 24) return `${first} ${last.slice(0, 20)}…`
  return full
}

export function employeeBriefFullName(employee: EmployeeBrief): string {
  return [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim() || 'Unknown carer'
}

export function employeeBriefRoleLabel(employee: EmployeeBrief): string {
  const role = employee.role?.name?.trim()
  const jobTitle = employee.jobTitle?.name?.trim()
  if (role && jobTitle && role.toLowerCase() !== jobTitle.toLowerCase()) {
    return `${role} · ${jobTitle}`
  }
  return role ?? jobTitle ?? 'Available'
}

/** Disambiguate rows when multiple carers share the same display name. */
export function employeeBriefRowLabel(
  employee: EmployeeBrief,
  duplicateDisplayName: boolean,
): { label: string; subtitle: string } {
  const display = employeeBriefDisplayName(employee)
  const role = employeeBriefRoleLabel(employee)
  if (!duplicateDisplayName) {
    return { label: display, subtitle: role }
  }
  return {
    label: `${display} — ${role}`,
    subtitle: role,
  }
}

export function employeeBriefDuplicateNameIds(rows: EmployeeDayRow[]): Set<string> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const display = employeeBriefDisplayName(row.employee)
    counts.set(display, (counts.get(display) ?? 0) + 1)
  }
  const duplicateDisplays = new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name),
  )
  return new Set(
    rows
      .filter((row) => duplicateDisplays.has(employeeBriefDisplayName(row.employee)))
      .map((row) => row.employee.id),
  )
}

export type ScheduleJobsBoard = {
  /** All carers in a stable alphabetical order (does not move when jobs are assigned). */
  employeeRows: EmployeeDayRow[]
  carers: EmployeeDayRow[]
  unassignedJobs: TimelineJob[]
  cancelledJobs: TimelineJob[]
  allJobs: TimelineJob[]
}

function sortJobsByStartTime(a: TimelineJob, b: TimelineJob): number {
  return new Date(a.scheduledStartDateTime).getTime() - new Date(b.scheduledStartDateTime).getTime()
}

/** Build gantt rows: unassigned, cancelled, then all carers in fixed name order. */
export function buildScheduleJobsBoard(
  employees: EmployeeDayRow[],
  runJobs: TimelineJob[],
  runlessJobs: TimelineJob[],
): ScheduleJobsBoard {
  const jobById = new Map<string, TimelineJob>()
  for (const job of [...runJobs, ...runlessJobs]) {
    jobById.set(job.id, job)
  }

  const sortByName = (a: EmployeeDayRow, b: EmployeeDayRow) =>
    employeeBriefFullName(a.employee).localeCompare(employeeBriefFullName(b.employee), 'en')

  const employeeRows = employees
    .sort(sortByName)
    .map((row) => ({
      ...row,
      allocations: row.allocations.filter((allocation) => !isScheduleJobCancelled(allocation.job)),
    }))

  const carers = employeeRows.filter((row) => row.allocations.length > 0)

  const allJobs = [...jobById.values()]

  const cancelledJobs = allJobs.filter(isScheduleJobCancelled).sort(sortJobsByStartTime)

  const unassignedJobs = allJobs
    .filter(
      (job) => !isScheduleJobCancelled(job) && activeJobAllocationCount(job) < job.requiredCarers,
    )
    .sort(sortJobsByStartTime)

  return { employeeRows, carers, unassignedJobs, cancelledJobs, allJobs }
}

export function formatScheduleJobsDateLabel(
  isoDate: string,
  dateFormat: DateDisplayFormat = 'DD_MM_YYYY',
): string {
  return formatDisplayDateLong(isoDate, dateFormat)
}

export function formatScheduleJobsWeekday(isoDate: string): string {
  return formatDisplayWeekdayShort(isoDate)
}

export function formatScheduleJobsDayMonth(
  isoDate: string,
  dateFormat: DateDisplayFormat = 'DD_MM_YYYY',
): string {
  return formatDisplayDateShort(isoDate, dateFormat)
}

export function employeeBriefInitials(employee: EmployeeBrief): string {
  const first = employee.firstName?.trim()?.[0] ?? ''
  const last = employee.lastName?.trim()?.[0] ?? ''
  const initials = `${first}${last}`.toUpperCase()
  return initials || '?'
}

export function carerAvatarTone(name: string): { bg: string; text: string } {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return {
    bg: `hsl(${hue} 42% 92%)`,
    text: `hsl(${hue} 48% 32%)`,
  }
}

export function shiftIsoDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function minutesFromDayStart(iso: string, dayStartHour = SCHEDULE_JOBS_DAY_START_HOUR): number {
  const minutes = minutesFromOperationalDayStart(iso, dayStartHour)
  return Math.max(0, Math.min(SCHEDULE_JOBS_TIMELINE_MINUTES, minutes))
}

export function jobEndMinutes(job: Pick<TimelineJob, 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'>): number {
  if (job.scheduledEndDateTime) {
    return minutesFromDayStart(job.scheduledEndDateTime)
  }
  const start = new Date(job.scheduledStartDateTime)
  const mins = job.durationMinutes ?? 60
  const end = new Date(start.getTime() + mins * 60_000)
  return minutesFromDayStart(end.toISOString())
}

export type JobBlockPosition = {
  leftPct: number
  widthPct: number
  startMin: number
  endMin: number
}

export type JobBlockLayoutPx = {
  leftPx: number
  widthPx: number
  startMin: number
  endMin: number
}

export function jobBlockLayoutPx(
  job: Pick<TimelineJob, 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'>,
): JobBlockLayoutPx {
  const { startMin, endMin } = jobBlockPosition(job)
  const gridWidth = SCHEDULE_JOBS_TIMELINE_GRID_WIDTH
  const trackWidth = SCHEDULE_JOBS_TIMELINE_TRACK_WIDTH
  const durationPx = ((endMin - startMin) / SCHEDULE_JOBS_TIMELINE_MINUTES) * gridWidth
  const leftPx = (startMin / SCHEDULE_JOBS_TIMELINE_MINUTES) * gridWidth
  const widthPx = Math.min(
    Math.max(durationPx, SCHEDULE_JOBS_JOB_MIN_CLICK_WIDTH),
    Math.max(SCHEDULE_JOBS_JOB_MIN_CLICK_WIDTH, trackWidth - leftPx),
  )
  return { leftPx, widthPx, startMin, endMin }
}

export function jobBlockPosition(
  job: Pick<TimelineJob, 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'>,
): JobBlockPosition {
  const dayMinutes = SCHEDULE_JOBS_TIMELINE_MINUTES
  const startMin = Math.max(0, minutesFromDayStart(job.scheduledStartDateTime))
  const endMin = Math.min(dayMinutes, Math.max(startMin + 5, jobEndMinutes(job)))
  const leftPct = (startMin / dayMinutes) * 100
  const widthPct = Math.max(((endMin - startMin) / dayMinutes) * 100, 1.2)
  return { leftPct, widthPct, startMin, endMin }
}

export function formatTimeHm(iso: string, timeFormat: TimeDisplayFormat = 'HH_MM'): string {
  const hm = formatOpsHm(iso)
  if (!hm) return '—'
  if (timeFormat === 'HH_XX') return String(Number(hm.slice(0, 2)))
  return hm
}

export function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h} hour${h === 1 ? '' : 's'}`
  return `${h} hour${h === 1 ? '' : 's'} and ${m} minute${m === 1 ? '' : 's'}`
}

export function jobDurationMinutes(job: Pick<TimelineJob, 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'>): number {
  if (typeof job.durationMinutes === 'number' && job.durationMinutes > 0) return job.durationMinutes
  const { startMin, endMin } = jobBlockPosition(job)
  return Math.max(endMin - startMin, 1)
}

/** Visit duration × carers required — comparable to total booked carer-minutes. */
export function jobRequiredCarerMinutes(
  job: Pick<TimelineJob, 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes' | 'requiredCarers'>,
): number {
  return jobDurationMinutes(job) * Math.max(1, job.requiredCarers)
}

export type JobBlockTone =
  | 'green'
  | 'orange'
  | 'red'
  | 'neutral'
  | 'completed'
  | 'unableToStart'
  | 'cancelled'

export function jobBlockTone(
  job: TimelineJob,
  options?: { outsideWorkingPattern?: boolean },
): JobBlockTone {
  if (isScheduleJobCareNotDelivered(job)) return 'unableToStart'
  if (job.status === 'COMPLETED') return 'completed'
  if (isScheduleJobCancelled(job)) return 'cancelled'
  if (options?.outsideWorkingPattern) return 'orange'
  if (job.status === 'NEEDS_ATTENTION' || job.underAllocated) return 'red'
  if ((job.carersOnLeave?.length ?? 0) > 0 || job.needsCover) return 'orange'
  if (['ALLOCATED', 'IN_PROGRESS', 'CONFIRMED'].includes(job.status)) return 'green'
  if (['UNALLOCATED', 'PENDING'].includes(job.status)) return 'orange'
  return 'neutral'
}

export const JOB_BLOCK_TONE_CLASSES: Record<JobBlockTone, string> = {
  completed:
    'border-[#6ee7b7] text-[#047857] shadow-sm ring-1 ring-emerald-600/20 hover:ring-emerald-600/35',
  unableToStart:
    'border-amber-400 text-amber-900 shadow-sm ring-1 ring-amber-600/20 hover:ring-amber-600/35 dark:text-amber-100',
  cancelled:
    'border-slate-500/80 text-slate-800 shadow-sm ring-1 ring-slate-500/20 hover:ring-slate-500/35 dark:border-slate-600 dark:text-slate-100',
  green:
    'border-emerald-600/70 bg-gradient-to-b from-emerald-100 to-emerald-200/90 text-emerald-950 shadow-sm ring-1 ring-emerald-700/10 hover:ring-emerald-600/30',
  orange:
    'border-amber-500/80 bg-gradient-to-b from-amber-50 to-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-600/10 hover:ring-amber-500/30',
  red: 'border-rose-500/80 bg-gradient-to-b from-rose-50 to-rose-100 text-rose-950 shadow-sm ring-1 ring-rose-600/10 hover:ring-rose-500/30',
  neutral:
    'border-slate-400/80 bg-gradient-to-b from-slate-100 to-slate-200/90 text-slate-900 shadow-sm ring-1 ring-slate-500/10 hover:ring-slate-400/30',
}

/** Cancelled / called-off visits — consistent slate cross-hatch on the rota board. */
export const jobBlockCancelledSurfaceStyle = {
  backgroundColor: '#e2e8f0',
  backgroundImage: [
    'repeating-linear-gradient(135deg, rgba(100, 116, 139, 0.2) 0, rgba(100, 116, 139, 0.2) 1px, transparent 1px, transparent 7px)',
    'repeating-linear-gradient(-45deg, rgba(100, 116, 139, 0.2) 0, rgba(100, 116, 139, 0.2) 1px, transparent 1px, transparent 7px)',
  ].join(', '),
} as const

/** Visit-plan completed emerald with cross-hatch overlay (matches vp-outcome-completed palette). */
export const jobBlockCompletedSurfaceStyle = {
  backgroundColor: '#d1fae5',
  backgroundImage: [
    'repeating-linear-gradient(45deg, rgba(4, 120, 87, 0.22) 0, rgba(4, 120, 87, 0.22) 1px, transparent 1px, transparent 7px)',
    'repeating-linear-gradient(-45deg, rgba(4, 120, 87, 0.22) 0, rgba(4, 120, 87, 0.22) 1px, transparent 1px, transparent 7px)',
  ].join(', '),
} as const

/** Unable-to-start (care not delivered) — amber hatch so it is distinct from completed green. */
export const jobBlockUnableToStartSurfaceStyle = {
  backgroundColor: '#fef3c7',
  backgroundImage: [
    'repeating-linear-gradient(45deg, rgba(180, 83, 9, 0.28) 0, rgba(180, 83, 9, 0.28) 1px, transparent 1px, transparent 7px)',
    'repeating-linear-gradient(-45deg, rgba(180, 83, 9, 0.28) 0, rgba(180, 83, 9, 0.28) 1px, transparent 1px, transparent 7px)',
  ].join(', '),
} as const

export function scheduleJobsHourLabels(): number[] {
  return Array.from({ length: SCHEDULE_JOBS_TIMELINE_HOURS }, (_, hour) => hour)
}

export type ScheduleJobsDayPeriod =
  | 'night'
  | 'morning'
  | 'midday'
  | 'afternoon'
  | 'evening'

export type ScheduleJobsDayPeriodBand = {
  id: string
  period: ScheduleJobsDayPeriod
  label: string
  startHour: number
  endHour: number
}

/** Full-day bands aligned with domiciliary care call rounds (Morning → Night). */
export const SCHEDULE_JOBS_DAY_PERIOD_BANDS: ScheduleJobsDayPeriodBand[] = [
  { id: 'morning', period: 'morning', label: 'Morning', startHour: 0, endHour: 12 },
  { id: 'midday', period: 'midday', label: 'Midday', startHour: 12, endHour: 14 },
  { id: 'afternoon', period: 'afternoon', label: 'Afternoon', startHour: 14, endHour: 18 },
  { id: 'evening', period: 'evening', label: 'Evening', startHour: 18, endHour: 22 },
  { id: 'night-late', period: 'night', label: 'Night', startHour: 22, endHour: 24 },
]

export function scheduleJobsPeriodBandForHour(hour: number): ScheduleJobsDayPeriodBand {
  const band = SCHEDULE_JOBS_DAY_PERIOD_BANDS.find(
    (entry) => hour >= entry.startHour && hour < entry.endHour,
  )
  return band ?? SCHEDULE_JOBS_DAY_PERIOD_BANDS[0]!
}

export function formatScheduleJobsPeriodRange(
  band: ScheduleJobsDayPeriodBand,
  timeFormat: TimeDisplayFormat = 'HH_MM',
): string {
  return formatDisplayPeriodRange(band.startHour, band.endHour, timeFormat)
}

export function formatScheduleJobsHourLabel(
  hour: number,
  timeFormat: TimeDisplayFormat = 'HH_MM',
): string {
  return formatDisplayHourLabel(hour, timeFormat)
}

export function scheduleJobsPeriodHourCellClass(period: ScheduleJobsDayPeriod): string {
  switch (period) {
    case 'night':
      return 'bg-slate-200/35 dark:bg-slate-800/35'
    case 'morning':
      return 'bg-amber-50/70 dark:bg-amber-950/20'
    case 'midday':
      return 'bg-sky-50/70 dark:bg-sky-950/20'
    case 'afternoon':
      return 'bg-orange-50/60 dark:bg-orange-950/15'
    case 'evening':
      return 'bg-violet-50/60 dark:bg-violet-950/15'
    default:
      return 'bg-background'
  }
}

export function scheduleJobsPeriodBandHeaderClass(period: ScheduleJobsDayPeriod): string {
  switch (period) {
    case 'night':
      return 'border-slate-300/70 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200'
    case 'morning':
      return 'border-amber-200/80 bg-amber-50/90 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
    case 'midday':
      return 'border-sky-200/80 bg-sky-50/90 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100'
    case 'afternoon':
      return 'border-orange-200/80 bg-orange-50/90 text-orange-900 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100'
    case 'evening':
      return 'border-violet-200/80 bg-violet-50/90 text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100'
    default:
      return 'border-border bg-muted/40 text-muted-foreground'
  }
}

export function formatHoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h, ${m}m`
}
