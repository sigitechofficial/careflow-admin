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
  InvoiceRunLine,
  InvoiceRunServiceUserSummary,
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
  /** When set, preview only this service user's invoice. */
  serviceUserIdFilter?: string
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

function LiveInvoiceDocument({
  invoiceRun,
  group,
  invoiceIndex,
  invoiceTotal,
  org,
}: {
  invoiceRun: InvoiceRunDetail
  group: InvoiceRunServiceUserSummary
  invoiceIndex: number
  invoiceTotal: number
  org: InvoiceOrganisation
}) {
  const invoiceNumber =
    group.invoiceNumber?.trim() ||
    invoiceRunRef(
      invoiceRun,
      group.serviceUserNumber || group.serviceUserId.slice(0, 8).toUpperCase(),
    )
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
              <dt className="w-28 shrink-0 font-semibold">Issue date</dt>
              <dd>{issueDate}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold">Period</dt>
              <dd>
                {formatUkDate(invoiceRun.periodStart)} – {formatUkDate(invoiceRun.periodEnd)}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-28 shrink-0 font-semibold">Invoice</dt>
              <dd>
                {invoiceIndex + 1} of {invoiceTotal}
              </dd>
            </div>
          </dl>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">Bill to</p>
          <div className="mt-3 space-y-1 text-sm">
            <p className="font-semibold text-foreground">{group.serviceUserName}</p>
            {group.serviceUserNumber ? (
              <p className="text-muted-foreground">Ref {group.serviceUserNumber}</p>
            ) : null}
            <p className="text-muted-foreground">Funded by: {group.funderLabel}</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-4 font-semibold">Visit</th>
              <th className="pb-2 pr-4 font-semibold">Service user</th>
              <th className="pb-2 pr-4 font-semibold">Funder</th>
              <th className="pb-2 pr-4 font-semibold">Description</th>
              <th className="pb-2 pr-4 text-right font-semibold">Hours</th>
              <th className="pb-2 pr-4 text-right font-semibold">Rate</th>
              <th className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(group.lines ?? []).map(line => (
              <tr key={line.id} className="border-b border-border/60 align-top">
                <td className="py-3 pr-4 font-mono text-xs">{line.visitRef ?? '—'}</td>
                <td className="py-3 pr-4 font-semibold">{line.serviceUserName}</td>
                <td className="py-3 pr-4 text-muted-foreground">{line.funderName}</td>
                <td className="py-3 pr-4 text-muted-foreground">{line.description}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{formatHours(line.minutes)}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{lineRate(line)}</td>
                <td className="py-3 text-right font-medium tabular-nums">{line.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between gap-6 border-t border-border pt-3">
              <span className="font-semibold">Invoice total</span>
              <span className="font-semibold tabular-nums">{group.subtotal}</span>
            </div>
            {group.funders.length > 1 ? (
              <div className="space-y-1 text-xs text-muted-foreground">
                {group.funders.map(f => (
                  <div key={f.funderId ?? f.funderName} className="flex justify-between gap-4">
                    <span>{f.funderName}</span>
                    <span className="tabular-nums">{f.invoiced}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Care services billed for the period {formatUkDate(invoiceRun.periodStart)} to{' '}
          {formatUkDate(invoiceRun.periodEnd)}.
        </p>
      </div>

      <InvoiceBrandedFooter org={org} />
    </div>
  )
}

export function InvoiceRunPreviewDialog({
  open,
  onOpenChange,
  invoiceRun,
  serviceUserIdFilter,
}: Props) {
  const org = useInvoiceOrganisation(open)

  if (!invoiceRun) return null

  const allSu =
    invoiceRun.serviceUserSummaries && invoiceRun.serviceUserSummaries.length > 0
      ? invoiceRun.serviceUserSummaries.map((group) => ({
          ...group,
          lines:
            group.lines ??
            invoiceRun.lines.filter((line) => line.serviceUserId === group.serviceUserId),
        }))
      : []
  const invoices = serviceUserIdFilter
    ? allSu.filter(g => g.serviceUserId === serviceUserIdFilter)
    : allSu
  const hasLines = invoices.some((g) => (g.lines?.length ?? 0) > 0 || g.lineCount > 0)

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
            {invoices.length > 0 ? (
              <Badge variant="secondary" size="sm">
                {invoices.length} service user invoice{invoices.length === 1 ? '' : 's'}
              </Badge>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Each service user receives their own invoice. Provider details are loaded from Settings →
            Company.
          </p>

          {!hasLines ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No invoice lines yet. Calculate the run to generate charges from approved visits.
            </div>
          ) : (
            invoices.map(group => {
              const originalIndex = allSu.findIndex(row => row.serviceUserId === group.serviceUserId)
              return (
                <div key={group.serviceUserId} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" size="sm">
                      Service user invoice — {group.serviceUserName}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {group.invoiceNumber ? `${group.invoiceNumber} · ` : ''}
                      {group.subtotal}
                    </span>
                  </div>
                  <LiveInvoiceDocument
                    invoiceRun={invoiceRun}
                    group={group}
                    invoiceIndex={originalIndex}
                    invoiceTotal={allSu.length}
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
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
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
