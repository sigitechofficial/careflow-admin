import * as React from 'react'
import { Banknote, CheckCircle2, ChevronDown, ChevronRight, Download, History, Send } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import type {
  InvoiceRunServiceUserFunderShare,
  InvoiceRunServiceUserSummary,
} from '@/features/billing/api/invoice-runs.api'

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

function formatDueDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value.includes('T') ? value : `${value}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
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

function funderShareTotals(f: InvoiceRunServiceUserFunderShare) {
  const paidValue = Math.min(f.paidValue ?? 0, f.invoicedValue)
  const outstandingValue =
    f.outstandingValue != null
      ? f.outstandingValue
      : Math.max(0, Math.round((f.invoicedValue - paidValue) * 100) / 100)
  const paymentStatus: 'UNPAID' | 'PART_PAID' | 'PAID' =
    f.paymentStatus ??
    (paidValue <= 0 ? 'UNPAID' : outstandingValue <= 0.001 ? 'PAID' : 'PART_PAID')
  return {
    paid: f.paid ?? `£${paidValue.toFixed(2)}`,
    paidValue,
    outstanding: f.outstanding ?? `£${outstandingValue.toFixed(2)}`,
    outstandingValue,
    paymentStatus,
  }
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
  const funders = group.funders ?? []
  const multiFunder = funders.length > 1
  const [expanded, setExpanded] = React.useState(multiFunder)

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

  const funderSummaryLabel = multiFunder
    ? `${funders.length} funders`
    : group.funderLabel

  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-muted/20">
        <td className="px-3 py-2.5">
          <div className="flex items-start gap-1.5">
            {multiFunder ? (
              <button
                type="button"
                className="mt-0.5 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-expanded={expanded}
                aria-label={expanded ? 'Hide funder rows' : 'Show funder rows'}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden />
                )}
              </button>
            ) : (
              <span className="inline-block w-5" aria-hidden />
            )}
            <p className="min-w-0 font-mono text-sm font-medium text-foreground">{invoiceNumber}</p>
          </div>
        </td>
        <td className="px-3 py-2.5">
          <Link
            to="/service-users/$serviceUserId/invoices"
            params={{ serviceUserId: group.serviceUserId }}
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            {group.serviceUserName}
          </Link>
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
            <span className="text-xs text-muted-foreground">{funderSummaryLabel}</span>
            {multiFunder ? (
              <Badge variant="secondary" size="sm">
                Split
              </Badge>
            ) : null}
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
        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-muted-foreground">
          {formatDueDate(group.dueDate ?? null)}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-muted-foreground">
          {formatTimestamp(group.sentAt ?? null)}
        </td>
        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-muted-foreground">
          {formatTimestamp(group.paidAt ?? null)}
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

      {multiFunder && expanded
        ? funders.map((f) => {
            const share = funderShareTotals(f)
            const sharePaid = share.paymentStatus === 'PAID' || share.outstandingValue <= 0.001
            return (
              <tr
                key={`${group.serviceUserId}-${f.funderId ?? 'direct'}`}
                className="border-b border-border/70 bg-muted/15 last:border-border"
              >
                <td className="px-3 py-2 text-muted-foreground" />
                <td className="px-3 py-2 pl-10 text-xs text-muted-foreground">
                  Funder share
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{f.funderName}</span>
                    {f.funderCode ? (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {f.funderCode}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {f.invoiced}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                  {share.paid}
                </td>
                <td
                  className={cn(
                    'px-3 py-2 text-right tabular-nums',
                    share.outstandingValue > 0.001
                      ? 'font-medium text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground',
                  )}
                >
                  {share.outstanding}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <InvoicePaymentStatusBadge
                    status={sharePaid ? 'PAID' : share.paymentStatus}
                  />
                </td>
                <td className="px-3 py-2" colSpan={4} />
                <td className="px-3 py-2" />
              </tr>
            )
          })
        : null}
    </>
  )
}
