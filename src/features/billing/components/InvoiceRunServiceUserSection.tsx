import { Banknote, CheckCircle2, Download, History, Send } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { InvoiceRunServiceUserSummary } from '@/features/billing/api/invoice-runs.api'

type Props = {
  group: InvoiceRunServiceUserSummary
  createdAt: string | null | undefined
  formatTimestamp: (value: string | null) => string
  canSendInvoice?: boolean
  canRecordPayment?: boolean
  csvDownloading?: boolean
  onHistory?: () => void
  onDownloadCsv?: () => void
  onSendInvoice?: () => void
  onRecordPayment?: () => void
}

function InvoicePaymentStatusBadge({
  status,
}: {
  status: 'UNPAID' | 'PART_PAID' | 'PAID'
}) {
  if (status === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Paid
      </span>
    )
  }
  if (status === 'PART_PAID') {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
        Partial paid
      </span>
    )
  }
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Unpaid
    </span>
  )
}

export function InvoiceRunServiceUserSection({
  group,
  createdAt,
  formatTimestamp,
  canSendInvoice,
  canRecordPayment,
  csvDownloading,
  onHistory,
  onDownloadCsv,
  onSendInvoice,
  onRecordPayment,
}: Props) {
  const exceptionCount = group.exceptionCount ?? 0
  const invoiceNumber = group.invoiceNumber?.trim() || '—'
  const paid = group.paid ?? '£0.00'
  const paidValue = group.paidValue ?? 0
  const outstanding = group.outstanding ?? group.subtotal
  const outstandingValue = group.outstandingValue ?? group.subtotalValue
  const paymentStatus: 'UNPAID' | 'PART_PAID' | 'PAID' =
    group.paymentStatus ??
    (paidValue <= 0 ? 'UNPAID' : outstandingValue <= 0.001 ? 'PAID' : 'PART_PAID')
  const isPaid = paymentStatus === 'PAID' || outstandingValue <= 0.001

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/20">
      <td className="px-3 py-2.5">
        <p className="min-w-0 font-mono text-sm font-medium text-foreground">{invoiceNumber}</p>
      </td>
      <td className="px-3 py-2.5">
        <p className="font-medium text-foreground">{group.serviceUserName}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          {group.serviceUserNumber ? (
            <span className="font-mono">{group.serviceUserNumber}</span>
          ) : null}
          <span>
            {group.invoiceBillingFrequency === 'MONTHLY' ? 'Monthly' : 'Weekly'}
          </span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{group.funderLabel}</span>
          {exceptionCount > 0 ? (
            <Badge variant="destructive" size="sm">
              {exceptionCount} exception{exceptionCount === 1 ? '' : 's'}
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right font-medium tabular-nums">{group.subtotal}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
        {paid}
      </td>
      <td
        className={
          outstandingValue > 0.001
            ? 'px-3 py-2.5 text-right font-medium tabular-nums text-amber-600 dark:text-amber-400'
            : 'px-3 py-2.5 text-right font-medium tabular-nums text-muted-foreground'
        }
      >
        {outstanding}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">
        <InvoicePaymentStatusBadge status={isPaid ? 'PAID' : paymentStatus} />
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-muted-foreground">
        {formatTimestamp(createdAt ?? null)}
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex flex-nowrap items-center justify-end gap-1 whitespace-nowrap">
          {onHistory ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
              onClick={onHistory}
              title="Invoice history"
              aria-label="Invoice history"
            >
              <History className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {onDownloadCsv ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
              loading={csvDownloading}
              disabled={group.lineCount === 0 || csvDownloading}
              onClick={onDownloadCsv}
              title="Download CSV"
              aria-label="Download CSV"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {canSendInvoice && onSendInvoice ? (
            <Button
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
              onClick={onSendInvoice}
              title="Send invoice"
              aria-label="Send invoice"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {canRecordPayment && onRecordPayment && !isPaid ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
              onClick={onRecordPayment}
              title="Record payment"
              aria-label="Record payment"
            >
              <Banknote className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  )
}
