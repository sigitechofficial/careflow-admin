/** Pure helpers for date-range presets and request payload building (estimate + settings). */
import {
  DB_SKUS,
  type CostShareRow,
  type DbSku,
  type EstimateInput,
  type PlatformCostSettingsInput,
} from '@/features/azure-pricing/types'

/* ─── Date range presets ────────────────────────────────────────────────── */

export const DATE_RANGE_PRESETS = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-30', label: 'Last 30 days' },
  { id: 'last-90', label: 'Last 90 days' },
  { id: 'custom', label: 'Custom range' },
] as const

export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number]['id']

export interface DateRange {
  from: string
  to: string
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Local calendar date → `YYYY-MM-DD` (the browser is assumed to be in UK time). */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  out.setDate(out.getDate() + days)
  return out
}

/** `YYYY-MM` for the given local date. */
export function toIsoMonth(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

/**
 * Resolve a preset into an inclusive `{from, to}` range.
 * `custom` returns the supplied custom range (or this month when it is missing/invalid).
 */
export function resolveDateRange(
  preset: DateRangePreset,
  today: Date = new Date(),
  custom?: Partial<DateRange>,
): DateRange {
  const y = today.getFullYear()
  const m = today.getMonth()
  switch (preset) {
    case 'last-month': {
      const first = new Date(y, m - 1, 1)
      const last = new Date(y, m, 0)
      return { from: toIsoDate(first), to: toIsoDate(last) }
    }
    case 'last-30':
      return { from: toIsoDate(addDays(today, -29)), to: toIsoDate(today) }
    case 'last-90':
      return { from: toIsoDate(addDays(today, -89)), to: toIsoDate(today) }
    case 'custom':
      if (custom?.from && custom?.to && isValidDateRange({ from: custom.from, to: custom.to })) {
        return { from: custom.from, to: custom.to }
      }
      return resolveDateRange('this-month', today)
    case 'this-month':
    default:
      return { from: toIsoDate(new Date(y, m, 1)), to: toIsoDate(today) }
  }
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidDateRange(range: Partial<DateRange>): range is DateRange {
  if (!range.from || !range.to) return false
  if (!ISO_DATE_RE.test(range.from) || !ISO_DATE_RE.test(range.to)) return false
  return range.from <= range.to
}

/** Last `count` months (newest first) as select options. */
export function recentMonthOptions(today: Date = new Date(), count = 12): { value: string; date: Date }[] {
  const out: { value: string; date: Date }[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    out.push({ value: toIsoMonth(d), date: d })
  }
  return out
}

/* ─── Breakdown table sorting ───────────────────────────────────────────── */

export type BreakdownSortKey = 'label' | 'cost' | 'share'
export type SortDirection = 'asc' | 'desc'

export function sortCostRows(rows: CostShareRow[], key: BreakdownSortKey, dir: SortDirection): CostShareRow[] {
  const factor = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (key === 'label') return factor * a.label.localeCompare(b.label, 'en-GB', { sensitivity: 'base' })
    return factor * ((a[key] ?? 0) - (b[key] ?? 0))
  })
}

/* ─── What-if estimate payload ──────────────────────────────────────────── */

/** Current production architecture — used until the baseline tells us otherwise. */
export const DEFAULT_ESTIMATE_INPUT: EstimateInput = {
  apiReplicas: 1,
  apiVcpu: 0.5,
  apiMemoryGiB: 1,
  dbSku: 'B1ms',
  dbStorageGiB: 32,
  dbHighAvailability: false,
  privateEndpoints: 0,
  logGbPerDay: 0.5,
  storageGiB: 100,
  emailsPerMonth: 2000,
}

/** Form state keeps numbers as strings so users can clear a field while typing. */
export type EstimateFormValues = {
  [K in keyof EstimateInput]: EstimateInput[K] extends number ? string : EstimateInput[K]
}

export function estimateInputToForm(input: EstimateInput): EstimateFormValues {
  return {
    apiReplicas: String(input.apiReplicas),
    apiVcpu: String(input.apiVcpu),
    apiMemoryGiB: String(input.apiMemoryGiB),
    dbSku: input.dbSku,
    dbStorageGiB: String(input.dbStorageGiB),
    dbHighAvailability: input.dbHighAvailability,
    privateEndpoints: String(input.privateEndpoints),
    logGbPerDay: String(input.logGbPerDay),
    storageGiB: String(input.storageGiB),
    emailsPerMonth: String(input.emailsPerMonth),
  }
}

interface NumericRule {
  label: string
  min: number
  max: number
  integer?: boolean
}

export const ESTIMATE_NUMERIC_RULES: Record<Exclude<keyof EstimateInput, 'dbSku' | 'dbHighAvailability'>, NumericRule> = {
  apiReplicas: { label: 'API replicas', min: 0, max: 30, integer: true },
  apiVcpu: { label: 'vCPU per replica', min: 0.25, max: 4 },
  apiMemoryGiB: { label: 'Memory per replica (GiB)', min: 0.5, max: 8 },
  dbStorageGiB: { label: 'Database storage (GiB)', min: 32, max: 16384, integer: true },
  privateEndpoints: { label: 'Private endpoints', min: 0, max: 50, integer: true },
  logGbPerDay: { label: 'Log ingestion (GB/day)', min: 0, max: 100 },
  storageGiB: { label: 'File storage (GiB)', min: 0, max: 102400 },
  emailsPerMonth: { label: 'Emails per month', min: 0, max: 10_000_000, integer: true },
}

export type EstimateFieldErrors = Partial<Record<keyof EstimateInput, string>>

export type BuildResult<T, E> = { ok: true; payload: T } | { ok: false; errors: E }

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

/** Validate form values and build the `POST /platform-costs/estimate` body. */
export function buildEstimatePayload(values: EstimateFormValues): BuildResult<EstimateInput, EstimateFieldErrors> {
  const errors: EstimateFieldErrors = {}
  const numbers: Partial<Record<keyof EstimateInput, number>> = {}

  for (const [key, rule] of Object.entries(ESTIMATE_NUMERIC_RULES) as [
    keyof typeof ESTIMATE_NUMERIC_RULES,
    NumericRule,
  ][]) {
    const n = parseNumber(values[key])
    if (n === null) {
      errors[key] = `${rule.label} is required`
      continue
    }
    if (rule.integer && !Number.isInteger(n)) {
      errors[key] = `${rule.label} must be a whole number`
      continue
    }
    if (n < rule.min || n > rule.max) {
      errors[key] = `${rule.label} must be between ${rule.min.toLocaleString('en-GB')} and ${rule.max.toLocaleString('en-GB')}`
      continue
    }
    numbers[key] = n
  }

  if (!(DB_SKUS as readonly string[]).includes(values.dbSku)) {
    errors.dbSku = 'Choose a database SKU'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    payload: {
      apiReplicas: numbers.apiReplicas!,
      apiVcpu: numbers.apiVcpu!,
      apiMemoryGiB: numbers.apiMemoryGiB!,
      dbSku: values.dbSku as DbSku,
      dbStorageGiB: numbers.dbStorageGiB!,
      dbHighAvailability: Boolean(values.dbHighAvailability),
      privateEndpoints: numbers.privateEndpoints!,
      logGbPerDay: numbers.logGbPerDay!,
      storageGiB: numbers.storageGiB!,
      emailsPerMonth: numbers.emailsPerMonth!,
    },
  }
}

/* ─── Settings payload ──────────────────────────────────────────────────── */

// Pragmatic address check (same shape the API's class-validator IsEmail accepts for normal addresses).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** API limit (`ArrayMaxSize(20)` on the settings DTO). */
export const MAX_RECIPIENTS = 20

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

/** Trim, lower-case, de-duplicate recipients (keeps first-seen order). */
export function normaliseRecipients(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    const email = raw.trim().toLowerCase()
    if (!email || seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }
  return out
}

export interface SettingsFormValues {
  anomalyThresholdPercent: string
  anomalyMinDailyIncrease: string
  monthlyReportEnabled: boolean
  monthlyReportRecipients: string[]
}

export type SettingsFieldErrors = Partial<Record<keyof SettingsFormValues, string>>

export function settingsToForm(s: PlatformCostSettingsInput): SettingsFormValues {
  return {
    anomalyThresholdPercent: String(s.anomalyThresholdPercent),
    anomalyMinDailyIncrease: String(s.anomalyMinDailyIncrease),
    monthlyReportEnabled: s.monthlyReportEnabled,
    monthlyReportRecipients: [...s.monthlyReportRecipients],
  }
}

/** Validate the settings form and build the `PATCH /platform-costs/settings` body. */
export function buildSettingsPayload(
  values: SettingsFormValues,
): BuildResult<PlatformCostSettingsInput, SettingsFieldErrors> {
  const errors: SettingsFieldErrors = {}

  const threshold = parseNumber(values.anomalyThresholdPercent)
  if (threshold === null) errors.anomalyThresholdPercent = 'Threshold is required'
  else if (!Number.isInteger(threshold)) errors.anomalyThresholdPercent = 'Threshold must be a whole number'
  else if (threshold < 1 || threshold > 1000) errors.anomalyThresholdPercent = 'Threshold must be between 1% and 1000%'

  const minIncrease = parseNumber(values.anomalyMinDailyIncrease)
  if (minIncrease === null) errors.anomalyMinDailyIncrease = 'Minimum daily increase is required'
  else if (minIncrease < 0 || minIncrease > 100000) errors.anomalyMinDailyIncrease = 'Minimum daily increase must be between £0 and £100,000'

  const recipients = normaliseRecipients(values.monthlyReportRecipients)
  const invalid = recipients.filter(e => !isValidEmail(e))
  if (invalid.length > 0) {
    errors.monthlyReportRecipients = `Invalid email address: ${invalid.join(', ')}`
  } else if (recipients.length > MAX_RECIPIENTS) {
    errors.monthlyReportRecipients = `No more than ${MAX_RECIPIENTS} recipients`
  } else if (values.monthlyReportEnabled && recipients.length === 0) {
    errors.monthlyReportRecipients = 'Add at least one recipient or switch the monthly report off'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    payload: {
      anomalyThresholdPercent: threshold!,
      anomalyMinDailyIncrease: Math.round(minIncrease! * 100) / 100,
      monthlyReportEnabled: values.monthlyReportEnabled,
      monthlyReportRecipients: recipients,
    },
  }
}
