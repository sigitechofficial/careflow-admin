import type { PaymentMatchStatus } from '@/features/billing/types/billing.types'
import type { PaymentRow } from '@/features/billing/api/payments.api'

export function parseMoney(value: string): number {
  const n = Number(value.replace(/[£,\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function formatMoneyGbp(amount: number): string {
  return `£${amount.toFixed(2)}`
}

export function paymentLinkSummary(row: PaymentRow): {
  label: string
  detail: string
  needsAction: boolean
} {
  if (row.recordStatus !== 'RECEIVED') {
    return { label: row.status, detail: '', needsAction: false }
  }
  if (row.matchStatus === 'FULLY_MATCHED') {
    return {
      label: 'Linked to invoice',
      detail: `${row.matched} applied`,
      needsAction: false,
    }
  }
  if (row.matchStatus === 'PARTIALLY_MATCHED') {
    return {
      label: 'Part linked',
      detail: `${row.unmatched} still to link`,
      needsAction: true,
    }
  }
  return {
    label: 'Needs linking',
    detail: 'Not linked to an invoice yet',
    needsAction: true,
  }
}

export function matchStatusVariant(
  status: PaymentMatchStatus,
): 'success' | 'warning' | 'secondary' {
  if (status === 'FULLY_MATCHED') return 'success'
  if (status === 'PARTIALLY_MATCHED') return 'warning'
  return 'secondary'
}
