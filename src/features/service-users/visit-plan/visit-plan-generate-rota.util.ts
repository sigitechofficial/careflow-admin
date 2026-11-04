import { operationalTodayIso } from '@/shared/lib/operational-day.util'

export const DEFAULT_GENERATE_ROTA_DAYS = 28

export type RotaHorizonMode = 'FIXED_DAYS' | 'CALENDAR_MONTH'

export type GenerateRotaHorizonOptions = {
  horizonDays?: number
  mode?: RotaHorizonMode
}

function parseIsoDateUtc(isoDate: string): Date | null {
  const trimmed = isoDate?.trim()
  if (!trimmed) return null
  const date = new Date(`${trimmed}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = parseIsoDateUtc(isoDate) ?? parseIsoDateUtc(todayIsoDate())
  if (!date) return todayIsoDate()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function endOfMonthIsoDate(isoDate: string): string {
  const date = parseIsoDateUtc(isoDate)
  if (!date) return isoDate
  date.setUTCMonth(date.getUTCMonth() + 1, 0)
  return date.toISOString().slice(0, 10)
}

/** When To is blank, generate through the configured horizon (default 28 days inclusive of From). */
export function resolveGenerateRotaToDate(
  fromDate: string,
  toDate?: string | null,
  options?: GenerateRotaHorizonOptions,
): string {
  const trimmedTo = toDate?.trim()
  if (trimmedTo) return trimmedTo
  const from = fromDate?.trim() || todayIsoDate()
  const horizonDays = options?.horizonDays ?? DEFAULT_GENERATE_ROTA_DAYS
  const mode = options?.mode ?? 'FIXED_DAYS'
  if (mode === 'CALENDAR_MONTH') {
    return endOfMonthIsoDate(from)
  }
  return addDaysToIsoDate(from, horizonDays - 1)
}

/** How far a run with no To date goes, for buttons and placeholders ("28 days", "to month end"). */
export function generateRotaHorizonLabel(options?: GenerateRotaHorizonOptions): string {
  if ((options?.mode ?? 'FIXED_DAYS') === 'CALENDAR_MONTH') return 'to month end'
  const days = options?.horizonDays ?? DEFAULT_GENERATE_ROTA_DAYS
  return `${days} day${days === 1 ? '' : 's'}`
}

/** Rota "today" = organisation operational calendar, not UTC / browser. */
export function todayIsoDate(): string {
  return operationalTodayIso()
}

/** Visit-plan tab: show forward Regenerate rota (Step 5). When false, Backfill is Step 5. */
export const SHOW_GENERATE_ROTA_SECTION = true

/** Inclusive start of a backfill window ending the day before `rotaStartDate` (UTC date-only). */
export function resolveBackfillWindowStart(rotaStartDate: string, backfillDays: number): string {
  const days = Math.max(0, Math.floor(backfillDays))
  const start = rotaStartDate?.trim() || todayIsoDate()
  if (days <= 0) return start
  return addDaysToIsoDate(start, -days)
}

/** Last day included in a backfill-only window (day before rota start). */
export function resolveBackfillWindowEnd(rotaStartDate: string): string {
  return addDaysToIsoDate(rotaStartDate?.trim() || todayIsoDate(), -1)
}

/** Earliest enabled call Start Date — used as rota start for backfill. */
export function resolveRotaStartIsoDate(
  slots: Array<{ isEnabled?: boolean; slotEffectiveFrom?: string | null }>,
  planEffectiveFrom?: string | null,
): string | null {
  let earliest: string | null = null
  for (const slot of slots) {
    if (slot.isEnabled === false) continue
    const raw = slot.slotEffectiveFrom?.trim()
    if (!raw) continue
    const key = raw.slice(0, 10)
    if (!earliest || key < earliest) earliest = key
  }
  if (earliest) return earliest
  const planFrom = planEffectiveFrom?.trim()
  return planFrom ? planFrom.slice(0, 10) : null
}

/**
 * Most days back any enabled call can be backfilled. The organisation limit (Settings → Dom Care,
 * 0 = backfill off) applies to every call; a call with its own Max backfill days (> 0) is capped
 * by that too. Mirrors the API's maxAllowedBackfillDays.
 */
export function maxEnabledSlotBackfillDays(
  slots: Array<{ isEnabled?: boolean; allowBackfillDays?: number | null }>,
  orgMaxBackfillDays: number,
): number {
  const orgMax = Math.max(0, Math.floor(Number(orgMaxBackfillDays) || 0))
  if (orgMax <= 0) return 0
  let max = 0
  for (const slot of slots) {
    if (slot.isEnabled === false) continue
    const slotCap = Math.max(0, Math.floor(Number(slot.allowBackfillDays) || 0))
    const allowed = slotCap > 0 ? Math.min(slotCap, orgMax) : orgMax
    if (allowed > max) max = allowed
  }
  return max
}

export function buildGenerateRotaHorizonOptions(
  settings?: {
    domRotaHorizonDays?: number
    domRotaHorizonMode?: RotaHorizonMode
  } | null,
): GenerateRotaHorizonOptions | undefined {
  if (!settings) return undefined
  return {
    horizonDays: settings.domRotaHorizonDays,
    mode: settings.domRotaHorizonMode,
  }
}

export function defaultGenerateRotaToDatePlaceholder(horizonDays = DEFAULT_GENERATE_ROTA_DAYS): string {
  return `Next ${horizonDays} days`
}

export function calendarMonthGenerateRotaToDatePlaceholder(): string {
  return 'End of month'
}
