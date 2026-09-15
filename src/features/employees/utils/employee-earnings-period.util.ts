import {
  addDaysToOperationalIso,
  getSyncedOperationalTimeZone,
  operationalTodayIso,
} from '@/shared/lib/operational-day.util'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Monday of the week containing `iso` (YYYY-MM-DD civil calendar, weeks start Monday). */
function mondayOfWeekContaining(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const utc = new Date(Date.UTC(y, m - 1, d))
  const dow = utc.getUTCDay() // 0 = Sunday
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  return addDaysToOperationalIso(iso, mondayOffset)
}

/** Previous complete calendar week (Monday–Sunday) on the organisation operational calendar. */
export function previousWeekRange(
  now = new Date(),
  timeZone = getSyncedOperationalTimeZone(),
): { dateFrom: string; dateTo: string } {
  const today = operationalTodayIso(now, timeZone)
  const thisMonday = mondayOfWeekContaining(today)
  const prevMonday = addDaysToOperationalIso(thisMonday, -7)
  return { dateFrom: prevMonday, dateTo: addDaysToOperationalIso(prevMonday, 6) }
}

/** Previous complete calendar month on the organisation operational calendar. */
export function lastMonthRange(
  now = new Date(),
  timeZone = getSyncedOperationalTimeZone(),
): { dateFrom: string; dateTo: string } {
  const today = operationalTodayIso(now, timeZone)
  const [y, m] = today.split('-').map(Number)
  if (!y || !m) return { dateFrom: today, dateTo: today }
  const lm = m === 1 ? 12 : m - 1
  const ly = m === 1 ? y - 1 : y
  const lastDay = new Date(Date.UTC(ly, lm, 0)).getUTCDate()
  return {
    dateFrom: `${ly}-${pad2(lm)}-01`,
    dateTo: `${ly}-${pad2(lm)}-${pad2(lastDay)}`,
  }
}

export type EarningsPeriodPreset = 'all' | 'previous-week' | 'last-month' | 'custom'

export function rangeForPreset(
  preset: EarningsPeriodPreset,
  custom?: { dateFrom?: string; dateTo?: string },
  now = new Date(),
  timeZone = getSyncedOperationalTimeZone(),
): { dateFrom?: string; dateTo?: string } {
  if (preset === 'previous-week') return previousWeekRange(now, timeZone)
  if (preset === 'last-month') return lastMonthRange(now, timeZone)
  if (preset === 'custom') {
    return {
      dateFrom: custom?.dateFrom || undefined,
      dateTo: custom?.dateTo || undefined,
    }
  }
  return {}
}
