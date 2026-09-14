/**
 * Care-delivery operational calendar.
 * Uses OrganisationGeneralSettings.timezone once synced (see OrganisationDisplayFormatProvider).
 * Browser local TZ must never define "today" for board / ECM / visit days.
 */

export const DEFAULT_OPERATIONAL_TIMEZONE = 'Asia/Karachi'

/** Alias used by ECM period util historically. */
export const ECM_OPERATIONAL_TIMEZONE = DEFAULT_OPERATIONAL_TIMEZONE

let syncedOperationalTimezone = DEFAULT_OPERATIONAL_TIMEZONE

/** Resolve org ops TZ from a settings value (falls back to Asia/Karachi). */
export function getOperationalTimeZone(orgTimezone?: string | null): string {
  const trimmed = orgTimezone?.trim()
  return trimmed || DEFAULT_OPERATIONAL_TIMEZONE
}

/** Persist last-known organisation timezone for non-React helpers. */
export function syncOrganisationOperationalTimezone(orgTimezone?: string | null): void {
  syncedOperationalTimezone = getOperationalTimeZone(orgTimezone)
}

/** Last synced organisation operational timezone (default Asia/Karachi until settings load). */
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
    hourCycle: 'h23',
  }).format(d)
}

/** Minutes since midnight (or dayStartHour) for an instant in the operational timezone. */
export function minutesFromOperationalDayStart(
  iso: string,
  dayStartHour = 0,
  timeZone = getSyncedOperationalTimeZone(),
): number {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 0
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
  return (hour - dayStartHour) * 60 + minute
}

/**
 * Convert operational calendar day + local HH:mm in org timezone to a true UTC ISO string.
 * Example: Europe/London BST 07:00 → …T06:00:00.000Z
 */
export function combineOperationalDateAndHm(
  dayIso: string,
  hm: string,
  timeZone = getSyncedOperationalTimeZone(),
): string {
  const day = dayIso.slice(0, 10)
  const match = /^(\d{2}):(\d{2})$/.exec(hm.trim())
  if (!match) return ''
  const targetMinutes = Number(match[1]) * 60 + Number(match[2])

  let guess = Date.parse(`${day}T00:00:00.000Z`)
  if (!Number.isFinite(guess)) return ''

  // Align guess to local midnight, then add wall-clock minutes and correct.
  for (let i = 0; i < 48; i++) {
    const key = dayKeyInTimeZone(new Date(guess), timeZone)
    if (key === day) {
      let t = guess
      while (dayKeyInTimeZone(new Date(t - 60_000), timeZone) === day) t -= 60_000
      while (dayKeyInTimeZone(new Date(t - 1000), timeZone) === day) t -= 1000
      guess = t + targetMinutes * 60_000
      break
    }
    if (key < day) guess += 60 * 60_000
    else guess -= 60 * 60_000
  }

  for (let i = 0; i < 8; i++) {
    const instant = new Date(guess)
    const shownDay = dayKeyInTimeZone(instant, timeZone)
    const shown = formatOpsClockTime(instant.toISOString(), timeZone)
    const [sh, sm] = shown.split(':').map(Number)
    const shownMinutes = (sh ?? 0) * 60 + (sm ?? 0)
    let deltaMin = targetMinutes - shownMinutes
    if (shownDay < day) deltaMin += 24 * 60
    else if (shownDay > day) deltaMin -= 24 * 60
    if (deltaMin === 0) return instant.toISOString()
    guess += deltaMin * 60_000
  }

  return new Date(guess).toISOString()
}

/** Numeric calendar date (DD/MM/YYYY) of an instant in the operational timezone. */
export function formatOpsDateNumeric(
  iso: string | null | undefined,
  timeZone = getSyncedOperationalTimeZone(),
): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Numeric date + 24h clock (DD/MM/YYYY HH:mm) of an instant in the operational
 * timezone — so medication/clinical timestamps read in UK time regardless of
 * the viewer's browser timezone.
 */
export function formatOpsDateTimeNumeric(
  iso: string | null | undefined,
  timeZone = getSyncedOperationalTimeZone(),
): string {
  const date = formatOpsDateNumeric(iso, timeZone)
  if (date === '—') return '—'
  return `${date} ${formatOpsClockTime(iso, timeZone)}`
}

/** HH:mm wall clock of an instant in the operational timezone. */
export function formatOpsHm(
  iso: string | null | undefined,
  timeZone = getSyncedOperationalTimeZone(),
): string {
  if (!iso) return ''
  const label = formatOpsClockTime(iso, timeZone)
  return label === '—' ? '' : label
}

/** Calendar YYYY-MM-DD of an instant in the operational timezone. */
export function dayKeyFromInstant(
  iso: string | null | undefined,
  timeZone = getSyncedOperationalTimeZone(),
): string {
  if (!iso) return ''
  return dayKeyInTimeZone(iso, timeZone)
}
