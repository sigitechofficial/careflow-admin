import type { MedicationStatusCodeLookupRow } from '@/features/service-users/types'
import { administrationStatusToDisplayCode } from '@/features/service-users/medication/mar-status-utils'

export type MarStatusDisplay = {
  code: string
  label: string
  color: string
  textColor: string
}

const DEFAULT_PENDING: MarStatusDisplay = {
  code: 'Pending',
  label: 'Pending',
  color: '#E0E0E0',
  textColor: '#424242',
}

const DEFAULT_DUE: MarStatusDisplay = {
  code: 'Due',
  label: 'Due',
  color: '#FEF3C7',
  textColor: '#92400E',
}

export function buildMarStatusCodeMap(
  rows: MedicationStatusCodeLookupRow[],
): Map<string, MedicationStatusCodeLookupRow> {
  return new Map(rows.map(row => [row.code, row]))
}

/** Resolve MAR badge colours from stored code + settings lookup (mirrors chart API). */
export function resolveMarStatusDisplay(
  event: { status: string; statusCode?: string | null },
  statusByCode: Map<string, MedicationStatusCodeLookupRow>,
): MarStatusDisplay {
  const code = event.statusCode?.trim() || administrationStatusToDisplayCode(event.status)
  const row = statusByCode.get(code)
  if (row) {
    return {
      code: row.code,
      label: row.label,
      color: row.color,
      textColor: row.textColor,
    }
  }
  if (code === 'Due') return DEFAULT_DUE
  return { ...DEFAULT_PENDING, code, label: code }
}
