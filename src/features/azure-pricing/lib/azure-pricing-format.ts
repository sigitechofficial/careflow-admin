/** Pure formatting helpers for the Azure Pricing area (GBP, en-GB). No React imports. */

const LOCALE = 'en-GB'
const DISPLAY_TIME_ZONE = 'Europe/London'

const moneyFormatters = new Map<string, Intl.NumberFormat>()

function moneyFormatter(currency: string, minimumFractionDigits: number, maximumFractionDigits: number) {
  const key = `${currency}:${minimumFractionDigits}:${maximumFractionDigits}`
  let f = moneyFormatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    })
    moneyFormatters.set(key, f)
  }
  return f
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** `£1,234.50`. `null`/`undefined`/NaN → em dash. */
export function formatMoney(value: number | null | undefined, currency = 'GBP'): string {
  if (!isFiniteNumber(value)) return '—'
  return moneyFormatter(currency, 2, 2).format(value)
}

/** Compact money for chart axes: `£0`, `£12`, `£1.2k`. */
export function formatMoneyAxis(value: number, currency = 'GBP'): string {
  if (!isFiniteNumber(value)) return ''
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  const whole = Math.abs(value) >= 10 || Number.isInteger(value)
  return (whole ? moneyFormatter(currency, 0, 0) : moneyFormatter(currency, 2, 2)).format(value)
}

/**
 * Unit prices can be tiny (e.g. £0.0000216 per vCPU-second). Show at least 2 dp and up to
 * 6 significant decimals so the value never collapses to £0.00.
 */
export function formatUnitPrice(value: number | null | undefined, currency = 'GBP'): string {
  if (!isFiniteNumber(value)) return '—'
  if (value === 0) return moneyFormatter(currency, 2, 2).format(0)
  const abs = Math.abs(value)
  let maxDigits = 2
  if (abs < 1) {
    // At least 4 dp (list prices are quoted that way), and enough for 3 significant figures; max 8.
    const leadingZeros = Math.max(0, -Math.floor(Math.log10(abs)) - 1)
    maxDigits = Math.min(8, Math.max(4, leadingZeros + 3))
  }
  return moneyFormatter(currency, 2, maxDigits).format(value)
}

/** Signed money difference: `+£4.20`, `−£1.00`, `£0.00`. */
export function formatMoneyDifference(value: number | null | undefined, currency = 'GBP'): string {
  if (!isFiniteNumber(value)) return '—'
  const rounded = Math.round(value * 100) / 100
  if (rounded === 0) return moneyFormatter(currency, 2, 2).format(0)
  const abs = moneyFormatter(currency, 2, 2).format(Math.abs(rounded))
  return rounded > 0 ? `+${abs}` : `−${abs}`
}

/** `23.4%`. */
export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (!isFiniteNumber(value)) return '—'
  return `${value.toLocaleString(LOCALE, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`
}

/** `+12.5%` / `−3.0%` / `0.0%`. */
export function formatSignedPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (!isFiniteNumber(value)) return '—'
  const factor = 10 ** fractionDigits
  const rounded = Math.round(value * factor) / factor
  if (rounded === 0) return formatPercent(0, fractionDigits)
  const abs = formatPercent(Math.abs(rounded), fractionDigits)
  return rounded > 0 ? `+${abs}` : `−${abs}`
}

export function formatCount(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return '—'
  return value.toLocaleString(LOCALE)
}

export type ChangeDirection = 'up' | 'down' | 'flat' | 'none'

/** Direction of a percentage change; `none` when there is no comparison value. */
export function changeDirection(percent: number | null | undefined, epsilon = 0.05): ChangeDirection {
  if (!isFiniteNumber(percent)) return 'none'
  if (Math.abs(percent) < epsilon) return 'flat'
  return percent > 0 ? 'up' : 'down'
}

/* ─── Dates ─────────────────────────────────────────────────────────────── */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Parse `YYYY-MM-DD` as a UTC date (no timezone drift). */
export function parseIsoDate(value: string): Date | null {
  const m = ISO_DATE_RE.exec(value)
  if (!m) return null
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return Number.isNaN(d.getTime()) ? null : d
}

/** `1 Sep 2026` from `2026-09-01`. */
export function formatDateGb(value: string | null | undefined): string {
  if (!value) return '—'
  const d = parseIsoDate(value.slice(0, 10))
  if (!d) return value
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

/** `1 Sep` from `2026-09-01` (chart axes). */
export function formatShortDateGb(value: string): string {
  const d = parseIsoDate(value.slice(0, 10))
  if (!d) return value
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d)
}

/** `September 2026` from `2026-09`. */
export function formatMonthGb(value: string | null | undefined, style: 'long' | 'short' = 'long'): string {
  if (!value) return '—'
  const d = parseIsoDate(`${value.slice(0, 7)}-01`)
  if (!d) return value
  return new Intl.DateTimeFormat(LOCALE, { month: style, year: 'numeric', timeZone: 'UTC' }).format(d)
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

/** `just now`, `5 minutes ago`, `3 hours ago`, `yesterday`, `4 days ago`. `null` → `never`. */
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

/** `850 ms`, `12s`, `1m 05s`, `1h 02m`. Running (no finish) → `—`. */
export function formatDuration(startedAt: string | null | undefined, finishedAt: string | null | undefined): string {
  if (!startedAt || !finishedAt) return '—'
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1000) return `${ms} ms`
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

/* ─── Budget thresholds ─────────────────────────────────────────────────── */

/** Alert thresholds configured on `budget-careflow-prod` (actual spend). */
export const BUDGET_THRESHOLDS = [50, 70, 85, 95] as const

export type BudgetTone = 'ok' | 'notice' | 'warning' | 'high' | 'critical'

/** Colour band for a budget % used: <50 ok · 50 notice · 70 warning · 85 high · 95+ critical. */
export function budgetTone(percentUsed: number | null | undefined): BudgetTone {
  if (!isFiniteNumber(percentUsed) || percentUsed < 50) return 'ok'
  if (percentUsed < 70) return 'notice'
  if (percentUsed < 85) return 'warning'
  if (percentUsed < 95) return 'high'
  return 'critical'
}

/** Tailwind classes per tone: bar fill, text and soft badge. Readable in light and dark mode. */
export const BUDGET_TONE_CLASSES: Record<BudgetTone, { bar: string; text: string; label: string }> = {
  ok: { bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', label: 'On track' },
  notice: { bar: 'bg-yellow-500', text: 'text-yellow-700 dark:text-yellow-300', label: 'Over 50%' },
  warning: { bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', label: 'Over 70%' },
  high: { bar: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', label: 'Over 85%' },
  critical: { bar: 'bg-red-600', text: 'text-red-700 dark:text-red-300', label: 'Over 95%' },
}

/** Standard thresholds crossed by the current % used (ascending). */
export function reachedThresholds(
  percentUsed: number | null | undefined,
  thresholds: readonly number[] = BUDGET_THRESHOLDS,
): number[] {
  if (!isFiniteNumber(percentUsed)) return []
  return thresholds.filter(t => percentUsed >= t)
}

/** Clamp a percentage for a progress bar width. */
export function clampPercent(value: number | null | undefined, max = 100): number {
  if (!isFiniteNumber(value)) return 0
  return Math.min(max, Math.max(0, value))
}
