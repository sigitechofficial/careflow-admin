import { Badge } from '@/shared/ui/badge'
import type { InvoiceRunDetail, InvoiceRunFunderSummary } from '@/features/billing/api/invoice-runs.api'
import { invoiceRunRef } from '@/features/billing/utils/invoice-run-display.util'

type Props = {
  invoiceRun: InvoiceRunDetail
  group: InvoiceRunFunderSummary
  invoiceIndex: number
  formatMinutes: (minutes: number | null) => string
}

export function InvoiceRunAuthoritySection({
  invoiceRun,
  group,
  invoiceIndex,
  formatMinutes,
}: Props) {
  const invoiceNumber = invoiceRunRef(invoiceRun, group.funderCode)
  const clientCount = new Set(group.lines.map(line => line.serviceUserId)).size

  return (
    <section className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Invoice {invoiceIndex + 1} — {group.funderName}
            </h3>
            <Badge variant="outline" size="sm">
              Separate authority invoice
            </Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground">{invoiceNumber}</p>
          <p className="text-xs text-muted-foreground">
            {group.lineCount} line{group.lineCount === 1 ? '' : 's'} · {clientCount} client
            {clientCount === 1 ? '' : 's'}
            {group.funderCode ? ` · Ref ${group.funderCode}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Invoice total</p>
          <p className="text-lg font-semibold tabular-nums">{group.subtotal}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Visit</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Service user</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Description</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Duration</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Split</th>
              <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Amount</th>
              <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Exception</th>
            </tr>
          </thead>
          <tbody>
            {group.lines.map(line => (
              <tr key={line.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                <td className="px-3 py-2.5 font-mono text-xs">{line.visitRef ?? '—'}</td>
                <td className="px-3 py-2.5">
                  <span className="font-medium">{line.serviceUserName}</span>
                  {line.serviceUserNumber ? (
                    <span className="block text-xs text-muted-foreground">{line.serviceUserNumber}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{line.description}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatMinutes(line.minutes)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {line.splitPercent != null ? `${line.splitPercent}%` : '—'}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium">{line.amount}</td>
                <td className="px-3 py-2.5 text-xs text-destructive">{line.exceptionMessage ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
