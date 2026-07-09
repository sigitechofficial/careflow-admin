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
