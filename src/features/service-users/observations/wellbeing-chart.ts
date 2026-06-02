import type { ServiceUserObservationRow, WellbeingScaleDimension } from '@/features/service-users/api/observations-api'

/** Match legacy care chart scale (1 → -0.8, 5 → 1.0). */
export function wellbeingLevelToRadarValue(level: number): number {
  const clamped = Math.min(5, Math.max(1, level))
  return -0.8 + (clamped - 1) * 0.45
}

export type WellbeingRadarPoint = {
  subject: string
  Average: number
  Current: number
}

export function buildWellbeingRadarData(
  dimensions: WellbeingScaleDimension[],
  averageLevels: Record<string, number>,
  currentLevels: Record<string, number>,
): WellbeingRadarPoint[] {
  return dimensions.map(dim => ({
    subject: dim.name,
    Average: wellbeingLevelToRadarValue(averageLevels[dim.code] ?? 1),
    Current: wellbeingLevelToRadarValue(currentLevels[dim.code] ?? 1),
  }))
}

export function levelsFromObservation(
  row: ServiceUserObservationRow,
  dimensions: WellbeingScaleDimension[],
): Record<string, number> {
  const levels: Record<string, number> = {}
  for (const dim of dimensions) {
    const score = row.wellbeingScores.find(s => s.dimensionCode === dim.code)
    levels[dim.code] = score?.level ?? 1
  }
  return levels
}

export function computeAverageWellbeingLevels(
  rows: ServiceUserObservationRow[],
  dimensions: WellbeingScaleDimension[],
): Record<string, number> {
  const sums: Record<string, { sum: number; count: number }> = {}
  for (const dim of dimensions) {
    sums[dim.code] = { sum: 0, count: 0 }
  }
  for (const row of rows) {
    for (const score of row.wellbeingScores) {
      const bucket = sums[score.dimensionCode]
      if (!bucket) continue
      bucket.sum += score.level
      bucket.count += 1
    }
  }
  const levels: Record<string, number> = {}
  for (const dim of dimensions) {
    const bucket = sums[dim.code]
    levels[dim.code] = bucket && bucket.count > 0 ? bucket.sum / bucket.count : 1
  }
  return levels
}

export function defaultWellbeingLevels(dimensions: WellbeingScaleDimension[]): Record<string, number> {
  const levels: Record<string, number> = {}
  for (const dim of dimensions) levels[dim.code] = 1
  return levels
}
