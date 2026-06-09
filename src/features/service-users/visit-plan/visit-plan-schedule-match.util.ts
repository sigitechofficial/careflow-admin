import type { VisitPlanMonthlyOrdinal, VisitPlanSlot } from '@/features/service-users/visit-plan/types'

export type VisitPlanSlotScheduleShape = Pick<
  VisitPlanSlot,
  | 'daysOfWeek'
  | 'scheduleFrequency'
  | 'repeatEvery'
  | 'monthlyDayMode'
  | 'monthlyDaysOfMonth'
  | 'monthlyPatternOrdinal'
  | 'monthlyPatternWeekday'
>

const DAY_MS = 86400000

function utcMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
}

function weekdayOccurrencesInMonth(year: number, month: number, weekday: number): number[] {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const hits: number[] = []
  for (let dom = 1; dom <= daysInMonth; dom++) {
    const d = new Date(Date.UTC(year, month, dom))
    if (d.getUTCDay() === weekday) hits.push(dom)
  }
  return hits
}

function matchesMonthlyPattern(day: Date, ordinal: VisitPlanMonthlyOrdinal, weekday: number): boolean {
  const dom = day.getUTCDate()
  const occurrences = weekdayOccurrencesInMonth(day.getUTCFullYear(), day.getUTCMonth(), weekday)
  if (!occurrences.length) return false
  if (ordinal === 'LAST') return dom === occurrences[occurrences.length - 1]
  const index = { FIRST: 0, SECOND: 1, THIRD: 2, FOURTH: 3 }[ordinal]
  return index !== undefined && occurrences[index] === dom
}

/** Whether a calendar day matches the slot's recurrence rules (mirrors backend util). */
export function visitPlanSlotMatchesDay(
  slot: VisitPlanSlotScheduleShape,
  day: Date,
  anchor: Date,
): boolean {
  const dow = day.getUTCDay()

  if (slot.scheduleFrequency === 'MONTHLY') {
    const every = Math.max(1, slot.repeatEvery)
    const monthDiff = monthsBetween(utcMonthStart(anchor), utcMonthStart(day))
    if (monthDiff < 0 || monthDiff % every !== 0) return false

    if (slot.monthlyDayMode === 'BY_DATE') {
      return slot.monthlyDaysOfMonth.includes(day.getUTCDate())
    }
    if (
      slot.monthlyDayMode === 'BY_PATTERN' &&
      slot.monthlyPatternOrdinal != null &&
      slot.monthlyPatternWeekday != null
    ) {
      return matchesMonthlyPattern(day, slot.monthlyPatternOrdinal, slot.monthlyPatternWeekday)
    }
    return false
  }

  if (slot.scheduleFrequency === 'WEEKLY') {
    if (!slot.daysOfWeek.includes(dow)) return false
    const every = Math.max(1, slot.repeatEvery)
    if (every === 1) return true
    const anchorWeek = Math.floor(anchor.getTime() / DAY_MS / 7)
    const dayWeek = Math.floor(day.getTime() / DAY_MS / 7)
    const weekDiff = dayWeek - anchorWeek
    return weekDiff >= 0 && weekDiff % every === 0
  }

  if (!slot.daysOfWeek.includes(dow)) return false
  const every = Math.max(1, slot.repeatEvery)
  if (every === 1) return true
  const daysDiff = Math.floor((day.getTime() - anchor.getTime()) / DAY_MS)
  return daysDiff >= 0 && daysDiff % every === 0
}

export function visitPlanDayDate(month: string, day: number): Date {
  const [yStr, mStr] = month.split('-')
  return new Date(Date.UTC(Number(yStr), Number(mStr) - 1, day))
}

export function visitPlanLastDayOfMonth(month: string): number {
  const [yStr, mStr] = month.split('-')
  return new Date(Date.UTC(Number(yStr), Number(mStr), 0)).getUTCDate()
}

export function visitPlanTodayDayInMonth(month: string): number | null {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  if (`${y}-${m}` !== month) return null
  return now.getUTCDate()
}

export function visitPlanDayOfWeekLetter(month: string, day: number): string {
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return letters[visitPlanDayDate(month, day).getUTCDay()] ?? ''
}

export function visitPlanCalendarAnchor(planEffectiveFrom: string | null | undefined, month: string): Date {
  if (planEffectiveFrom?.trim()) {
    const parsed = new Date(`${planEffectiveFrom.slice(0, 10)}T12:00:00Z`)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return visitPlanDayDate(month, 1)
}

export function slotMatchesPlanDay(
  slot: VisitPlanSlot,
  month: string,
  day: number,
  anchor: Date,
): boolean {
  if (!slot.isEnabled) return false
  return visitPlanSlotMatchesDay(slot, visitPlanDayDate(month, day), anchor)
}
