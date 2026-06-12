import type { VitalFieldKey, VitalAcceptedRangesMetadata } from '@/features/service-users/initial-assessment/utils/vitals-validation'

export type VitalAcceptedRangeLookupRow = {
  fieldKey: VitalFieldKey
  label: string
  unit: string
  min: number
  max: number
  sortOrder: number
  column: 'left' | 'right'
  /** UK reference source shown in guidance (RESTORE2 / NEWS2 / NICE). */
  referenceNote: string
}

/**
 * RESTORE2 / NEWS2 score-0 reference ranges for domiciliary and care settings (CQC-endorsed).
 * Diastolic BP and blood glucose use NHS / NICE thresholds (not scored in NEWS2).
 * Mirrors backend `vital-accepted-ranges.defaults.ts`.
 */
export const VITAL_ACCEPTED_RANGE_LOOKUP: VitalAcceptedRangeLookupRow[] = [
  {
    fieldKey: 'temperature',
    label: 'Temperature',
    unit: '°C',
    min: 36.1,
    max: 38.0,
    sortOrder: 1,
    column: 'left',
    referenceNote: 'NEWS2 / RESTORE2 score 0',
  },
  {
    fieldKey: 'respirations',
    label: 'Respirations',
    unit: '/min',
    min: 12,
    max: 20,
    sortOrder: 2,
    column: 'left',
    referenceNote: 'NEWS2 / RESTORE2 score 0',
  },
  {
    fieldKey: 'bpDiastolic',
    label: 'Diastolic BP',
    unit: 'mmHg',
    min: 60,
    max: 90,
    sortOrder: 3,
    column: 'left',
    referenceNote: 'NHS adult (not scored in NEWS2)',
  },
  {
    fieldKey: 'bloodGlucose',
    label: 'Blood glucose',
    unit: 'mmol/L',
    min: 4.0,
    max: 11.0,
    sortOrder: 4,
    column: 'left',
    referenceNote: 'NICE review if <4.0 or >11.0',
  },
  {
    fieldKey: 'pulse',
    label: 'Pulse',
    unit: 'bpm',
    min: 51,
    max: 90,
    sortOrder: 5,
    column: 'right',
    referenceNote: 'NEWS2 / RESTORE2 score 0',
  },
  {
    fieldKey: 'bpSystolic',
    label: 'Systolic BP',
    unit: 'mmHg',
    min: 111,
    max: 219,
    sortOrder: 6,
    column: 'right',
    referenceNote: 'NEWS2 / RESTORE2 score 0 (systolic only)',
  },
  {
    fieldKey: 'spo2',
    label: 'SpO₂',
    unit: '%',
    min: 96,
    max: 100,
    sortOrder: 7,
    column: 'right',
    referenceNote: 'NEWS2 Scale 1 on air (≥96%)',
  },
]

export function formatVitalAcceptedRangeValue(min: number, max: number, unit: string): string {
  const formatNum = (n: number) => (Number.isInteger(n) ? String(n) : String(n))
  const unitSuffix = unit.startsWith('/') ? unit : ` ${unit}`
  return `${formatNum(min)}–${formatNum(max)}${unitSuffix}`
}

export function vitalAcceptedRangesFromLookup(
  rows: VitalAcceptedRangeLookupRow[],
): VitalAcceptedRangesMetadata {
  const out = {} as VitalAcceptedRangesMetadata
  for (const row of rows) {
    out[row.fieldKey] = { min: row.min, max: row.max }
  }
  return out
}

export function lookupRowsByColumn(
  rows: VitalAcceptedRangeLookupRow[],
  column: 'left' | 'right',
): VitalAcceptedRangeLookupRow[] {
  return [...rows].filter((row) => row.column === column).sort((a, b) => a.sortOrder - b.sortOrder)
}
