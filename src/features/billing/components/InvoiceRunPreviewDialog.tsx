import * as React from 'react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import type { InvoiceRunDetail } from '@/features/billing/api/invoice-runs.api'
import { ExportStatusBadge, InvoiceRunStatusBadge } from '@/features/billing/components/BillingStatusBadge'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceRun: InvoiceRunDetail | null
}

function formatMinutes(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return '—'
  const hrs = minutes / 60
  return `${hrs.toFixed(2)} hrs`
}

function invoiceRef(invoiceRun: InvoiceRunDetail): string {
  const end = invoiceRun.periodEnd.replace(/-/g, '')
  return `INV-${end}-${invoiceRun.id.slice(0, 4).toUpperCase()}`
}

export function InvoiceRunPreviewDialog({ open, onOpenChange, invoiceRun }: Props) {
  if (!invoiceRun) return null

  const hasLines = invoiceRun.funderSummaries.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Invoice preview</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[75vh] space-y-4 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-foreground">{invoiceRun.period}</span>
            <InvoiceRunStatusBadge status={invoiceRun.status} />
            <ExportStatusBadge status={invoiceRun.exportStatus} />
            <span className="font-mono text-xs text-muted-foreground">{invoiceRef(invoiceRun)}</span>
          </div>

          <p className="text-xs text-muted-foreground">
            Live invoice layout from calculated lines. Grouped by funder for council and split-billing
            exports.
          </p>

          {!hasLines ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No invoice lines yet. Calculate the run to generate charges from approved visits.
            </div>
          ) : (
            invoiceRun.funderSummaries.map(group => (
              <div
                key={group.funderId ?? 'direct'}
                className="rounded-xl border border-border bg-white p-5 shadow-sm dark:bg-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Bill to
                    </p>
                    <p className="mt-1 text-base font-semibold text-foreground">{group.funderName}</p>
                    {group.funderCode ? (
                      <p className="text-sm text-muted-foreground">Funder ref: {group.funderCode}</p>
                    ) : null}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-foreground">Invoice</p>
                    <p className="text-muted-foreground">{invoiceRef(invoiceRun)}</p>
                    <p className="text-muted-foreground">
                      Period: {invoiceRun.periodStart} – {invoiceRun.periodEnd}
                    </p>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-2.5 py-2 text-left text-xs font-semibold text-muted-foreground">
                          Visit
                        </th>
                        <th className="px-2.5 py-2 text-left text-xs font-semibold text-muted-foreground">
                          Service user
                        </th>
                        <th className="px-2.5 py-2 text-left text-xs font-semibold text-muted-foreground">
                          Description
                        </th>
                        <th className="px-2.5 py-2 text-right text-xs font-semibold text-muted-foreground">
                          Duration
                        </th>
                        <th className="px-2.5 py-2 text-right text-xs font-semibold text-muted-foreground">
                          Split
                        </th>
                        <th className="px-2.5 py-2 text-right text-xs font-semibold text-muted-foreground">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.lines.map(line => (
                        <tr key={line.id} className="border-b border-border last:border-0">
                          <td className="px-2.5 py-2 font-mono text-xs">{line.visitRef ?? '—'}</td>
                          <td className="px-2.5 py-2">
                            <span className="font-medium">{line.serviceUserName}</span>
                            {line.serviceUserNumber ? (
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({line.serviceUserNumber})
                              </span>
                            ) : null}
                          </td>
                          <td className="px-2.5 py-2 text-muted-foreground">{line.description}</td>
                          <td className="px-2.5 py-2 text-right tabular-nums">
                            {formatMinutes(line.minutes)}
                          </td>
                          <td className="px-2.5 py-2 text-right tabular-nums">
                            {line.splitPercent != null ? `${line.splitPercent}%` : '—'}
                          </td>
                          <td className="px-2.5 py-2 text-right tabular-nums font-medium">
                            {line.amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <Badge variant="secondary" size="sm">
                    {group.lineCount} line{group.lineCount === 1 ? '' : 's'}
                  </Badge>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Subtotal: </span>
                    <span className="font-semibold tabular-nums">{group.subtotal}</span>
                  </div>
                </div>
              </div>
            ))
          )}

          {hasLines ? (
            <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-muted-foreground">Invoice run net total</span>
                <span className="text-lg font-semibold tabular-nums">{invoiceRun.netTotal}</span>
              </div>
              {invoiceRun.outstandingValue < invoiceRun.netTotalValue ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>Paid: {invoiceRun.paidAmount}</span>
                  <span>Outstanding: {invoiceRun.outstanding}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
