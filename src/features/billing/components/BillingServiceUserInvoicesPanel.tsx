import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Send,
  Users,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { InvoiceRunStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { useServiceUserInvoicesOverview } from '@/features/billing/hooks/useInvoiceRuns'
import type {
  ServiceUserInvoiceMonthRow,
  ServiceUserInvoiceOverviewRow,
} from '@/features/billing/types/service-user-invoices.types'
import { useAuthStore } from '@/features/auth/store'

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

/** Compact per-row sent ratio. */
function MiniRatio({ sent, total }: { sent: number; total: number }) {
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0
  return (
    <div className="ml-auto flex w-28 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-amber-200/70 dark:bg-amber-950/50">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  )
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

/** The per-month invoice history rows for one service user. */
function MonthTable({ months }: { months: ServiceUserInvoiceMonthRow[] }) {
  if (months.length === 0) {
    return <p className="px-1 py-2 text-sm text-muted-foreground">No invoices for this period.</p>
  }
  return (
    <div className="overflow-x-auto rounded-md border border-border/70 bg-background">
      <table className="w-full min-w-[720px] text-xs">
        <thead>
          <tr className="border-b border-border/70 text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">Month / period</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Sent?</th>
            <th className="px-3 py-2 text-right font-medium">Lines</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            <th className="px-3 py-2 text-left font-medium">Invoice run</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.runId} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
              <td className="px-3 py-2 font-medium">{m.period}</td>
              <td className="px-3 py-2">
                <InvoiceRunStatusBadge status={m.status} />
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
              <td className="px-3 py-2 text-right tabular-nums">{m.lineCount}</td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">{m.subtotal}</td>
              <td className="px-3 py-2">
                <Link
                  to="/billing/invoice-runs/$invoiceRunId"
                  params={{ invoiceRunId: m.runId }}
                  className="text-primary hover:underline"
                >
                  Open run
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ServiceUserRow({ row }: { row: ServiceUserInvoiceOverviewRow }) {
  const [open, setOpen] = React.useState(false)
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
        <td className="px-3 py-2.5">
          <MiniRatio sent={row.sentCount} total={row.invoiceCount} />
        </td>
        <td className="px-3 py-2.5 text-right tabular-nums font-medium">{row.totalInvoiced}</td>
        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
          {row.lastPeriodEnd ?? '—'}
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-border bg-muted/10 last:border-0">
          <td colSpan={7} className="px-3 py-2">
            <MonthTable months={row.months} />
          </td>
        </tr>
      ) : null}
    </>
  )
}

export function BillingServiceUserInvoicesPanel() {
  const canRead = useAuthStore((s) => s.can('billing.invoice_runs.read' as never))
  const [serviceUserId, setServiceUserId] = React.useState('')
  const [month, setMonth] = React.useState('')
  const query = useServiceUserInvoicesOverview()
  const overview = query.data

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
        description="Pick a service user to see their previous invoices, or browse everyone. Filter by month to focus on a billing period; each invoice shows whether it has been sent to the funder or is still outstanding."
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
            <Link
              to="/service-users/$serviceUserId"
              params={{ serviceUserId: selected.serviceUserId }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Open service user
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile icon={<FileText className="h-4 w-4" />} label="Invoices" value={selectedSummary.invoiceCount} />
            <StatTile icon={<Send className="h-4 w-4" />} label="Sent" value={selectedSummary.sentCount} tone="sent" />
            <StatTile icon={<Clock className="h-4 w-4" />} label="Remaining" value={selectedSummary.pendingCount} tone="pending" />
            <StatTile icon={<span className="text-sm font-semibold">£</span>} label="Total invoiced" value={gbp.format(selectedSummary.totalValue)} />
          </div>

          <SentProgress sent={selectedSummary.sentCount} remaining={selectedSummary.pendingCount} />

          <MonthTable months={selectedMonths} />
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
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Service user</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Invoices</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Sent</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Remaining</th>
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Progress</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Total invoiced</th>
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
