import type { MedicationStatusCodeLookupRow } from '@/features/service-users/types'

/** Gradient header class for record summary (HTML prototype). */
export function statusCodeHeaderClass(code: string | null | undefined): string {
  switch (code) {
    case 'G':
      return 'given'
    case 'R':
      return 'refused'
    case 'N':
      return 'missed'
    case 'U':
    case 'H':
    case 'A':
    case 'C':
      return 'unavail'
    default:
      return 'given'
  }
}

export function formatGbDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatGbDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export type StatusPickRow = Pick<
  MedicationStatusCodeLookupRow,
  'code' | 'label' | 'color' | 'textColor' | 'reasonRequirement'
>
