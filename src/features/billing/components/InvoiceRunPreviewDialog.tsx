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
import type {
  InvoiceRunDetail,
  InvoiceRunFunderSummary,
  InvoiceRunLine,
} from '@/features/billing/api/invoice-runs.api'
import {
  InvoiceBrandedFooter,
  InvoiceBrandedHeader,
} from '@/features/billing/components/InvoiceBrandedDocument'
import { ExportStatusBadge, InvoiceRunStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import {
  useInvoiceOrganisation,
  type InvoiceOrganisation,
} from '@/features/billing/hooks/useInvoiceOrganisation'
import { formatUkDate, invoiceRunRef } from '@/features/billing/utils/invoice-run-display.util'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceRun: InvoiceRunDetail | null
  /** When set, preview only this authority's invoice (match on funder id; null = direct / family). */
  funderIdFilter?: string | null
}

function formatHours(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return '—'
  return (minutes / 60).toFixed(2)
}

function lineRate(line: InvoiceRunLine): string {
  if (!line.minutes || line.minutes <= 0 || line.amountValue <= 0) return '—'
  const hourly = line.amountValue / (line.minutes / 60)
  return `£${hourly.toFixed(2)}`
}

function matchesFunderFilter(
  groupFunderId: string | null,
  filter: string | null | undefined,
): boolean {
  if (filter === undefined) return true
  return (groupFunderId ?? null) === (filter ?? null)
}

function clientSummary(lines: InvoiceRunLine[]): { label: string; detail: string } {
  const uniqueClients = [...new Set(lines.map(line => line.serviceUserName))]
  if (uniqueClients.length === 1) {
    const line = lines[0]
    return {
      label: uniqueClients[0],
      detail: line.serviceUserNumber ? `Ref ${line.serviceUserNumber}` : '',
    }
  }
  return {
    label: 'Multiple clients',
    detail: `${uniqueClients.length} service users on this invoice`,
  }
}

function LiveInvoiceDocument({
  invoiceRun,
  group,
  invoiceIndex,
  invoiceTotal,
  org,
}: {
  invoiceRun: InvoiceRunDetail
  group: InvoiceRunFunderSummary
  invoiceIndex: number
  invoiceTotal: number
  org: InvoiceOrganisation
}) {
  const client = clientSummary(group.lines)
  const invoiceNumber = invoiceRunRef(invoiceRun, group.funderCode)
  const issueDate = formatUkDate(invoiceRun.periodEnd)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white text-foreground shadow-sm">
      <InvoiceBrandedHeader org={org} />

      <div className="grid gap-8 border-b-2 border-primary px-8 py-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Invoice details</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold">Invoice #</dt>
              <dd className="font-mono text-xs">{invoiceNumber}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold">Date of issue</dt>
              <dd>{issueDate}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold">Period</dt>
              <dd>
                {formatUkDate(invoiceRun.periodStart)} – {formatUkDate(invoiceRun.periodEnd)}
              </dd>
            </div>
            {invoiceTotal > 1 ? (
              <div className="flex gap-3">
                <dt className="w-28 shrink-0 font-semibold">Invoice</dt>
                <dd>
                  {invoiceIndex + 1} of {invoiceTotal}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Bill to</p>
          <div className="mt-3 text-sm leading-relaxed">
            <p className="font-bold uppercase">{group.funderName}</p>
            {group.funderCode ? (
              <p className="text-muted-foreground">Funder ref: {group.funderCode}</p>
            ) : null}
          </div>
          <div className="mt-4 border-t border-border pt-3 text-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client</p>
            <p className="mt-1 font-semibold">{client.label}</p>
            {client.detail ? <p className="text-muted-foreground">{client.detail}</p> : null}
          </div>
        </div>
      </div>

      <div className="px-8 py-5">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-primary text-left text-xs font-bold uppercase tracking-wide">
              <th className="pb-3 pr-4">Item / service</th>
              <th className="pb-3 pr-4">Description</th>
              <th className="pb-3 pr-4 text-right">Qty / hrs</th>
              <th className="pb-3 pr-4 text-right">Rate</th>
              <th className="pb-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {group.lines.map(line => (
              <tr key={line.id} className="border-b border-border/80">
                <td className="py-3 pr-4 align-top font-semibold">{line.serviceUserName}</td>
                <td className="py-3 pr-4 align-top text-muted-foreground">
                  {line.visitRef ? `${line.visitRef} · ` : ''}
                  {line.description}
                  {line.splitPercent != null ? ` (${line.splitPercent}%)` : ''}
                </td>
                <td className="py-3 pr-4 align-top text-right tabular-nums">
                  {formatHours(line.minutes)}
                </td>
                <td className="py-3 pr-4 align-top text-right tabular-nums">{lineRate(line)}</td>
                <td className="py-3 align-top text-right font-medium tabular-nums">{line.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-8 px-8 pb-6 pt-2 sm:grid-cols-2">
        <div className="space-y-5 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Terms</p>
            <p className="mt-2 text-muted-foreground">30 days from invoice date</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Conditions / instructions</p>
            <p className="mt-2 text-muted-foreground">
              Care services billed for the period {formatUkDate(invoiceRun.periodStart)} to{' '}
              {formatUkDate(invoiceRun.periodEnd)}.
            </p>
          </div>
        </div>
        <div className="sm:justify-self-end">
          <dl className="min-w-[240px] space-y-2 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="font-semibold">Subtotal</dt>
              <dd className="tabular-nums">{group.subtotal}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="font-semibold">VAT</dt>
              <dd className="tabular-nums">£0.00</dd>
            </div>
            <div className="flex justify-between gap-6 border-t-2 border-primary pt-3 text-lg font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{group.subtotal}</dd>
            </div>
          </dl>
        </div>
      </div>

      <InvoiceBrandedFooter org={org} />
    </div>
  )
}

export function InvoiceRunPreviewDialog({
  open,
  onOpenChange,
  invoiceRun,
  funderIdFilter,
}: Props) {
  const org = useInvoiceOrganisation(open)

  if (!invoiceRun) return null

  const authorityInvoices = invoiceRun.funderSummaries.filter(group =>
    matchesFunderFilter(group.funderId, funderIdFilter),
  )
  const hasLines = authorityInvoices.length > 0

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
            <span className="font-mono text-xs text-muted-foreground">
              {invoiceRunRef(invoiceRun)}
            </span>
            {authorityInvoices.length > 0 ? (
              <Badge variant="secondary" size="sm">
                {authorityInvoices.length} authority invoice{authorityInvoices.length === 1 ? '' : 's'}
              </Badge>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Each local authority and funder receives its own separate invoice with a unique invoice
            number. Provider details are loaded from Settings → Company.
          </p>

          {!hasLines ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No invoice lines yet. Calculate the run to generate charges from approved visits.
            </div>
          ) : (
            authorityInvoices.map(group => {
              const originalIndex = invoiceRun.funderSummaries.findIndex(
                row => (row.funderId ?? null) === (group.funderId ?? null),
              )
              return (
              <div key={group.funderId ?? 'direct'} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" size="sm">
                    Authority invoice — {group.funderName}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {group.lineCount} line{group.lineCount === 1 ? '' : 's'} · {group.subtotal}
                  </span>
                </div>
                <LiveInvoiceDocument
                  invoiceRun={invoiceRun}
                  group={group}
                  invoiceIndex={originalIndex}
                  invoiceTotal={invoiceRun.funderSummaries.length}
                  org={org}
                />
              </div>
              )
            })
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
