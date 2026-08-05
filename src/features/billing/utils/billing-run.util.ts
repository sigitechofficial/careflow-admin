/** Default Mon–Sun week ending on the most recent Sunday (UTC). */
export function defaultBillingWeekRange(): { periodStart: string; periodEnd: string } {
  const today = new Date()
  const day = today.getUTCDay()
  const end = new Date(today)
  end.setUTCDate(today.getUTCDate() - day)
  const start = new Date(end)
  start.setUTCDate(end.getUTCDate() - 6)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { periodStart: fmt(start), periodEnd: fmt(end) }
}

/** Previous full calendar month (UTC) — start of month → end of month. */
export function defaultBillingMonthRange(): { periodStart: string; periodEnd: string } {
  const today = new Date()
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0))
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { periodStart: fmt(start), periodEnd: fmt(end) }
}
