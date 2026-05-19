/** Dropdown options for ABC pattern observations (reference care UI). */

export const ABC_LOCATIONS = [
  { value: 'LOUNGE', label: 'Lounge' },
  { value: 'BEDROOM', label: 'Bedroom' },
  { value: 'DINING', label: 'Dining room' },
  { value: 'BATHROOM', label: 'Bathroom' },
  { value: 'GARDEN', label: 'Garden' },
  { value: 'COMMUNAL', label: 'Communal area' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'CORRIDOR', label: 'Corridor' },
  { value: 'OUTSIDE', label: 'Outside' },
  { value: 'OTHER', label: 'Other' },
] as const

export const ABC_BEHAVIOUR_TYPES = [
  { value: 'PHYSICAL', label: 'Physical aggression' },
  { value: 'VERBAL', label: 'Verbal aggression' },
  { value: 'SELF_HARM', label: 'Self harm' },
  { value: 'PROPERTY', label: 'Property damage' },
  { value: 'ABSCONDING', label: 'Absconding / leaving' },
  { value: 'SEXUALISED', label: 'Sexualised behaviour' },
  { value: 'OTHER', label: 'Other' },
] as const

export const ABC_PRESENTATIONS = [
  { value: 'CALM', label: 'Calm' },
  { value: 'AGITATED', label: 'Agitated' },
  { value: 'DISTRESSED', label: 'Distressed' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'CONFUSED', label: 'Confused' },
  { value: 'HAPPY', label: 'Happy / elevated' },
  { value: 'OTHER', label: 'Other' },
] as const

export const ABC_RISK_LEVELS = [
  { value: 'LOW', label: 'LOW', className: 'bg-emerald-500 text-white border-emerald-600' },
  { value: 'MEDIUM', label: 'MEDIUM', className: 'bg-sky-300 text-sky-950 border-sky-400' },
  { value: 'HIGH', label: 'HIGH', className: 'bg-orange-400 text-white border-orange-500' },
  { value: 'CRITICAL', label: 'CRITICAL', className: 'bg-red-600 text-white border-red-700' },
] as const

export type AbcRiskLevel = (typeof ABC_RISK_LEVELS)[number]['value']

export function abcOptionLabel(
  options: readonly { value: string; label: string }[],
  value: string | undefined,
): string {
  if (!value) return '—'
  return options.find(o => o.value === value)?.label ?? value.replace(/_/g, ' ')
}
