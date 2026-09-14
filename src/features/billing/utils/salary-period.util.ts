import { getSyncedOperationalTimeZone } from '@/shared/lib/operational-day.util'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function ymdInTimeZone(
  at: Date,
  timeZone: string,
): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at)
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(p => p.type === type)?.value)
  return { y: num('year'), m: num('month'), d: num('day') }
}

/** ISO week key YYYY-Www from a calendar Y-M-D (Mon–Sun). */
export function isoWeekPeriodKeyFromYmd(y: number, m: number, d: number): string {
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${pad2(weekNo)}`
}

export function currentOpsMonth(
  timeZone = getSyncedOperationalTimeZone(),
  at = new Date(),
): string {
  const { y, m } = ymdInTimeZone(at, timeZone)
  return `${y}-${pad2(m)}`
}

export function currentOpsWeek(
  timeZone = getSyncedOperationalTimeZone(),
  at = new Date(),
): string {
  const { y, m, d } = ymdInTimeZone(at, timeZone)
  return isoWeekPeriodKeyFromYmd(y, m, d)
}

export function shiftSalaryMonth(month: string, delta: number): string {
  const [yRaw, mRaw] = month.split('-')
  const y = Number(yRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(y) || !Number.isFinite(m)) return month
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`
}

function mondayOfIsoWeek(period: string): Date {
  const match = /^(\d{4})-W(\d{2})$/.exec(period)
  if (!match) return new Date(NaN)
  const year = Number(match[1])
  const week = Number(match[2])
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Dow = jan4.getUTCDay() || 7
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1))
  const monday = new Date(week1Monday)
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  return monday
}

export function shiftSalaryWeek(period: string, delta: number): string {
  const monday = mondayOfIsoWeek(period)
  monday.setUTCDate(monday.getUTCDate() + delta * 7)
  return isoWeekPeriodKeyFromYmd(
    monday.getUTCFullYear(),
    monday.getUTCMonth() + 1,
    monday.getUTCDate(),
  )
}

export function salaryMonthDateRange(month: string): { dateFrom: string; dateTo: string } {
  const [yRaw, mRaw] = month.split('-')
  const y = Number(yRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(y) || !Number.isFinite(m)) {
    return { dateFrom: month, dateTo: month }
  }
  const from = new Date(Date.UTC(y, m - 1, 1))
  const to = new Date(Date.UTC(y, m, 0))
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  }
}

export function salaryWeekDateRange(period: string): { dateFrom: string; dateTo: string } {
  const monday = mondayOfIsoWeek(period)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return {
    dateFrom: monday.toISOString().slice(0, 10),
    dateTo: sunday.toISOString().slice(0, 10),
  }
}

export function salaryMonthLabel(month: string): string {
  const [yRaw, mRaw] = month.split('-')
  const y = Number(yRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(y) || !Number.isFinite(m) || y < 1 || m < 1) return month
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)))
}

export function salaryWeekLabel(
  period: string,
  formatDate: (iso: string) => string,
): string {
  const { dateFrom, dateTo } = salaryWeekDateRange(period)
  if (!dateFrom || Number.isNaN(mondayOfIsoWeek(period).getTime())) return period
  return `Week ${period.slice(6)} · ${formatDate(dateFrom)} – ${formatDate(dateTo)}`
}
