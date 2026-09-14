import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  CalendarDays,
  CalendarRange,
  FileSearch,
  History,
  Loader2,
} from 'lucide-react'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { InvoiceRunStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { InvoiceRunAuditTrail } from '@/features/billing/components/InvoiceRunAuditTrail'
import { InvoiceRunCadenceBadge } from '@/features/billing/utils/invoice-run-cadence.util'
import {
  useInvoiceRun,
  useInvoiceRuns,
} from '@/features/billing/hooks/useInvoiceRuns'
import type { InvoiceRunRow } from '@/features/billing/api/invoice-runs.api'
import {
  currentOpsMonth,
  currentOpsWeek,
  salaryMonthDateRange,
  salaryWeekDateRange,
  shiftSalaryMonth,
  shiftSalaryWeek,
} from '@/features/billing/utils/salary-period.util'

type DatePreset =
  | 'all'
  | 'this-week'
  | 'previous-week'
  | 'this-month'
  | 'previous-month'
  | 'custom'

const DATE_PRESETS: {
  id: DatePreset
  label: string
  icon: React.ReactNode
}[] = [
  { id: 'all', label: 'All time', icon: <History className="h-3.5 w-3.5" aria-hidden /> },
  {
    id: 'this-week',
    label: 'This week',
    icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden />,
  },
  {
    id: 'previous-week',
    label: 'Previous week',
    icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden />,
  },
  {
    id: 'this-month',
    label: 'This month',
    icon: <CalendarRange className="h-3.5 w-3.5" aria-hidden />,
  },
  {
    id: 'previous-month',
    label: 'Previous month',
    icon: <CalendarRange className="h-3.5 w-3.5" aria-hidden />,
  },
  {
    id: 'custom',
    label: 'Custom dates',
    icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden />,
  },
]

function rangeForPreset(
  preset: DatePreset,
  custom?: { dateFrom?: string; dateTo?: string },
): { dateFrom?: string; dateTo?: string } {
  if (preset === 'this-week') return salaryWeekDateRange(currentOpsWeek())
  if (preset === 'previous-week') {
    return salaryWeekDateRange(shiftSalaryWeek(currentOpsWeek(), -1))
  }
  if (preset === 'this-month') return salaryMonthDateRange(currentOpsMonth())
  if (preset === 'previous-month') {
    return salaryMonthDateRange(shiftSalaryMonth(currentOpsMonth(), -1))
  }
  if (preset === 'custom') {
    return {
      dateFrom: custom?.dateFrom || undefined,
      dateTo: custom?.dateTo || undefined,
    }
  }
  return {}
}

/** Keep runs whose billing period overlaps the selected date range. */
function runOverlapsRange(
  row: InvoiceRunRow,
  dateFrom?: string,
  dateTo?: string,
): boolean {
  if (!dateFrom && !dateTo) return true
  if (dateFrom && row.periodEnd < dateFrom) return false
  if (dateTo && row.periodStart > dateTo) return false
  return true
}

function formatInvoiceNumbers(
  numbers: string[] | undefined | null,
  opts?: { maxVisible?: number },
): string {
  const list = (numbers ?? []).map(n => n.trim()).filter(Boolean)
  if (list.length === 0) return '—'
  const max = opts?.maxVisible
  if (max != null && list.length > max) {
    return `${list.slice(0, max).join(', ')} +${list.length - max}`
  }
  return list.join(', ')
}

type Props = {
  initialInvoiceRunId?: string
}

export function BillingInvoiceAuditTrailPanel({ initialInvoiceRunId }: Props) {
  const canRead = useAuthStore(s => s.can('billing.invoice_runs.read' as never))
  const { locationId } = useGlobalLocationScope()
  const { formatDate } = useOrganisationDisplayFormat()
  const navigate = useNavigate()
  const runsQuery = useInvoiceRuns({ locationId: locationId ?? undefined })
  const rows = runsQuery.data ?? []

  const [preset, setPreset] = React.useState<DatePreset>('all')
  const [customFrom, setCustomFrom] = React.useState('')
  const [customTo, setCustomTo] = React.useState('')

  const filters = React.useMemo(
    () =>
      rangeForPreset(
        preset,
        preset === 'custom' ? { dateFrom: customFrom, dateTo: customTo } : undefined,
      ),
    [preset, customFrom, customTo],
  )

  const visibleRows = React.useMemo(
    () =>
      rows.filter(row =>
        runOverlapsRange(row, filters.dateFrom, filters.dateTo),
      ),
    [rows, filters.dateFrom, filters.dateTo],
  )

  const [detailRunId, setDetailRunId] = React.useState<string | null>(
    initialInvoiceRunId ?? null,
  )

  React.useEffect(() => {
    if (initialInvoiceRunId) setDetailRunId(initialInvoiceRunId)
  }, [initialInvoiceRunId])

  const detailOpen = Boolean(detailRunId)
  const detailQuery = useInvoiceRun(detailRunId ?? undefined)
  const selectedRow =
    rows.find(r => r.id === detailRunId) ??
    visibleRows.find(r => r.id === detailRunId) ??
    null

  const openDetails = (row: InvoiceRunRow) => {
    setDetailRunId(row.id)
    void navigate({
      to: '/billing/invoice-audit-trail',
      search: { invoiceRunId: row.id },
      replace: true,
    })
  }

  const closeDetails = (open: boolean) => {
    if (open) return
    setDetailRunId(null)
    void navigate({
      to: '/billing/invoice-audit-trail',
      search: {},
      replace: true,
    })
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view invoice audit trails.
      </p>
    )
  }

  const rangeHint =
    filters.dateFrom && filters.dateTo
      ? `${formatDate(filters.dateFrom)} → ${formatDate(filters.dateTo)}`
      : filters.dateFrom
        ? `From ${formatDate(filters.dateFrom)}`
        : filters.dateTo
          ? `Until ${formatDate(filters.dateTo)}`
          : null

  return (
    <div className="space-y-6" data-testid="billing-invoice-audit-trail-panel">
      <ContentSectionHeader
        title="Invoice audit trail"
        description="Who created each invoice run and every calculate, approve, lock, send, email, export, and payment action."
        titleClassName="sr-only"
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden />
            Filter by invoice period
          </div>
          {rangeHint ? (
            <p className="text-xs text-muted-foreground">{rangeHint}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {DATE_PRESETS.map(({ id, label, icon }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={preset === id ? 'default' : 'outline'}
              leftIcon={icon}
              onClick={() => setPreset(id)}
              data-testid={`billing-invoice-audit-preset-${id}`}
            >
              {label}
            </Button>
          ))}
        </div>

        {preset === 'custom' ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/90">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                From
              </span>
              <Input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="h-9 w-44"
                data-testid="billing-invoice-audit-custom-from"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/90">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                To
              </span>
              <Input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="h-9 w-44"
                data-testid="billing-invoice-audit-custom-to"
              />
            </label>
          </div>
        ) : null}
      </div>

      {runsQuery.isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading invoice runs…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No invoice runs yet.
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No invoice runs match this date filter
          {rangeHint ? ` (${rangeHint})` : ''}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Period
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Invoice no.
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Created by
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Created
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                  Service users
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                  Net total
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(row => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20"
                >
                  <td className="px-3 py-2.5 font-medium">
                    <Link
                      to="/billing/invoice-runs/$invoiceRunId"
                      params={{ invoiceRunId: row.id }}
                      className="text-primary hover:underline"
                    >
                      {row.period}
                    </Link>
                    <div className="text-xs font-normal text-muted-foreground">
                      {formatDate(row.periodStart)} → {formatDate(row.periodEnd)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="font-mono text-xs text-foreground"
                      title={(row.invoiceNumbers ?? []).join(', ') || undefined}
                    >
                      {formatInvoiceNumbers(row.invoiceNumbers, { maxVisible: 2 })}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <InvoiceRunCadenceBadge
                      startIso={row.periodStart}
                      endIso={row.periodEnd}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <InvoiceRunStatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2.5 text-foreground">
                    {row.createdByName?.trim() || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    {row.createdAt ? formatDate(row.createdAt.slice(0, 10)) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {row.serviceUsers}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                    {row.netTotal}
                  </td>
                  <td className="px-3 py-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<FileSearch className="h-3.5 w-3.5" />}
                      onClick={() => openDetails(row)}
                      data-testid={`billing-invoice-audit-view-${row.id}`}
                    >
                      View audit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={detailOpen} onOpenChange={closeDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice audit details</DialogTitle>
          </DialogHeader>
          <DialogBody className="max-h-[70vh] space-y-4 overflow-y-auto">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm">
              <p className="font-medium text-foreground">
                {selectedRow?.period ?? detailQuery.data?.period ?? 'Invoice run'}
              </p>
              <p className="mt-0.5 font-mono text-xs text-foreground">
                {formatInvoiceNumbers(
                  selectedRow?.invoiceNumbers ?? detailQuery.data?.invoiceNumbers,
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {(selectedRow ?? detailQuery.data)?.createdByName
                  ? `Created by ${(selectedRow ?? detailQuery.data)?.createdByName}`
                  : 'Who did what on this run, in order'}
              </p>
            </div>

            {detailQuery.isLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading audit trail…
              </div>
            ) : detailQuery.isError ? (
              <p className="py-6 text-sm text-destructive">
                Could not load audit trail for this run.
              </p>
            ) : (
              <InvoiceRunAuditTrail events={detailQuery.data?.auditTrail ?? []} />
            )}
          </DialogBody>
          <DialogFooter className="gap-2 sm:justify-between">
            {detailRunId ? (
              <Button variant="outline" asChild>
                <Link
                  to="/billing/invoice-runs/$invoiceRunId"
                  params={{ invoiceRunId: detailRunId }}
                >
                  Open run
                </Link>
              </Button>
            ) : (
              <span />
            )}
            <Button variant="outline" onClick={() => closeDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
