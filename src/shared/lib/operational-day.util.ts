/**
 * Care-delivery operational calendar (P0).
 * Default Europe/London until org timezone setting lands (P1).
 * Browser local TZ must never define "today" for board / ECM / visit days.
 */

export const DEFAULT_OPERATIONAL_TIMEZONE = 'Europe/London'

/** Alias used by ECM period util historically. */
export const ECM_OPERATIONAL_TIMEZONE = DEFAULT_OPERATIONAL_TIMEZONE

/** Resolve org ops TZ. P0: always default. */
export function getOperationalTimeZone(_orgTimezone?: string | null): string {
  const trimmed = _orgTimezone?.trim()
  return trimmed || DEFAULT_OPERATIONAL_TIMEZONE
}

/** Operational calendar day as YYYY-MM-DD. */
export function operationalTodayIso(
  now = new Date(),
  timeZone = DEFAULT_OPERATIONAL_TIMEZONE,
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** @deprecated Prefer operationalTodayIso — same behaviour. */
export function todayIsoLocal(
  now = new Date(),
  timeZone = DEFAULT_OPERATIONAL_TIMEZONE,
): string {
  return operationalTodayIso(now, timeZone)
}

/** Calendar day of an instant in the operational timezone. */
export function dayKeyInTimeZone(
  instant: Date | string,
  timeZone = DEFAULT_OPERATIONAL_TIMEZONE,
): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant
  if (Number.isNaN(d.getTime())) return ''
  return operationalTodayIso(d, timeZone)
}

/** Short label for UI: "Operational day · Europe/London · 6 Aug 2026" */
export function formatOperationalDayLabel(
  dayIso: string = operationalTodayIso(),
  timeZone = DEFAULT_OPERATIONAL_TIMEZONE,
): string {
  const [y, m, d] = dayIso.split('-').map(Number)
  if (!y || !m || !d) return `Operational day · ${timeZone}`
  const pretty = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)))
  return `Operational day · ${timeZone} · ${pretty}`
}

/** Format an instant's calendar day in ops TZ (en-GB short). */
export function formatOpsCalendarDate(
  iso: string | null | undefined,
  timeZone = DEFAULT_OPERATIONAL_TIMEZONE,
): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

/** Format clock time of an instant in ops TZ. */
export function formatOpsClockTime(
  iso: string | null | undefined,
  timeZone = DEFAULT_OPERATIONAL_TIMEZONE,
): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}
