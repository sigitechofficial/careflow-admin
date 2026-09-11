import * as React from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import {
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  Send,
  Users,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { Button } from '@/shared/ui/button'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  downloadInvoiceRunExport,
  fetchServiceUserInvoices,
  type ServiceUserInvoiceRunRow,
} from '@/features/billing/api/invoice-runs.api'
import { InvoiceRunStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { RecordFunderPaymentDialog } from '@/features/billing/components/RecordFunderPaymentDialog'
import { SendServiceUserInvoiceEmailDialog } from '@/features/billing/components/SendServiceUserInvoiceEmailDialog'
import { useServiceUserInvoicesOverview } from '@/features/billing/hooks/useInvoiceRuns'
import type {
  InvoiceRunPaymentStatus,
  ServiceUserInvoiceMonthRow,
  ServiceUserInvoiceOverviewRow,
} from '@/features/billing/types/service-user-invoices.types'
import { useAuthStore } from '@/features/auth/store'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

function PaymentBadge({
  status,
  paid,
}: {
  status: InvoiceRunPaymentStatus
  /** When part-paid / in progress, show how much has already been paid. */
  paid?: string
}) {
  if (status === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Paid
        {paid ? <span className="tabular-nums">· {paid}</span> : null}
      </span>
    )
  }
  if (status === 'PART_PAID') {
    return (
      <span className="inline-flex max-w-full items-center gap-x-1 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
        Partial paid
        {paid ? <span className="tabular-nums">· {paid} paid</span> : null}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Unpaid
    </span>
  )
}

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

function monthLabel(ym: string): string {
  const [year, month] = ym.split('-').map(Number)
  if (!year || !month) return ym
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Filter a service user's invoices to a single month (YYYY-MM); empty month = all. */
function monthsForFilter(months: ServiceUserInvoiceMonthRow[], month: string): ServiceUserInvoiceMonthRow[] {
  if (!month) return months
  return months.filter((m) => m.periodStart.slice(0, 7) === month)
}

function summarize(months: ServiceUserInvoiceMonthRow[]) {
  let sentCount = 0
  let pendingCount = 0
  let totalValue = 0
  for (const m of months) {
    if (m.sent) sentCount += 1
    else pendingCount += 1
    totalValue += m.subtotalValue
  }
  return { invoiceCount: months.length, sentCount, pendingCount, totalValue }
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Download the currently filtered overview as a flat CSV (one row per invoice). */
function downloadServiceUserInvoicesListCsv(
  rows: Array<ServiceUserInvoiceOverviewRow & { months: ServiceUserInvoiceMonthRow[] }>,
  filename: string,
) {
  const header = [
    'Service User',
    'Service User Number',
    'Period',
    'Period Start',
    'Period End',
    'Status',
    'Sent',
    'Sent At',
    'Amount',
    'Payment Status',
    'Paid',
    'Outstanding',
  ]
  const lines = [header.map(escapeCsv).join(',')]
  for (const su of rows) {
    for (const m of su.months) {
      lines.push(
        [
          su.serviceUserName,
          su.serviceUserNumber,
          m.period,
          m.periodStart,
          m.periodEnd,
          m.status,
          m.sent ? 'Yes' : 'No',
          m.sentAt,
          m.subtotalValue.toFixed(2),
          m.paymentStatus,
          m.paidValue.toFixed(2),
          m.outstandingValue.toFixed(2),
        ]
          .map(escapeCsv)
          .join(','),
      )
    }
  }
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function StatTile({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  tone?: 'sent' | 'pending' | 'neutral'
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          tone === 'sent' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
          tone === 'pending' && 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
          tone === 'neutral' && 'bg-primary/10 text-primary',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  )
}

/** Sent-vs-remaining bar with a legend. */
function SentProgress({ sent, remaining }: { sent: number; remaining: number }) {
  const total = sent + remaining
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">Sent to funders</span>
        <span className="tabular-nums text-muted-foreground">
          {sent} of {total} invoices · {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-amber-200/70 dark:bg-amber-950/50">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Sent {sent}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Remaining {remaining}
        </span>
      </div>
    </div>
  )
}

/** Paid amount attributed to this service user on one invoice month. */
function paidTowardServiceUser(m: ServiceUserInvoiceMonthRow): number {
  if (m.funders.length > 0) {
    const fromFunders = m.funders.reduce((s, f) => s + f.paidValue, 0)
    // Only count amounts tagged to this service user's funders (not other funders on the run).
    return Math.round(Math.min(Math.max(0, fromFunders), m.subtotalValue) * 100) / 100
  }
  if (m.runNetTotalValue > 0.001) {
    const share = (m.paidValue * m.subtotalValue) / m.runNetTotalValue
    return Math.round(Math.min(Math.max(0, share), m.subtotalValue) * 100) / 100
  }
  return Math.round(Math.min(Math.max(0, m.paidValue), m.subtotalValue) * 100) / 100
}

function totalPaidForServiceUser(row: ServiceUserInvoiceOverviewRow): number {
  return Math.round(row.months.reduce((s, m) => s + paidTowardServiceUser(m), 0) * 100) / 100
}

function CountPill({ value, tone }: { value: number; tone: 'sent' | 'pending' }) {
  if (value === 0) {
    return <span className="tabular-nums text-muted-foreground">0</span>
  }
  return (
    <span
      className={cn(
        'inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        tone === 'sent'
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
          : 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
      )}
    >
      {value}
    </span>
  )
}

function InvoiceDetailDialog({
  run,
  serviceUserName,
  onOpenChange,
}: {
  run: ServiceUserInvoiceRunRow | null
  serviceUserName: string
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={run !== null} onOpenChange={onOpenChange}>
      <DialogContent size="full" className="max-w-[min(98vw,88rem)]">
        <DialogHeader>
          <DialogTitle>{run ? `Invoice — ${run.period}` : 'Invoice'}</DialogTitle>
        </DialogHeader>
        {run ? (
          <DialogBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">{serviceUserName}</span>
              <InvoiceRunStatusBadge status={run.status} />
              {run.sent ? <PaymentBadge status={run.paymentStatus} paid={run.paid} /> : null}
              <span className="text-muted-foreground">
                {run.periodStart} → {run.periodEnd}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">This client</p>
                <p className="text-lg font-semibold tabular-nums">{run.subtotal}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Invoice total</p>
                <p className="text-lg font-semibold tabular-nums">{run.runNetTotal}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Paid</p>
                <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {run.paid}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Outstanding</p>
                <p className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                  {run.outstanding}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Visits
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[1480px] text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Visit reference</th>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-left font-medium">Slot</th>
                      <th className="px-3 py-2 text-left font-medium">Carer</th>
                      <th className="px-3 py-2 text-left font-medium">Planned start</th>
                      <th className="px-3 py-2 text-left font-medium">Planned end</th>
                      <th className="px-3 py-2 text-left font-medium">Actual start</th>
                      <th className="px-3 py-2 text-left font-medium">Actual end</th>
                      <th className="px-3 py-2 text-left font-medium">Planned duration</th>
                      <th className="px-3 py-2 text-left font-medium">Actual duration</th>
                      <th className="px-3 py-2 text-left font-medium">Duration variance</th>
                      <th className="px-3 py-2 text-left font-medium">Address</th>
                      <th className="px-3 py-2 text-left font-medium">Funder</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.lines.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="px-3 py-4 text-center text-muted-foreground">
                          No invoice lines for this client on this run.
                        </td>
                      </tr>
                    ) : (
                      run.lines.map((line) => (
                        <tr key={line.id} className="border-b border-border/60 last:border-0 align-top">
                          <td className="whitespace-nowrap px-3 py-2 font-medium">
                            {line.visitRef ?? '—'}
                            {line.exceptionMessage ? (
                              <p className="mt-0.5 max-w-[12rem] text-[10px] font-normal text-amber-600 dark:text-amber-400">
                                {line.exceptionMessage}
                              </p>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">{line.date ?? '—'}</td>
                          <td className="px-3 py-2">{line.slot ?? '—'}</td>
                          <td className="px-3 py-2">{line.carerName ?? '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                            {line.plannedStart ?? '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                            {line.plannedEnd ?? '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                            {line.actualStart ?? '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                            {line.actualEnd ?? '—'}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2">{line.plannedDuration ?? '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2">{line.actualDuration ?? '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2">{line.durationVariance ?? '—'}</td>
                          <td className="max-w-[14rem] px-3 py-2" title={line.address ?? undefined}>
                            <span className="line-clamp-2">{line.address ?? '—'}</span>
                          </td>
                          <td className="px-3 py-2">{line.funderName}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">
                            {line.amount}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogBody>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/** The per-month invoice history rows for one service user. */
function MonthTable({
  months,
  serviceUserId,
  serviceUserName,
}: {
  months: ServiceUserInvoiceMonthRow[]
  serviceUserId: string
  serviceUserName?: string
}) {
  const canManage = useAuthStore((s) => s.can('billing.invoice_runs.manage' as never))
  const canManagePayments = useAuthStore((s) => s.can('billing.payments.manage' as never))
  const [payInvoice, setPayInvoice] = React.useState<ServiceUserInvoiceMonthRow | null>(null)
  const [emailInvoice, setEmailInvoice] = React.useState<ServiceUserInvoiceMonthRow | null>(null)
  const [exportingRunId, setExportingRunId] = React.useState<string | null>(null)
  const [detailRun, setDetailRun] = React.useState<ServiceUserInvoiceRunRow | null>(null)
  const [detailLoadingId, setDetailLoadingId] = React.useState<string | null>(null)

  const handleCsv = async (m: ServiceUserInvoiceMonthRow) => {
    setExportingRunId(m.runId)
    try {
      await downloadInvoiceRunExport(m.runId, 'csv', { serviceUserId })
      toastSuccess('CSV downloaded')
    } catch (e) {
      toastApiError(e)
    } finally {
      setExportingRunId(null)
    }
  }

  const handleDetail = async (m: ServiceUserInvoiceMonthRow) => {
    setDetailLoadingId(m.runId)
    try {
      const summary = await fetchServiceUserInvoices(serviceUserId)
      const run = summary.runs.find((r) => r.id === m.runId) ?? null
      if (!run) {
        toastApiError(new Error('Invoice details not found for this run'))
        return
      }
      setDetailRun(run)
    } catch (e) {
      toastApiError(e)
    } finally {
      setDetailLoadingId(null)
    }
  }

  if (months.length === 0) {
    return <p className="px-1 py-2 text-sm text-muted-foreground">No invoices for this period.</p>
  }
  return (
    <>
    <div className="overflow-x-auto rounded-md border border-border/70 bg-background">
      <table className="w-full min-w-[1180px] text-xs">
        <thead>
          <tr className="border-b border-border/70 text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">Month / period</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Sent?</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            <th className="px-3 py-2 text-left font-medium">Payment</th>
            <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => {
            const canEmail =
              canManage &&
              m.lineCount > 0 &&
              (m.status === 'APPROVED' ||
                m.status === 'LOCKED' ||
                m.status === 'SENT' ||
                m.status === 'PART_PAID' ||
                m.status === 'PAID')
            return (
              <tr key={m.runId} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2">
                  <p className="font-medium">{m.period}</p>
                  {m.invoiceNumber ? (
                    <p className="font-mono text-[11px] text-muted-foreground">{m.invoiceNumber}</p>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <div className="space-y-0.5">
                    <InvoiceRunStatusBadge status={m.status} />
                    {m.status === 'PART_PAID' || m.paymentStatus === 'PART_PAID' ? (
                      <p className="text-[11px] tabular-nums text-muted-foreground">
                        {m.paid} paid
                        {m.outstandingValue > 0.001 ? ` · ${m.outstanding} due` : null}
                      </p>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {m.sent ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Sent
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                      <Clock className="h-3.5 w-3.5" aria-hidden /> Remaining
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{m.subtotal}</td>
                <td className="px-3 py-2">
                  {m.sent ? (
                    <div className="space-y-0.5">
                      <PaymentBadge status={m.paymentStatus} paid={m.paid} />
                      {m.paymentStatus !== 'PART_PAID' ? (
                        <p className="text-[11px] text-muted-foreground">
                          {m.paymentStatus === 'PAID'
                            ? `Paid ${m.paid}`
                            : `${m.paid} paid · ${m.outstanding} due`}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">
                          {m.outstanding} still due
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 align-middle">
                  <div className="flex flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 px-2.5"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      loading={detailLoadingId === m.runId}
                      disabled={detailLoadingId !== null}
                      onClick={() => void handleDetail(m)}
                    >
                      Detail
                    </Button>
                    {canEmail ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 shrink-0 px-2.5"
                        leftIcon={<Send className="h-3.5 w-3.5" />}
                        onClick={() => setEmailInvoice(m)}
                        title="Email this service user's invoice (CSV attached)"
                      >
                        Send invoice
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 px-2.5"
                      leftIcon={<Download className="h-3.5 w-3.5" />}
                      loading={exportingRunId === m.runId}
                      disabled={m.lineCount === 0 || exportingRunId !== null}
                      onClick={() => void handleCsv(m)}
                      title="Download this service user's invoice lines as CSV"
                    >
                      CSV
                    </Button>
                    {canManagePayments && m.canRecordPayment ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 shrink-0 px-2.5"
                        leftIcon={<Banknote className="h-3.5 w-3.5" />}
                        onClick={() => setPayInvoice(m)}
                      >
                        Record payment
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" className="h-8 shrink-0 px-2.5" asChild>
                      <Link
                        to="/billing/invoice-runs/$invoiceRunId"
                        params={{ invoiceRunId: m.runId }}
                      >
                        Open run
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    <RecordFunderPaymentDialog
      open={payInvoice !== null}
      onOpenChange={(open) => {
        if (!open) setPayInvoice(null)
      }}
      invoice={payInvoice}
      serviceUserName={serviceUserName}
      serviceUserId={serviceUserId}
    />
    <SendServiceUserInvoiceEmailDialog
      open={emailInvoice !== null}
      onOpenChange={(open) => {
        if (!open) setEmailInvoice(null)
      }}
      runId={emailInvoice?.runId ?? null}
      serviceUserId={serviceUserId}
      serviceUserName={serviceUserName}
    />
    <InvoiceDetailDialog
      run={detailRun}
      serviceUserName={serviceUserName ?? ''}
      onOpenChange={(open) => {
        if (!open) setDetailRun(null)
      }}
    />
    </>
  )
}

function ServiceUserRow({ row }: { row: ServiceUserInvoiceOverviewRow }) {
  const [open, setOpen] = React.useState(false)
  const paid = totalPaidForServiceUser(row)
  const remaining = Math.max(0, Math.round((row.totalInvoicedValue - paid) * 100) / 100)
  return (
    <>
      <tr
        className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/20"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <ChevronRight
              className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
              aria-hidden
            />
            <div className="min-w-0">
              <Link
                to="/service-users/$serviceUserId"
                params={{ serviceUserId: row.serviceUserId }}
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-primary hover:underline"
              >
                {row.serviceUserName}
              </Link>
              {row.serviceUserNumber ? (
                <p className="text-xs text-muted-foreground">{row.serviceUserNumber}</p>
              ) : null}
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums font-medium">{row.invoiceCount}</td>
        <td className="px-3 py-2.5 text-right">
          <CountPill value={row.sentCount} tone="sent" />
        </td>
        <td className="px-3 py-2.5 text-right">
          <CountPill value={row.pendingCount} tone="pending" />
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums font-medium">{row.totalInvoiced}</td>
        <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
          {gbp.format(paid)}
        </td>
        <td
          className={cn(
            'px-3 py-2.5 text-right tabular-nums font-medium',
            remaining > 0.001
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-muted-foreground',
          )}
        >
          {gbp.format(remaining)}
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
          {row.lastPeriodEnd ?? '—'}
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-border bg-muted/10 last:border-0">
          <td colSpan={8} className="px-3 py-2">
            <MonthTable
              months={row.months}
              serviceUserId={row.serviceUserId}
              serviceUserName={row.serviceUserName}
            />
          </td>
        </tr>
      ) : null}
    </>
  )
}

export function BillingServiceUserInvoicesPanel() {
  const canRead = useAuthStore((s) => s.can('billing.invoice_runs.read' as never))
  const search = useSearch({ strict: false }) as { serviceUserId?: string }
  const [serviceUserId, setServiceUserId] = React.useState(search.serviceUserId ?? '')
  const [month, setMonth] = React.useState('')
  const query = useServiceUserInvoicesOverview()
  const overview = query.data

  React.useEffect(() => {
    if (search.serviceUserId) setServiceUserId(search.serviceUserId)
  }, [search.serviceUserId])

  const serviceUserOptions = React.useMemo<ComboboxOption[]>(
    () =>
      (overview?.serviceUsers ?? []).map((s) => ({
        value: s.serviceUserId,
        label: s.serviceUserName,
        description: s.serviceUserNumber ?? undefined,
      })),
    [overview],
  )

  const selected = React.useMemo(
    () =>
      serviceUserId
        ? (overview?.serviceUsers ?? []).find((s) => s.serviceUserId === serviceUserId) ?? null
        : null,
    [overview, serviceUserId],
  )

  // All service users, recomputed for the selected month (rows with no invoices that month drop out).
  const overviewRows = React.useMemo(() => {
    return (overview?.serviceUsers ?? [])
      .map((su) => {
        const months = monthsForFilter(su.months, month)
        const s = summarize(months)
        return {
          ...su,
          months,
          invoiceCount: s.invoiceCount,
          sentCount: s.sentCount,
          pendingCount: s.pendingCount,
          totalInvoicedValue: s.totalValue,
          totalInvoiced: gbp.format(s.totalValue),
          lastPeriodEnd: months[0]?.periodEnd ?? su.lastPeriodEnd,
        }
      })
      .filter((su) => su.invoiceCount > 0)
  }, [overview, month])

  const overviewTotals = React.useMemo(
    () =>
      overviewRows.reduce(
        (acc, r) => {
          acc.invoices += r.invoiceCount
          acc.sent += r.sentCount
          acc.pending += r.pendingCount
          return acc
        },
        { invoices: 0, sent: 0, pending: 0 },
      ),
    [overviewRows],
  )

  const selectedMonths = selected ? monthsForFilter(selected.months, month) : []
  const selectedSummary = summarize(selectedMonths)

  const handleExportListCsv = () => {
    const rows = selected
      ? [
          {
            ...selected,
            months: selectedMonths,
            invoiceCount: selectedSummary.invoiceCount,
            sentCount: selectedSummary.sentCount,
            pendingCount: selectedSummary.pendingCount,
            totalInvoiced: gbp.format(selectedSummary.totalValue),
          },
        ]
      : overviewRows
    if (rows.every((r) => r.months.length === 0)) {
      toastApiError(new Error('No invoices to export'))
      return
    }
    const stamp = new Date().toISOString().slice(0, 10)
    const who = selected
      ? selected.serviceUserName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'service-user'
      : 'all'
    downloadServiceUserInvoicesListCsv(rows, `service-user-invoices-${who}-${stamp}.csv`)
    toastSuccess('CSV downloaded')
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view invoices. Required:{' '}
        <span className="font-mono text-xs">billing.invoice_runs.read</span>.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <ContentSectionHeader
        title="Service user invoices"
        titleClassName="sr-only"
        description="Pick a service user to see their previous invoices, or browse everyone. Filter by month to focus on a billing period; send invoices when ready, or download CSV for a service user or the full list."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-3.5 w-3.5" />}
            disabled={query.isLoading || (selected ? selectedMonths.length === 0 : overviewRows.length === 0)}
            onClick={handleExportListCsv}
          >
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/20 p-3">
        <div className="min-w-[240px] flex-1 space-y-1">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden /> Service user
          </label>
          <Combobox
            options={serviceUserOptions}
            value={serviceUserId}
            onChange={setServiceUserId}
            placeholder="All service users"
            searchPlaceholder="Search service user…"
            allowDeselect
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="su-inv-month" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" aria-hidden /> Month
          </label>
          <select
            id="su-inv-month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 min-w-[9rem] rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All months</option>
            {(overview?.months ?? []).map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>
        {(serviceUserId || month) && (
          <button
            type="button"
            onClick={() => {
              setServiceUserId('')
              setMonth('')
            }}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading service user invoices…
        </div>
      ) : selected ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {selected.serviceUserName
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{selected.serviceUserName}</h3>
                <p className="text-xs text-muted-foreground">
                  {selected.serviceUserNumber ? `${selected.serviceUserNumber} · ` : ''}
                  {month ? monthLabel(month) : 'All months'} · previous invoices
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                disabled={selectedMonths.length === 0}
                onClick={handleExportListCsv}
              >
                Export CSV
              </Button>
              <Link
                to="/service-users/$serviceUserId"
                params={{ serviceUserId: selected.serviceUserId }}
                className="text-sm font-medium text-primary hover:underline"
              >
                Open service user
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={<FileText className="h-4 w-4" />} label="Invoices" value={selectedSummary.invoiceCount} />
            <StatTile icon={<Send className="h-4 w-4" />} label="Sent" value={selectedSummary.sentCount} tone="sent" />
            <StatTile icon={<Clock className="h-4 w-4" />} label="Remaining" value={selectedSummary.pendingCount} tone="pending" />
            <StatTile icon={<span className="text-sm font-semibold">£</span>} label="Total invoiced" value={gbp.format(selectedSummary.totalValue)} />
          </div>

          <SentProgress sent={selectedSummary.sentCount} remaining={selectedSummary.pendingCount} />

          <MonthTable
            months={selectedMonths}
            serviceUserId={selected.serviceUserId}
            serviceUserName={selected.serviceUserName}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={<Users className="h-4 w-4" />} label="Service users" value={overviewRows.length} />
            <StatTile icon={<FileText className="h-4 w-4" />} label="Invoices" value={overviewTotals.invoices} />
            <StatTile icon={<Send className="h-4 w-4" />} label="Sent" value={overviewTotals.sent} tone="sent" />
            <StatTile icon={<Clock className="h-4 w-4" />} label="Remaining" value={overviewTotals.pending} tone="pending" />
          </div>

          {overviewTotals.invoices > 0 ? (
            <SentProgress sent={overviewTotals.sent} remaining={overviewTotals.pending} />
          ) : null}

          {overviewRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {overview && overview.serviceUsers.length > 0
                ? 'No invoices in this month.'
                : 'No invoices yet. Create and calculate an invoice run for a billing period to see service user invoices here.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[1040px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Service user</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Invoices</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Sent</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Remaining</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Total invoiced</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Paid</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Balance</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Last period</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewRows.map((row) => (
                    <ServiceUserRow key={row.serviceUserId} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
