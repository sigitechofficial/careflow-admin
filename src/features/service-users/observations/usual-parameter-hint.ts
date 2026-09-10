import type {
  MonitoringConfigRow,
  UsualParameterRow,
} from '@/features/alerts/api/medical-clinical.types'
import { MEDICAL_MONITORING_KEYS } from '@/features/alerts/api/medical-clinical.types'

/** Observation type codes that have Usual Parameter rows in Medical & Alerts. */
export const USUAL_PARAMETER_TYPE_CODES = [
  'HEIGHT',
  'BLOOD_PRESSURE',
  'BLOOD_SUGAR',
  'RESPIRATION',
  'PULSE',
  'TEMPERATURE',
  'OXYGEN_SATURATION',
  'RESPIRATORY_CONDITION',
] as const

export function findUsualParameterForType(
  rows: UsualParameterRow[] | undefined,
  typeCode: string,
): UsualParameterRow | null {
  if (!rows?.length) return null
  const code = typeCode.trim().toUpperCase()
  const match = rows.find(
    (r) => r.enabled && r.observationType?.code?.toUpperCase() === code,
  )
  return match ?? null
}

export function formatUsualParameterHint(row: UsualParameterRow | null | undefined): string | null {
  if (!row || !row.enabled) return null
  const usual =
    row.usualTextValue?.trim() ||
    (row.usualNumericValue != null ? String(row.usualNumericValue) : null)
  const lower = row.lowerBand != null ? String(row.lowerBand) : null
  const upper = row.upperBand != null ? String(row.upperBand) : null
  if (!usual && !lower && !upper) return null

  const parts: string[] = []
  if (usual) parts.push(`Usual ${usual}`)
  if (lower != null || upper != null) {
    parts.push(`Range ${lower ?? '—'}–${upper ?? '—'}`)
  }
  return parts.join(' · ')
}

export type BandCheckResult = 'ok' | 'below' | 'above' | 'skip'

/**
 * Compare a numeric reading to enabled lower/upper bands.
 * Skips when bands are missing or the value is not a finite number.
 */
export function checkNumericAgainstUsualBands(
  row: UsualParameterRow | null | undefined,
  numericValue: number | null | undefined,
): BandCheckResult {
  if (!row?.enabled || numericValue == null || !Number.isFinite(numericValue)) return 'skip'
  if (row.lowerBand != null && numericValue < row.lowerBand) return 'below'
  if (row.upperBand != null && numericValue > row.upperBand) return 'above'
  return 'ok'
}

export function findWeightChangeThresholdKg(
  rows: MonitoringConfigRow[] | undefined,
): number | null {
  const row = rows?.find(
    (r) => r.configKey === MEDICAL_MONITORING_KEYS.WEIGHT_CHANGE_THRESHOLD_KG && r.enabled,
  )
  return row?.numericValue != null && Number.isFinite(row.numericValue) ? row.numericValue : null
}

export function isFluidTargetRequired(rows: MonitoringConfigRow[] | undefined): boolean {
  const row = rows?.find(
    (r) => r.configKey === MEDICAL_MONITORING_KEYS.FLUID_TARGET_REQUIRED && r.enabled,
  )
  return Boolean(row?.booleanValue)
}

export function formatWeightThresholdHint(thresholdKg: number | null): string | null {
  if (thresholdKg == null) return null
  return `Alert parameter: notify on weight change of ${thresholdKg} kg or more (configured on Medical & Alerts).`
}

export function formatFluidTargetHint(required: boolean): string | null {
  if (!required) return null
  return 'Alert parameter: fluid target is marked required for this service user (Medical & Alerts).'
}
