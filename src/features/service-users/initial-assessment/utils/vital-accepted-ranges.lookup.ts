import type { VitalFieldKey, VitalAcceptedRangesMetadata } from '@/features/service-users/initial-assessment/utils/vitals-validation'

export type VitalAcceptedRangeLookupRow = {
  fieldKey: VitalFieldKey
  label: string
  unit: string
  min: number
  max: number
  sortOrder: number
  column: 'left' | 'right'
}

/** Mirrors backend `initial-assessment-vital-ranges.lookup.ts` — used offline until API loads. */
export const VITAL_ACCEPTED_RANGE_LOOKUP: VitalAcceptedRangeLookupRow[] = [
  { fieldKey: 'temperature', label: 'Temperature', unit: '°C', min: 30, max: 45, sortOrder: 1, column: 'left' },
  { fieldKey: 'respirations', label: 'Respirations', unit: '/min', min: 5, max: 60, sortOrder: 2, column: 'left' },
  { fieldKey: 'bpDiastolic', label: 'Diastolic BP', unit: 'mmHg', min: 30, max: 150, sortOrder: 3, column: 'left' },
  { fieldKey: 'bloodGlucose', label: 'Blood glucose', unit: 'mmol/L', min: 1, max: 40, sortOrder: 4, column: 'left' },
  { fieldKey: 'pulse', label: 'Pulse', unit: 'bpm', min: 30, max: 250, sortOrder: 5, column: 'right' },
  { fieldKey: 'bpSystolic', label: 'Systolic BP', unit: 'mmHg', min: 50, max: 250, sortOrder: 6, column: 'right' },
  { fieldKey: 'spo2', label: 'SpO₂', unit: '%', min: 50, max: 100, sortOrder: 7, column: 'right' },
]

export function formatVitalAcceptedRangeValue(min: number, max: number, unit: string): string {
  const unitSuffix = unit.startsWith('/') ? unit : ` ${unit}`
  return `${min}–${max}${unitSuffix}`
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
