/**
 * Pure en-GB time formatting helpers (UK display time) shared by admin areas such as
 * Azure Pricing and System jobs. No React imports.
 */

const LOCALE = 'en-GB'
const DISPLAY_TIME_ZONE = 'Europe/London'

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** `1 Sep 2026, 14:05` (UK time) from an ISO timestamp. */
export function formatDateTimeGb(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DISPLAY_TIME_ZONE,
  }).format(d)
}

/** `1 Sep 2026, 14:05:09` (UK time) — for run logs where seconds matter. */
export function formatDateTimeSecondsGb(value: string | null | undefined): string {
  const d = toDate(value)
  if (!d) return value ? String(value) : '—'
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: DISPLAY_TIME_ZONE,
  }).format(d)
}

/** `1 Sep, 14:05:09` (UK time, no year) — compact column format for run logs. */
export function formatShortDateTimeSecondsGb(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: DISPLAY_TIME_ZONE,
  }).format(d)
}

/** True when both instants fall on the same UK calendar day. */
export function isSameUkDay(a: string | Date | null | undefined, b: string | Date | null | undefined): boolean {
  const da = toDate(a)
  const db = toDate(b)
  if (!da || !db) return false
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: DISPLAY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
  return day.format(da) === day.format(db)
}

/** `14:05:09` (UK time). */
export function formatTimeSecondsGb(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: DISPLAY_TIME_ZONE,
  }).format(d)
}

/**
 * `just now`, `5 minutes ago`, `in 3 hours`, `yesterday`, `4 days ago`. `null` → `never`.
 * Future timestamps read as `in …`.
 */
export function formatRelativeTime(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return 'never'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'unknown'
  const diffSec = Math.round((d.getTime() - now.getTime()) / 1000)
  const abs = Math.abs(diffSec)
  if (abs < 45) return 'just now'
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })
  if (abs < 45 * 60) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 22 * 3600) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 26 * 86400) return rtf.format(Math.round(diffSec / 86400), 'day')
  if (abs < 320 * 86400) return rtf.format(Math.round(diffSec / (30 * 86400)), 'month')
  return rtf.format(Math.round(diffSec / (365 * 86400)), 'year')
}

/** `850 ms`, `12s`, `1m 05s`, `1h 02m`. Missing / negative / non-finite → `—`. */
export function formatDurationMs(ms: number | null | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(s).padStart(2, '0')}s`
}
