/**
 * Care-delivery operational calendar.
 * Uses OrganisationGeneralSettings.timezone once synced (see OrganisationDisplayFormatProvider).
 * Browser local TZ must never define "today" for board / ECM / visit days.
 */

export const DEFAULT_OPERATIONAL_TIMEZONE = 'Europe/London'

/** Alias used by ECM period util historically. */
export const ECM_OPERATIONAL_TIMEZONE = DEFAULT_OPERATIONAL_TIMEZONE

let syncedOperationalTimezone = DEFAULT_OPERATIONAL_TIMEZONE

/** Resolve org ops TZ from a settings value (falls back to Europe/London). */
export function getOperationalTimeZone(orgTimezone?: string | null): string {
  const trimmed = orgTimezone?.trim()
  return trimmed || DEFAULT_OPERATIONAL_TIMEZONE
}

/** Persist last-known organisation timezone for non-React helpers. */
export function syncOrganisationOperationalTimezone(orgTimezone?: string | null): void {
  syncedOperationalTimezone = getOperationalTimeZone(orgTimezone)
}

/** Last synced organisation operational timezone (default Europe/London until settings load). */
export function getSyncedOperationalTimeZone(): string {
  return syncedOperationalTimezone
}

/** Operational calendar day as YYYY-MM-DD. */
export function operationalTodayIso(
  now = new Date(),
  timeZone = getSyncedOperationalTimeZone(),
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
  timeZone = getSyncedOperationalTimeZone(),
): string {
  return operationalTodayIso(now, timeZone)
}

/** Calendar day of an instant in the operational timezone. */
export function dayKeyInTimeZone(
  instant: Date | string,
  timeZone = getSyncedOperationalTimeZone(),
): string {
  const d = typeof instant === 'string' ? new Date(instant) : instant
  if (Number.isNaN(d.getTime())) return ''
  return operationalTodayIso(d, timeZone)
}

/** Add calendar days to a YYYY-MM-DD label (date arithmetic on the label). */
export function addDaysToOperationalIso(iso: string, delta: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return iso
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return dt.toISOString().slice(0, 10)
}

/** Minutes since midnight in the operational timezone. */
export function minutesInOperationalTimeZone(
  now = new Date(),
  timeZone = getSyncedOperationalTimeZone(),
): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

/** Short label for UI: "Operational day · Europe/London · 6 Aug 2026" */
export function formatOperationalDayLabel(
  dayIso: string = operationalTodayIso(),
  timeZone = getSyncedOperationalTimeZone(),
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
  timeZone = getSyncedOperationalTimeZone(),
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
  timeZone = getSyncedOperationalTimeZone(),
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
