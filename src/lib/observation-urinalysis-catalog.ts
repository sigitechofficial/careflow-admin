export type UrinalysisOption = { value: string; label: string }

export const URINE_OBSERVATIONS: UrinalysisOption[] = [
  { value: 'CLEAR_PALE', label: 'Clear / pale' },
  { value: 'CLEAR_YELLOW', label: 'Clear / yellow' },
  { value: 'CLOUDY', label: 'Cloudy' },
  { value: 'DARK', label: 'Dark' },
  { value: 'BLOOD_STAINED', label: 'Blood stained' },
  { value: 'FOUL_SMELL', label: 'Foul smell' },
  { value: 'INCONTINENCE', label: 'Incontinent sample' },
  { value: 'UNKNOWN', label: 'Unknown' },
  { value: 'OTHER', label: 'Other (record below)' },
]

export const URINALYSIS_DIPSTICK_OPTIONS = [
  { value: 'NOT_TAKEN', label: 'Dipstick not taken' },
  { value: 'NORMAL_RANGE', label: 'Normal range' },
  { value: 'DIPSTICK_RESULT', label: 'Dipstick result' },
] as const

export type UrinalysisDipstick = (typeof URINALYSIS_DIPSTICK_OPTIONS)[number]['value']

export function urinalysisOptionLabel(
  options: UrinalysisOption[],
  value: string | undefined,
): string {
  if (!value) return '—'
  return options.find(o => o.value === value)?.label ?? value.replace(/_/g, ' ')
}

export function dipstickLabel(value: string | undefined): string {
  if (!value) return 'Dipstick not taken'
  return URINALYSIS_DIPSTICK_OPTIONS.find(o => o.value === value)?.label ?? value.replace(/_/g, ' ')
}
