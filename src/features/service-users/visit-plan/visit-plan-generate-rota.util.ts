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

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
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
