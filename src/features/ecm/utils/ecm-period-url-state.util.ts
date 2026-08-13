/**
 * URL contract for shared ECM operational period (Live / Graphs / Reports / Compliance).
 *
 * Query params:
 * - `period` — preset id (`today`, `last_14_days`, `custom`, …)
 * - `from` / `to` — YYYY-MM-DD (required for `custom`; omitted for named presets)
 * - `date` — legacy single-day deep link (treated as custom from=to=date)
 *
 * Named presets re-resolve against organisation operational "today" on load (relative).
 * Custom (and legacy `date`) are absolute calendar ranges.
 * Location stays on the global location scope store (not duplicated in URL).
 */

import {
  type EcmOperationalPeriod,
  type EcmOperationalPeriodPreset,
  periodFromPreset,
  todayIsoLocal,
} from '@/features/ecm/utils/ecm-operational-period.util'

const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/

const PERIOD_PRESETS: readonly EcmOperationalPeriodPreset[] = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'last_14_days',
  'last_30_days',
  'this_month',
  'last_month',
  'month_to_date',
  'quarter_to_date',
  'year_to_date',
  'custom',
] as const

const PRESET_SET = new Set<string>(PERIOD_PRESETS)

export type EcmPeriodUrlSearch = {
  period?: string
  from?: string
  to?: string
  /** @deprecated Prefer period/from/to. Single-day deep link. */
  date?: string
}

export function isIsoDayString(value: unknown): value is string {
  return typeof value === 'string' && ISO_DAY_RE.test(value)
}

export function parseEcmPeriodPreset(value: unknown): EcmOperationalPeriodPreset | null {
  if (typeof value !== 'string' || !PRESET_SET.has(value)) return null
  return value as EcmOperationalPeriodPreset
}

function orderedRange(from: string, to: string): { dateFrom: string; dateTo: string } {
  return from <= to ? { dateFrom: from, dateTo: to } : { dateFrom: to, dateTo: from }
}

/** True when the URL carries an explicit period signal. */
export function ecmPeriodSearchHasExplicitPeriod(search: EcmPeriodUrlSearch): boolean {
  return Boolean(
    parseEcmPeriodPreset(search.period) ||
      isIsoDayString(search.from) ||
      isIsoDayString(search.to) ||
      isIsoDayString(search.date),
  )
}

/**
 * Resolve operational period from URL search, optional in-memory fallback, then default preset.
 */
export function resolveEcmPeriodFromSearch(
  search: EcmPeriodUrlSearch,
  fallback: EcmOperationalPeriod | null,
  defaultPreset: EcmOperationalPeriodPreset = 'today',
  today = todayIsoLocal(),
): EcmOperationalPeriod {
  const preset = parseEcmPeriodPreset(search.period)
  const from = isIsoDayString(search.from) ? search.from : null
  const to = isIsoDayString(search.to) ? search.to : null
  const legacyDate = isIsoDayString(search.date) ? search.date : null

  if (preset && preset !== 'custom') {
    return { preset, ...periodFromPreset(preset, today) }
  }

  if (preset === 'custom' && from && to) {
    return { preset: 'custom', ...orderedRange(from, to) }
  }

  if (from && to) {
    return { preset: 'custom', ...orderedRange(from, to) }
  }

  if (legacyDate) {
    return { preset: 'custom', dateFrom: legacyDate, dateTo: legacyDate }
  }

  if (from || to) {
    const day = (from ?? to)!
    return { preset: 'custom', dateFrom: day, dateTo: day }
  }

  if (fallback) return fallback

  if (defaultPreset === 'custom') {
    return { preset: 'custom', dateFrom: today, dateTo: today }
  }
  return { preset: defaultPreset, ...periodFromPreset(defaultPreset, today) }
}

/** Serialize period for route search (drops legacy `date`). */
export function buildEcmPeriodSearch(period: EcmOperationalPeriod): EcmPeriodUrlSearch {
  if (period.preset === 'custom') {
    return {
      period: 'custom',
      from: period.dateFrom,
      to: period.dateTo,
    }
  }
  return { period: period.preset }
}

/**
 * Validate/coerce raw router search into the ECM period URL contract.
 * Safe for TanStack `validateSearch`.
 */
export function validateEcmPeriodSearch(raw: Record<string, unknown>): EcmPeriodUrlSearch {
  const out: EcmPeriodUrlSearch = {}
  const preset = parseEcmPeriodPreset(raw.period)
  if (preset) out.period = preset
  if (isIsoDayString(raw.from)) out.from = raw.from
  if (isIsoDayString(raw.to)) out.to = raw.to
  if (isIsoDayString(raw.date)) out.date = raw.date
  return out
}

/** True when URL already matches the serialized period contract (and has no leftover legacy `date`). */
export function ecmPeriodUrlMatches(
  current: EcmPeriodUrlSearch,
  desired: EcmPeriodUrlSearch,
): boolean {
  if (current.date) return false
  return (
    (current.period ?? undefined) === (desired.period ?? undefined) &&
    (current.from ?? undefined) === (desired.from ?? undefined) &&
    (current.to ?? undefined) === (desired.to ?? undefined)
  )
}

/**
 * Whether the route search should be rewritten to `desired`.
 * Used by the operational-period hook so refresh / multi-mount sync stays idempotent.
 */
export function shouldUpdateEcmPeriodSearch(
  current: EcmPeriodUrlSearch,
  desired: EcmPeriodUrlSearch,
): boolean {
  return !ecmPeriodUrlMatches(current, desired)
}

export function periodsEqual(a: EcmOperationalPeriod, b: EcmOperationalPeriod): boolean {
  return a.preset === b.preset && a.dateFrom === b.dateFrom && a.dateTo === b.dateTo
}
