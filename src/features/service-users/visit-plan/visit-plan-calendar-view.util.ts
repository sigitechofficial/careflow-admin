import {
  formatOrganisationDate,
  formatOrganisationIsoDateLong,
  formatOrganisationMonthYear,
} from '@/shared/lib/organisation-display-format.store'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import {
  visitPlanDayDate,
  visitPlanDayOfWeekLetter,
  visitPlanLastDayOfMonth,
} from '@/features/service-users/visit-plan/visit-plan-schedule-match.util'

export type VisitPlanCalendarViewMode = 'daily' | 'weekly' | 'monthly'

export type VisitPlanCalendarDayCell = {
  month: string
  day: number
  iso: string
}

/** Calendar "today" in organisation operational timezone (not UTC / browser). */
export function visitPlanTodayIsoDate(now = new Date()): string {
  return operationalTodayIso(now)
}

export function visitPlanDayCell(month: string, day: number): VisitPlanCalendarDayCell {
  return {
    month,
    day,
    iso: `${month}-${String(day).padStart(2, '0')}`,
  }
}

export function parseVisitPlanIsoDate(iso: string): VisitPlanCalendarDayCell {
  const [y, m, d] = iso.split('-')
  return visitPlanDayCell(`${y}-${m}`, Number(d))
}

export function shiftVisitPlanIsoDate(iso: string, deltaDays: number): string {
  const { month, day } = parseVisitPlanIsoDate(iso)
  const date = visitPlanDayDate(month, day)
  date.setUTCDate(date.getUTCDate() + deltaDays)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dom = date.getUTCDate()
  return `${y}-${m}-${String(dom).padStart(2, '0')}`
}

export function visitPlanWeekDayCells(focusIso: string): VisitPlanCalendarDayCell[] {
  const { month, day } = parseVisitPlanIsoDate(focusIso)
  const anchor = visitPlanDayDate(month, day)
  const cells: VisitPlanCalendarDayCell[] = []
  for (let offset = -3; offset <= 3; offset++) {
    const date = new Date(anchor)
    date.setUTCDate(date.getUTCDate() + offset)
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const dom = date.getUTCDate()
    cells.push(visitPlanDayCell(`${y}-${m}`, dom))
  }
  return cells
}

export function visitPlanMonthDayCells(month: string): VisitPlanCalendarDayCell[] {
  const lastDay = visitPlanLastDayOfMonth(month)
  return Array.from({ length: lastDay }, (_, i) => visitPlanDayCell(month, i + 1))
}

export function visitPlanVisibleDayCells(
  viewMode: VisitPlanCalendarViewMode,
  focusIso: string,
): VisitPlanCalendarDayCell[] {
  if (viewMode === 'daily') {
    const { month, day } = parseVisitPlanIsoDate(focusIso)
    return [visitPlanDayCell(month, day)]
  }
  if (viewMode === 'weekly') {
    return visitPlanWeekDayCells(focusIso)
  }
  const { month } = parseVisitPlanIsoDate(focusIso)
  return visitPlanMonthDayCells(month)
}

export function visitPlanCalendarPeriodLabel(
  viewMode: VisitPlanCalendarViewMode,
  focusIso: string,
): string {
  const { month, day } = parseVisitPlanIsoDate(focusIso)
  if (viewMode === 'daily') {
    return formatOrganisationIsoDateLong(focusIso)
  }
  if (viewMode === 'weekly') {
    const cells = visitPlanWeekDayCells(focusIso)
    const first = cells[0]!
    const last = cells[cells.length - 1]!
    const sameMonth = first.month === last.month
    const start = formatOrganisationDate(`${first.iso}T12:00:00Z`, { utc: true })
    const end = formatOrganisationDate(`${last.iso}T12:00:00Z`, { utc: true })
    if (sameMonth) {
      return `${start} – ${end}`
    }
    return `${start} – ${end}`
  }
  return formatOrganisationMonthYear(month)
}

export function visitPlanCalendarNavStep(viewMode: VisitPlanCalendarViewMode): number {
  if (viewMode === 'daily') return 1
  if (viewMode === 'weekly') return 7
  return 0
}

export function visitPlanDayHeaderLabel(cell: VisitPlanCalendarDayCell): {
  num: string
  dow: string
} {
  if (cell.day === 1 || cell.day === 15) {
    const shortMonth = formatOrganisationMonthYear(cell.month)
    return { num: `${cell.day} ${shortMonth}`, dow: visitPlanDayOfWeekLetter(cell.month, cell.day) }
  }
  return { num: String(cell.day), dow: visitPlanDayOfWeekLetter(cell.month, cell.day) }
}
