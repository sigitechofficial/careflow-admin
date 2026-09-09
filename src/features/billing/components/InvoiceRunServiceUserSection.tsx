import * as React from 'react'
import { Banknote, CheckCircle2, ChevronRight, Download, Eye, History, Send } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import type { InvoiceRunServiceUserSummary } from '@/features/billing/api/invoice-runs.api'

type Props = {
  group: InvoiceRunServiceUserSummary
  invoiceIndex: number
  formatMinutes: (minutes: number | null) => string
  createdAt: string | null | undefined
  formatTimestamp: (value: string | null) => string
  canSendInvoice?: boolean
  canRecordPayment?: boolean
  csvDownloading?: boolean
  onPreview?: () => void
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
  invoiceIndex,
  formatMinutes,
  createdAt,
  formatTimestamp,
  canSendInvoice,
  canRecordPayment,
  csvDownloading,
  onPreview,
  onHistory,
  onDownloadCsv,
  onSendInvoice,
  onRecordPayment,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const exceptionCount = group.lines.filter((line) => line.exceptionMessage).length
  const paid = group.paid ?? '£0.00'
  const paidValue = group.paidValue ?? 0
  const outstanding = group.outstanding ?? group.subtotal
  const outstandingValue = group.outstandingValue ?? group.subtotalValue
  const paymentStatus: 'UNPAID' | 'PART_PAID' | 'PAID' =
    group.paymentStatus ??
    (paidValue <= 0 ? 'UNPAID' : outstandingValue <= 0.001 ? 'PAID' : 'PART_PAID')
  const isPaid = paymentStatus === 'PAID' || outstandingValue <= 0.001

  return (
    <>
      <tr
        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/20"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <ChevronRight
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                open && 'rotate-90',
              )}
              aria-hidden
            />
            <p className="min-w-0 font-medium text-foreground">
              Invoice {invoiceIndex + 1} — {group.serviceUserName}
            </p>
          </div>
        </td>
        <td className="px-3 py-2.5 font-medium text-foreground">{group.serviceUserName}</td>
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{group.funderLabel}</span>
            {exceptionCount > 0 ? (
              <Badge variant="warning" size="sm">
                {exceptionCount} exception{exceptionCount === 1 ? '' : 's'}
              </Badge>
            ) : null}
          </div>
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums">{group.lineCount}</td>
        <td className="px-3 py-2.5 text-right font-medium tabular-nums">{group.subtotal}</td>
        <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
          {paid}
        </td>
        <td
          className={cn(
            'px-3 py-2.5 text-right font-medium tabular-nums',
            outstandingValue > 0.001
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-muted-foreground',
          )}
        >
          {outstanding}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5">
          <InvoicePaymentStatusBadge status={isPaid ? 'PAID' : paymentStatus} />
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-muted-foreground">
          {formatTimestamp(createdAt ?? null)}
        </td>
        <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
            {onPreview ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 px-2.5"
                leftIcon={<Eye className="h-3.5 w-3.5" />}
                onClick={onPreview}
              >
                Preview
              </Button>
            ) : null}
            {onHistory ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 px-2.5"
                leftIcon={<History className="h-3.5 w-3.5" />}
                onClick={onHistory}
              >
                History
              </Button>
            ) : null}
            {onDownloadCsv ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 px-2.5"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                loading={csvDownloading}
                disabled={group.lineCount === 0 || csvDownloading}
                onClick={onDownloadCsv}
                title="Download this service user's invoice lines as CSV"
              >
                CSV
              </Button>
            ) : null}
            {canSendInvoice && onSendInvoice ? (
              <Button
                size="sm"
                className="h-8 shrink-0 px-2.5"
                leftIcon={<Send className="h-3.5 w-3.5" />}
                onClick={onSendInvoice}
                title="Email this service user's invoice (CSV attached)"
              >
                Send invoice
              </Button>
            ) : null}
            {canRecordPayment && onRecordPayment && !isPaid ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0 px-2.5"
                leftIcon={<Banknote className="h-3.5 w-3.5" />}
                onClick={onRecordPayment}
              >
                Record payment
              </Button>
            ) : null}
          </div>
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-border bg-muted/10 last:border-0">
          <td colSpan={10} className="px-3 py-2">
            <div className="overflow-x-auto rounded-md border border-border/70 bg-background">
              <table className="w-full min-w-[960px] text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Visit</th>
                    <th className="px-3 py-2 text-left font-medium">Funder</th>
                    <th className="px-3 py-2 text-left font-medium">Description</th>
                    <th className="px-3 py-2 text-right font-medium">Duration</th>
                    <th className="px-3 py-2 text-right font-medium">Split</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                    <th className="px-3 py-2 text-left font-medium">Exception</th>
                  </tr>
                </thead>
                <tbody>
                  {group.lines.map((line) => (
                    <tr key={line.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 font-mono">{line.visitRef ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-foreground">{line.funderName}</span>
                        {line.funderCode ? (
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {line.funderCode}
                          </span>
                        ) : null}
                      </td>
                      <td className="max-w-[280px] px-3 py-2 text-muted-foreground">
                        {line.description}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatMinutes(line.minutes)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {line.splitPercent != null ? `${line.splitPercent}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{line.amount}</td>
                      <td className="px-3 py-2">
                        {line.exceptionMessage ? (
                          <span className="text-destructive">{line.exceptionMessage}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}
