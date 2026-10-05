import {
  dayKeyFromInstant,
  formatOpsHm,
  isoToOrgDatetimeLocal,
  orgDatetimeLocalToIso,
} from '@/shared/lib/operational-day.util'

// Dates and times are shown and entered in the organisation timezone, not the device's.

export function formatCommunicationNoteDate(iso: string): string {
  const day = dayKeyFromInstant(iso)
  if (!day) return '—'
  return `${day.slice(8, 10)}-${day.slice(5, 7)}-${day.slice(0, 4)}`
}

export function formatCommunicationNoteTime(iso: string): string {
  return formatOpsHm(iso) || '—'
}

export function toDatetimeLocalValue(d: Date): string {
  if (Number.isNaN(d.getTime())) return ''
  return isoToOrgDatetimeLocal(d.toISOString())
}

export function datetimeLocalToIso(value: string): string {
  const iso = orgDatetimeLocalToIso(value)
  if (!iso) throw new Error('Invalid date')
  return iso
}
