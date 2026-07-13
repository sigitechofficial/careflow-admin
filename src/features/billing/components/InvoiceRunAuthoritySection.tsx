import { Eye } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { InvoiceRunDetail, InvoiceRunFunderSummary } from '@/features/billing/api/invoice-runs.api'
import { invoiceRunRef } from '@/features/billing/utils/invoice-run-display.util'

type Props = {
  invoiceRun: InvoiceRunDetail
  group: InvoiceRunFunderSummary
  invoiceIndex: number
  formatMinutes: (minutes: number | null) => string
  onPreview?: () => void
}

export function InvoiceRunAuthoritySection({
  invoiceRun,
  group,
  invoiceIndex,
  formatMinutes,
  onPreview,
}: Props) {
  const invoiceNumber = invoiceRunRef(invoiceRun, group.funderCode)
  const clientCount = new Set(group.lines.map(line => line.serviceUserId)).size
  const exceptionCount = group.lines.filter(line => line.exceptionMessage).length

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-muted/25 px-4 py-4 sm:px-5">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Invoice {invoiceIndex + 1} — {group.funderName}
            </h3>
            <Badge variant="outline" size="sm">
              Authority invoice
            </Badge>
            {exceptionCount > 0 ? (
              <Badge variant="warning" size="sm">
                {exceptionCount} exception{exceptionCount === 1 ? '' : 's'}
              </Badge>
            ) : null}
          </div>
          <p className="font-mono text-xs text-muted-foreground">{invoiceNumber}</p>
          <p className="text-xs text-muted-foreground">
            {group.lineCount} line{group.lineCount === 1 ? '' : 's'} · {clientCount} client
            {clientCount === 1 ? '' : 's'}
            {group.funderCode ? ` · Ref ${group.funderCode}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Invoice total</p>
            <p className="text-xl font-semibold tabular-nums tracking-tight">{group.subtotal}</p>
          </div>
          {onPreview ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Eye className="h-3.5 w-3.5" />}
              onClick={onPreview}
            >
              Preview
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/15">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Visit</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Service user</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Duration</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Split</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Exception</th>
            </tr>
          </thead>
          <tbody>
            {group.lines.map(line => (
              <tr key={line.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                <td className="px-4 py-3 font-mono text-xs">{line.visitRef ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">{line.serviceUserName}</span>
                  {line.serviceUserNumber ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">{line.serviceUserNumber}</span>
                  ) : null}
                </td>
                <td className="max-w-[280px] px-4 py-3 text-muted-foreground">{line.description}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMinutes(line.minutes)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {line.splitPercent != null ? `${line.splitPercent}%` : '—'}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{line.amount}</td>
                <td className="px-4 py-3 text-xs">
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
    </section>
  )
}
