import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, ChevronRight, Clock, Loader2 } from 'lucide-react'
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

function StatTile({ label, value, tone }: { label: string; value: number | string; tone?: 'sent' | 'pending' }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-xl font-semibold tabular-nums',
          tone === 'sent' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'pending' && 'text-amber-600 dark:text-amber-400',
        )}
      >
        {value}
      </p>
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
            <tr key={m.runId} className="border-b border-border/60 last:border-0">
              <td className="px-3 py-2 font-medium">{m.period}</td>
              <td className="px-3 py-2">
                <InvoiceRunStatusBadge status={m.status} />
              </td>
              <td className="px-3 py-2">
                {m.sent ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Sent
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
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
        <td className="px-3 py-2.5 text-right tabular-nums font-medium">{row.totalInvoiced}</td>
        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
          {row.lastPeriodEnd ?? '—'}
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-border bg-muted/10 last:border-0">
          <td colSpan={6} className="px-3 py-2">
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

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Service user</label>
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
          <label htmlFor="su-inv-month" className="text-xs font-medium text-muted-foreground">
            Month
          </label>
          <select
            id="su-inv-month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All months</option>
            {(overview?.months ?? []).map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading service user invoices…
        </div>
      ) : selected ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {selected.serviceUserName}
                {selected.serviceUserNumber ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {selected.serviceUserNumber}
                  </span>
                ) : null}
              </h3>
              <p className="text-xs text-muted-foreground">
                {month ? monthLabel(month) : 'All months'} · previous invoices
              </p>
            </div>
            <Link
              to="/service-users/$serviceUserId"
              params={{ serviceUserId: selected.serviceUserId }}
              className="text-sm text-primary hover:underline"
            >
              Open service user
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Invoices" value={selectedSummary.invoiceCount} />
            <StatTile label="Sent" value={selectedSummary.sentCount} tone="sent" />
            <StatTile label="Remaining" value={selectedSummary.pendingCount} tone="pending" />
            <StatTile label="Total invoiced" value={gbp.format(selectedSummary.totalValue)} />
          </div>

          <MonthTable months={selectedMonths} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Service users" value={overviewRows.length} />
            <StatTile label="Invoices" value={overviewTotals.invoices} />
            <StatTile label="Sent" value={overviewTotals.sent} tone="sent" />
            <StatTile label="Remaining" value={overviewTotals.pending} tone="pending" />
          </div>

          {overviewRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {overview && overview.serviceUsers.length > 0
                ? 'No invoices in this month.'
                : 'No invoices yet. Create and calculate an invoice run for a billing period to see service user invoices here.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Service user</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Invoices</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Sent</th>
                    <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Remaining</th>
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
