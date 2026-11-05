import * as React from 'react'
import { useServiceUserInvoices } from '@/features/billing/hooks/useInvoiceRuns'
import type { TimebankDetail, TimebankWeek } from '@/features/timebank/types'
import { formatMinutes } from '@/features/timebank/timebank-format'

/** BEFORE_START: a week from before charging started — its timebank hours are never invoiced. */
export type BankWeekPayment = 'PAID' | 'NOT_PAID' | 'NOT_INVOICED' | 'BEFORE_START' | null

const LABEL: Record<Exclude<BankWeekPayment, null>, string> = {
  PAID: 'Paid',
  NOT_PAID: 'Not paid',
  NOT_INVOICED: 'Not invoiced yet',
  BEFORE_START: 'Before charging started',
}

const TONE: Record<Exclude<BankWeekPayment, null>, string> = {
  PAID: 'text-emerald-700 dark:text-emerald-400',
  NOT_PAID: 'text-amber-700 dark:text-amber-400',
  NOT_INVOICED: 'text-muted-foreground',
  BEFORE_START: 'text-muted-foreground',
}

/**
 * Timebank hours on the invoice (docs/SU_TIMEBANK_INVOICE_PLAN.md T7): a finished week's timebank
 * hours are Paid only when the whole invoice they are on is paid; a part-paid invoice is Not paid.
 */
export function useBankWeekPayment(data: TimebankDetail | undefined) {
  const invoices = useServiceUserInvoices(data?.serviceUser.id, Boolean(data?.chargeTimebank.on))
  return React.useMemo(() => {
    const paidRuns = new Set(
      (invoices.data?.runs ?? []).filter(r => r.paymentStatus === 'PAID').map(r => r.id),
    )
    const charges = data?.timebankCharges ?? []
    const statusOf = (w: TimebankWeek): { status: BankWeekPayment; invoiceNumber: string | null } => {
      if (!data?.chargeTimebank.on || w.addedToBankMinutes <= 0) return { status: null, invoiceNumber: null }
      const rows = charges.filter(c => c.kind === 'CHARGED' && c.weekStart === w.weekStart && c.minutes > 0)
      if (!rows.length) {
        if (data.chargeTimebank.from && w.weekStart < data.chargeTimebank.from) return { status: 'BEFORE_START', invoiceNumber: null }
        return { status: 'NOT_INVOICED', invoiceNumber: null }
      }
      const paid = rows.every(r => paidRuns.has(r.invoiceRunId))
      return { status: paid ? 'PAID' : 'NOT_PAID', invoiceNumber: rows[rows.length - 1]!.invoiceNumber }
    }
    return { statusOf, loading: invoices.isLoading }
  }, [data, invoices.data, invoices.isLoading])
}

/** Under a week's "Added to bank": whether those hours are paid, on an unpaid invoice or not invoiced. */
export function BankWeekPaymentLine({ status, invoiceNumber }: { status: BankWeekPayment; invoiceNumber: string | null }) {
  if (!status) return null
  return (
    <span className={`block text-xs font-normal ${TONE[status]}`} data-testid="bank-week-payment">
      {LABEL[status]}
      {invoiceNumber ? ` · ${invoiceNumber}` : ''}
    </span>
  )
}

/** Totals for the "In timebank" card: hours paid, not paid, not invoiced yet, and used at no charge. */
export function BankPaymentSummary({
  data,
  statusOf,
}: {
  data: TimebankDetail
  statusOf: (w: TimebankWeek) => { status: BankWeekPayment }
}) {
  if (!data.chargeTimebank.on) return null
  const sums: Record<Exclude<BankWeekPayment, null>, number> = { PAID: 0, NOT_PAID: 0, NOT_INVOICED: 0, BEFORE_START: 0 }
  for (const w of data.weeks) {
    const { status } = statusOf(w)
    if (status) sums[status] += w.addedToBankMinutes
  }
  const used = data.timebankCharges.filter(c => c.kind === 'USED').reduce((s, c) => s + c.minutes, 0)
  return (
    <p className="mt-1 text-xs text-muted-foreground" data-testid="bank-payment-summary">
      <span className={TONE.PAID}>Paid {formatMinutes(sums.PAID)}</span> ·{' '}
      <span className={TONE.NOT_PAID}>Not paid {formatMinutes(sums.NOT_PAID)}</span> · Not invoiced yet{' '}
      {formatMinutes(sums.NOT_INVOICED)}
      {sums.BEFORE_START > 0 ? ` · before charging started ${formatMinutes(sums.BEFORE_START)} (never invoiced)` : ''}
      {used > 0 ? ` · used at no charge ${formatMinutes(used)}` : ''}
    </p>
  )
}
