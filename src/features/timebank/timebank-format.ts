import type {
  CarerTimebankOutcome,
  TimebankShortReason,
  TimebankVisitOutcome,
  TimebankWeekStatus,
} from '@/features/timebank/types'

/** "25h 30m" — same style as the weekly hours panels. */
export function formatMinutes(minutes: number): string {
  const total = Math.round(minutes)
  if (total === 0) return '0'
  const sign = total < 0 ? '−' : ''
  const abs = Math.abs(total)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (h === 0) return `${sign}${m}m`
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m}m`
}

export function shiftWeek(mondayIso: string, weeks: number): string {
  const d = new Date(`${mondayIso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

export function mondayOf(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

export const WEEK_STATUS_LABEL: Record<TimebankWeekStatus, string> = {
  complete: 'Delivered',
  short: 'Short',
  current: 'This week',
  upcoming: 'Scheduled',
}

export const WEEK_STATUS_TONE: Record<TimebankWeekStatus, string> = {
  complete:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  short: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  current: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300',
  upcoming: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
}

export const SHORT_REASON_LABEL: Record<TimebankShortReason, string> = {
  CANCELLED_BY_SERVICE_USER: 'Cancelled by service user',
  CANCELLED_BY_AGENCY: 'Cancelled by agency',
  CANCELLED_OTHER: 'Cancelled (other)',
  MISSED: 'Missed',
  CALLED_OFF: 'Called off',
  SHORTER: 'Shorter than planned',
  NOT_APPROVED: 'Rejected by office',
}

export const VISIT_OUTCOME_LABEL: Record<TimebankVisitOutcome, string> = {
  ...SHORT_REASON_LABEL,
  DELIVERED: 'Delivered',
  PENDING: 'Not approved for invoice yet',
  SCHEDULED: 'Scheduled',
  UNABLE_TO_START: 'Unable to start',
  AWAITING_CLOCK_OUT: 'Awaiting clock-out',
  REMOVED_HOURS_REDUCED: 'Removed — weekly hours reduced',
}

export const VISIT_OUTCOME_TONE: Record<TimebankVisitOutcome, string> = {
  DELIVERED: 'text-emerald-700 dark:text-emerald-400',
  PENDING: 'text-sky-700 dark:text-sky-400',
  SCHEDULED: 'text-muted-foreground',
  UNABLE_TO_START: 'text-emerald-700 dark:text-emerald-400',
  AWAITING_CLOCK_OUT: 'text-violet-700 dark:text-violet-400',
  REMOVED_HOURS_REDUCED: 'text-muted-foreground',
  CANCELLED_BY_SERVICE_USER: 'text-amber-700 dark:text-amber-400',
  CANCELLED_BY_AGENCY: 'text-amber-700 dark:text-amber-400',
  CANCELLED_OTHER: 'text-amber-700 dark:text-amber-400',
  MISSED: 'text-amber-700 dark:text-amber-400',
  CALLED_OFF: 'text-amber-700 dark:text-amber-400',
  SHORTER: 'text-amber-700 dark:text-amber-400',
  NOT_APPROVED: 'text-amber-700 dark:text-amber-400',
}

export const CARER_OUTCOME_LABEL: Record<CarerTimebankOutcome, string> = {
  WORKED: 'Worked',
  PENDING: 'Not approved for pay yet',
  SCHEDULED: 'Scheduled',
  SHORTER: 'Shorter than planned',
  MISSED: 'Missed',
  PAY_REJECTED: 'Pay rejected by office',
  UNABLE_TO_START: 'Unable to start',
  CANCELLED_BY_SERVICE_USER: 'Cancelled by service user',
  CANCELLED_BY_AGENCY: 'Cancelled by agency',
  CANCELLED_OTHER: 'Cancelled (other)',
  CALLED_OFF: 'Called off',
}

const AMBER = 'text-amber-700 dark:text-amber-400'

export const CARER_OUTCOME_TONE: Record<CarerTimebankOutcome, string> = {
  WORKED: 'text-emerald-700 dark:text-emerald-400',
  PENDING: 'text-sky-700 dark:text-sky-400',
  SCHEDULED: 'text-muted-foreground',
  SHORTER: AMBER,
  MISSED: AMBER,
  PAY_REJECTED: AMBER,
  UNABLE_TO_START: AMBER,
  CANCELLED_BY_SERVICE_USER: AMBER,
  CANCELLED_BY_AGENCY: AMBER,
  CANCELLED_OTHER: AMBER,
  CALLED_OFF: AMBER,
}
