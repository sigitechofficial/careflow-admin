export const DEFAULT_GENERATE_ROTA_DAYS = 14

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

/** When To is blank, generate through the next 14 days (inclusive of From). */
export function resolveGenerateRotaToDate(fromDate: string, toDate?: string | null): string {
  const trimmedTo = toDate?.trim()
  if (trimmedTo) return trimmedTo
  const from = fromDate?.trim() || todayIsoDate()
  return addDaysToIsoDate(from, DEFAULT_GENERATE_ROTA_DAYS - 1)
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}
