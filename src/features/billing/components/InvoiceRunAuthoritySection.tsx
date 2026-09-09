import * as React from 'react'
import { Banknote, ChevronRight, Eye, Send } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import type { InvoiceRunDetail, InvoiceRunFunderSummary } from '@/features/billing/api/invoice-runs.api'
import { invoiceRunRef } from '@/features/billing/utils/invoice-run-display.util'

type Props = {
  invoiceRun: InvoiceRunDetail
  group: InvoiceRunFunderSummary
  invoiceIndex: number
  formatMinutes: (minutes: number | null) => string
  createdAt: string | null | undefined
  formatTimestamp: (value: string | null) => string
  canSendInvoice?: boolean
  canRecordPayment?: boolean
  onPreview?: () => void
  onSendInvoice?: () => void
  onRecordPayment?: () => void
}

export function InvoiceRunAuthoritySection({
  invoiceRun,
  group,
  invoiceIndex,
  formatMinutes,
  createdAt,
  formatTimestamp,
  canSendInvoice,
  canRecordPayment,
  onPreview,
  onSendInvoice,
  onRecordPayment,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const invoiceNumber = invoiceRunRef(invoiceRun, group.funderCode)
  const clientCount = new Set(group.lines.map((line) => line.serviceUserId)).size
  const exceptionCount = group.lines.filter((line) => line.exceptionMessage).length
  const paid = group.paid ?? '£0.00'
  const outstanding = group.outstanding ?? group.subtotal
  const outstandingValue = group.outstandingValue ?? group.subtotalValue

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
            <div className="min-w-0">
              <p className="font-medium text-foreground">
                Invoice {invoiceIndex + 1} — {group.funderName}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">{invoiceNumber}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {group.funderCode ? (
              <span className="text-xs text-muted-foreground">Ref {group.funderCode}</span>
            ) : (
              <span className="text-xs text-muted-foreground">Direct / family</span>
            )}
            {exceptionCount > 0 ? (
              <Badge variant="warning" size="sm">
                {exceptionCount} exception{exceptionCount === 1 ? '' : 's'}
              </Badge>
            ) : null}
          </div>
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums">{clientCount}</td>
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
            {canSendInvoice && onSendInvoice ? (
              <Button
                size="sm"
                className="h-8 shrink-0 px-2.5"
                leftIcon={<Send className="h-3.5 w-3.5" />}
                onClick={onSendInvoice}
                title="Email this invoice (CSV attached)"
              >
                Send invoice
              </Button>
            ) : null}
            {canRecordPayment && onRecordPayment ? (
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
          <td colSpan={9} className="px-3 py-2">
            <div className="overflow-x-auto rounded-md border border-border/70 bg-background">
              <table className="w-full min-w-[960px] text-xs">
                <thead>
                  <tr className="border-b border-border/70 text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Visit</th>
                    <th className="px-3 py-2 text-left font-medium">Service user</th>
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
                        <span className="font-medium text-foreground">{line.serviceUserName}</span>
                        {line.serviceUserNumber ? (
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {line.serviceUserNumber}
                          </span>
                        ) : null}
                      </td>
                      <td className="max-w-[280px] px-3 py-2 text-muted-foreground">{line.description}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMinutes(line.minutes)}</td>
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
