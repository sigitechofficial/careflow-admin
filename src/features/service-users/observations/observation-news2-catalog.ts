export const NEWS2_ACVPU = [
  { value: 'A', label: 'A', title: 'Alert', className: 'bg-emerald-500 text-white border-emerald-600' },
  { value: 'C', label: 'C', title: 'Confusion', className: 'bg-orange-500 text-white border-orange-600' },
  { value: 'V', label: 'V', title: 'Responds to voice', className: 'bg-yellow-400 text-yellow-950 border-yellow-500' },
  { value: 'P', label: 'P', title: 'Responds to pain', className: 'bg-red-600 text-white border-red-700' },
  { value: 'U', label: 'U', title: 'Unresponsive', className: 'bg-orange-300 text-orange-950 border-orange-400' },
] as const

export type News2Acvpu = (typeof NEWS2_ACVPU)[number]['value']

export const NEWS2_AIR_OXYGEN = [
  { value: 'AIR', label: 'Air' },
  { value: 'OXYGEN', label: 'Oxygen' },
] as const

export type News2AirOrOxygen = (typeof NEWS2_AIR_OXYGEN)[number]['value']

export function acvpuLabel(value: string | undefined): string {
  if (!value) return '—'
  const row = NEWS2_ACVPU.find(o => o.value === value)
  return row ? `${row.label} — ${row.title}` : value
}
