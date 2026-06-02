export type InfectionTypeOption = { value: string; label: string }

export const INFECTION_TYPES: InfectionTypeOption[] = [
  { value: 'COVID_19', label: 'COVID-19' },
  { value: 'C_DIFF', label: 'C.diff' },
  { value: 'E_COLI', label: 'E.coli' },
  { value: 'MRSA', label: 'MRSA' },
  { value: 'NOROVIRUS', label: 'Norovirus' },
  { value: 'UTI', label: 'UTI' },
]

export function infectionTypeLabel(value: string | undefined): string {
  if (!value) return '—'
  return INFECTION_TYPES.find(o => o.value === value)?.label ?? value.replace(/_/g, ' ')
}

export function yesNoLabel(value: boolean | string | undefined): string {
  if (value === true || value === 'true') return 'Yes'
  return 'No'
}
