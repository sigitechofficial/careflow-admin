function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Previous complete calendar week (Monday–Sunday, UTC). */
export function previousWeekRange(now = new Date()): { dateFrom: string; dateTo: string } {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = today.getUTCDay() // 0 = Sunday
  const daysSinceMonday = (day + 6) % 7
  const thisMonday = new Date(today)
  thisMonday.setUTCDate(today.getUTCDate() - daysSinceMonday)
  const prevMonday = new Date(thisMonday)
  prevMonday.setUTCDate(thisMonday.getUTCDate() - 7)
  const prevSunday = new Date(prevMonday)
  prevSunday.setUTCDate(prevMonday.getUTCDate() + 6)
  return { dateFrom: toIsoDate(prevMonday), dateTo: toIsoDate(prevSunday) }
}

/** Previous complete calendar month (UTC). */
export function lastMonthRange(now = new Date()): { dateFrom: string; dateTo: string } {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const from = new Date(Date.UTC(y, m - 1, 1))
  const to = new Date(Date.UTC(y, m, 0))
  return { dateFrom: toIsoDate(from), dateTo: toIsoDate(to) }
}

export type EarningsPeriodPreset = 'all' | 'previous-week' | 'last-month' | 'custom'

export function rangeForPreset(
  preset: EarningsPeriodPreset,
  custom?: { dateFrom?: string; dateTo?: string },
): { dateFrom?: string; dateTo?: string } {
  if (preset === 'previous-week') return previousWeekRange()
  if (preset === 'last-month') return lastMonthRange()
  if (preset === 'custom') {
    return {
      dateFrom: custom?.dateFrom || undefined,
      dateTo: custom?.dateTo || undefined,
    }
  }
  return {}
}
