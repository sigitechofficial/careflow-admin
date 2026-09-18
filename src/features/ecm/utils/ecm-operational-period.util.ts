/** Operational period presets for ECM live monitoring + exception queue. */

import {
  DEFAULT_OPERATIONAL_TIMEZONE,
  ECM_OPERATIONAL_TIMEZONE,
  dayKeyInTimeZone,
  formatOperationalIsoDate,
  operationalTodayIso,
  todayIsoLocal,
} from '@/shared/lib/operational-day.util'

export type EcmOperationalPeriodPreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'last_14_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'month_to_date'
  | 'quarter_to_date'
  | 'year_to_date'
  | 'custom'

export type EcmOperationalPeriod = {
  preset: EcmOperationalPeriodPreset
  dateFrom: string
  dateTo: string
}

export {
  DEFAULT_OPERATIONAL_TIMEZONE,
  ECM_OPERATIONAL_TIMEZONE,
  operationalTodayIso,
  todayIsoLocal,
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function localDateFromIso(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function addDaysIso(iso: string, delta: number): string {
  const d = localDateFromIso(iso)
  if (!d) return iso
  d.setDate(d.getDate() + delta)
  return toIsoLocal(d)
}

/**
 * Monday of the ISO-style week containing `iso` (local calendar).
 * Matches care ops / visit-plan convention: weeks start Monday.
 */
function mondayOfWeekContaining(iso: string): string {
  const d = localDateFromIso(iso)
  if (!d) return iso
  const dow = d.getDay() // 0=Sun … 6=Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + mondayOffset)
  return toIsoLocal(d)
}

export function periodFromPreset(
  preset: Exclude<EcmOperationalPeriodPreset, 'custom'>,
  today = todayIsoLocal(),
): { dateFrom: string; dateTo: string } {
  const [y, m, d] = today.split('-').map(Number)
  if (!y || !m || !d) {
    return { dateFrom: today, dateTo: today }
  }

  switch (preset) {
    case 'today':
      return { dateFrom: today, dateTo: today }
    case 'yesterday': {
      const yday = addDaysIso(today, -1)
      return { dateFrom: yday, dateTo: yday }
    }
    case 'this_week': {
      const monday = mondayOfWeekContaining(today)
      return { dateFrom: monday, dateTo: addDaysIso(monday, 6) }
    }
    case 'last_week': {
      const thisMonday = mondayOfWeekContaining(today)
      const lastMonday = addDaysIso(thisMonday, -7)
      return { dateFrom: lastMonday, dateTo: addDaysIso(lastMonday, 6) }
    }
    case 'last_14_days':
      // Inclusive: today and the previous 13 calendar days.
      return { dateFrom: addDaysIso(today, -13), dateTo: today }
    case 'last_30_days':
      return { dateFrom: addDaysIso(today, -29), dateTo: today }
    case 'this_month': {
      const last = lastDayOfMonth(y, m - 1)
      return {
        dateFrom: `${y}-${pad2(m)}-01`,
        dateTo: `${y}-${pad2(m)}-${pad2(last)}`,
      }
    }
    case 'last_month': {
      const lm = m === 1 ? 12 : m - 1
      const ly = m === 1 ? y - 1 : y
      const last = lastDayOfMonth(ly, lm - 1)
      return {
        dateFrom: `${ly}-${pad2(lm)}-01`,
        dateTo: `${ly}-${pad2(lm)}-${pad2(last)}`,
      }
    }
    case 'month_to_date':
      return {
        dateFrom: `${y}-${pad2(m)}-01`,
        dateTo: today,
      }
    case 'quarter_to_date': {
      const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1
      return {
        dateFrom: `${y}-${pad2(qStartMonth)}-01`,
        dateTo: today,
      }
    }
    case 'year_to_date':
      return {
        dateFrom: `${y}-01-01`,
        dateTo: today,
      }
    default:
      return { dateFrom: today, dateTo: today }
  }
}

export function presetOptionLabel(preset: EcmOperationalPeriodPreset): string {
  switch (preset) {
    case 'today':
      return 'Today'
    case 'yesterday':
      return 'Yesterday'
    case 'this_week':
      return 'This week'
    case 'last_week':
      return 'Last week'
    case 'last_14_days':
      return 'Last 14 days'
    case 'last_30_days':
      return 'Last 30 days'
    case 'this_month':
      return 'This month'
    case 'last_month':
      return 'Last month'
    case 'month_to_date':
      return 'Month to date'
    case 'quarter_to_date':
      return 'Quarter to date'
    case 'year_to_date':
      return 'Year to date'
    case 'custom':
      return 'Custom…'
  }
}

/** Short day label for period headers — organisation date display format. */
export function formatPeriodDayShort(iso: string): string {
  const day = iso?.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return iso
  return formatOperationalIsoDate(day)
}

/**
 * Human label for the active period.
 * Presets use their name; custom / single-day show concrete dates.
 */
export function formatOperationalPeriodLabel(period: EcmOperationalPeriod): string {
  const { preset, dateFrom, dateTo } = period
  if (preset !== 'custom' && preset !== 'today') {
    return presetOptionLabel(preset)
  }
  if (dateFrom === dateTo) {
    return formatPeriodDayShort(dateFrom)
  }
  return `${formatPeriodDayShort(dateFrom)} – ${formatPeriodDayShort(dateTo)}`
}

/**
 * Normalize any date-ish value to YYYY-MM-DD for inclusive range compares.
 * Accepts already-normalized keys, ISO datetimes, or Date-parseable strings.
 * Datetimes use the organisation operational timezone, not the browser.
 */
export function normalizeToDayKey(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const bare = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/)
  if (bare?.[1]) return bare[1]

  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) {
    const prefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
    return prefix?.[1] ?? null
  }
  return dayKeyInTimeZone(d)
}

/**
 * Local operational day for an exception row.
 * Prefer plannedStartDateTime (local calendar) over UTC `plannedDate` slice.
 */
export function exceptionPlannedDayKey(row: {
  plannedDate?: string | null
  plannedStartDateTime?: string | null
}): string | null {
  const fromStart = normalizeToDayKey(row.plannedStartDateTime ?? undefined)
  if (fromStart) return fromStart
  return normalizeToDayKey(row.plannedDate ?? undefined)
}

/** Inclusive YYYY-MM-DD range check. Missing day → include (prefer showing). */
export function isDayInPeriod(
  dayKey: string | null,
  dateFrom: string,
  dateTo: string,
): boolean {
  if (!dayKey) return true
  return dayKey >= dateFrom && dayKey <= dateTo
}

/** Inclusive list of YYYY-MM-DD days in a period (cap for UI day pickers). */
export function daysInPeriod(
  period: Pick<EcmOperationalPeriod, 'dateFrom' | 'dateTo'>,
  maxDays = 366,
): string[] {
  const from = localDateFromIso(period.dateFrom)
  const to = localDateFromIso(period.dateTo)
  if (!from || !to || period.dateFrom > period.dateTo) return [period.dateTo]
  const out: string[] = []
  const cursor = new Date(from)
  while (cursor <= to && out.length < maxDays) {
    out.push(toIsoLocal(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}
