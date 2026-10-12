import * as React from 'react'
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  PoundSterling,
  Search,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useEmployeeSalaries } from '@/features/billing/hooks/usePayrollRuns'
import { useEmployeePayoutBatches } from '@/features/billing/hooks/useEmployeePayouts'
import { EmployeePayoutBatchDetailDialog } from '@/features/billing/components/EmployeePayoutBatchDetailDialog'
import { BillingStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import type { EmployeePayoutBatchRow } from '@/features/billing/api/employee-payouts.api'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import type { SalaryCalculationBasis } from '@/features/settings/types'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { StatCard, type StatCardTone } from '@/shared/ui/card'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import {
  currentOpsMonth,
  currentOpsWeek,
  salaryMonthDateRange,
  salaryMonthLabel,
  salaryWeekDateRange,
  salaryWeekLabel,
  shiftSalaryMonth,
  shiftSalaryWeek,
} from '@/features/billing/utils/salary-period.util'

export function BillingSalaryOverviewPanel() {
  const canRead = useAuthStore(
    s =>
      s.can('billing.payroll_runs.read' as never) ||
      s.can('employees.read') ||
      s.can('employees.update'),
  )
  const canOpenEmployee = useAuthStore(s => s.can('employees.update') || s.can('employees.read'))
  const canReadPayouts = useAuthStore(s => s.can('billing.employee_payouts.read'))
  const canManagePayouts = useAuthStore(s => s.can('billing.employee_payouts.manage'))
  const { locationId } = useGlobalLocationScope()

  const { data: generalSettings } = useGeneralSettings(canRead)
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const basis: SalaryCalculationBasis =
    generalSettings?.salaryCalculationBasis === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY'
  const isWeekly = basis === 'WEEKLY'
  const periodNoun = isWeekly ? 'week' : 'month'

  const [period, setPeriod] = React.useState(() =>
    basis === 'WEEKLY' ? currentOpsWeek() : currentOpsMonth(),
  )
  const [search, setSearch] = React.useState('')
  const [selectedBatch, setSelectedBatch] = React.useState<EmployeePayoutBatchRow | null>(null)
  const [batchDialogOpen, setBatchDialogOpen] = React.useState(false)

  React.useEffect(() => {
    setPeriod(isWeekly ? currentOpsWeek() : currentOpsMonth())
  }, [isWeekly])

  const filters = React.useMemo(
    () => ({
      ...(isWeekly ? salaryWeekDateRange(period) : salaryMonthDateRange(period)),
      locationId: locationId ?? undefined,
    }),
    [isWeekly, period, locationId],
  )
  const periodLabel = isWeekly ? salaryWeekLabel(period, formatDate) : salaryMonthLabel(period)

  const formatBatchCreatedAt = (iso: string) => {
    const day = dayKeyFromInstant(iso)
    return day ? `${formatDate(day)} ${formatTime(iso)}` : '—'
  }

  const query = useEmployeeSalaries(filters, canRead)
  const rows = query.data?.rows ?? []
  const hasEligibleUkRun = query.data?.hasEligibleUkRun ?? false
  const batchesQuery = useEmployeePayoutBatches(period, canReadPayouts, locationId)

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      r =>
        r.employeeName.toLowerCase().includes(q) ||
        (r.employeeNumber?.toLowerCase().includes(q) ?? false),
    )
  }, [rows, search])

  const totals = React.useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.visitPay += r.salaryAmountValue
        acc.inVisitPayRun += r.paidAmountValue
        acc.rejected += r.rejectedAmountValue
        acc.fines += r.fineTotalValue
        acc.penalties += r.penaltyTotalValue
        acc.net += r.netSalaryAmountValue
        acc.ukNet += r.ukNetPayAmountValue ?? 0
        acc.bankPaid += r.paidOutAmountValue ?? 0
        acc.outstanding += r.outstandingPayoutAmountValue ?? 0
        return acc
      },
      {
        visitPay: 0,
        inVisitPayRun: 0,
        rejected: 0,
        fines: 0,
        penalties: 0,
        net: 0,
        ukNet: 0,
        bankPaid: 0,
        outstanding: 0,
      },
    )
  }, [filtered])

  // Headline payout summary: how many employees have been paid (UK net disbursed
  // via a PAID payout batch) versus still awaiting payment this period.
  const paidEmployeeCount = React.useMemo(
    () => filtered.filter(r => (r.paidOutAmountValue ?? 0) > 0).length,
    [filtered],
  )
  const remainingEmployeeCount = filtered.length - paidEmployeeCount
  const pendingReviewTotal = React.useMemo(
    () => filtered.reduce((acc, r) => acc + (r.pendingReviewCount ?? 0), 0),
    [filtered],
  )

  const money = (n: number) =>
    `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const openBatch = (batch: EmployeePayoutBatchRow) => {
    setSelectedBatch(batch)
    setBatchDialogOpen(true)
  }

  const hasOpenBatch = (batchesQuery.data ?? []).some(
    b => b.status === 'DRAFT' || b.status === 'APPROVED',
  )

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view employee salaries.
      </p>
    )
  }

  const shiftPeriod = (delta: number) =>
    setPeriod(p => (isWeekly ? shiftSalaryWeek(p, delta) : shiftSalaryMonth(p, delta)))

  return (
    <div className="flex flex-col gap-4" data-testid="billing-salary-overview-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <Wallet className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Visit salary overview</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Care visit earnings for the selected {periodNoun}, before UK PAYE / NI.
              <span className="font-medium text-foreground"> Remaining</span> is visit pay
              not yet in a visit-pay run or UK payroll run.
              Payment recorded / Outstanding track <span className="font-medium text-foreground">UK net</span>{' '}
              disbursed via Employee payouts (after W1/M1 tax &amp; NI) — not visit-pay net.
              Auto-payout on the <span className="font-medium text-foreground">4th</span> uses the
              previous month’s statutory UK run when one exists.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canReadPayouts ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/billing/employee-payouts">
                Payout history
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null}
          {canManagePayouts ? (
            <Button size="sm" asChild data-testid="billing-salary-create-payout-batch">
              <Link to="/billing/employee-payouts">
                <Banknote className="mr-2 h-3.5 w-3.5" />
                Create from UK run
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/20 p-3">
        <div className="mr-1 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
          <CalendarDays className="h-4 w-4" aria-hidden />
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={`Previous ${periodNoun}`}
          onClick={() => shiftPeriod(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-[10rem] text-center">
          <p className="text-sm font-semibold text-foreground">{periodLabel}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(filters.dateFrom)} → {formatDate(filters.dateTo)}
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={`Next ${periodNoun}`}
          onClick={() => shiftPeriod(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setPeriod(isWeekly ? currentOpsWeek() : currentOpsMonth())}
        >
          This {periodNoun}
        </Button>
        <div className="relative ml-auto min-w-[14rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search employee…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="billing-salary-search"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            {
              title: 'Total employees',
              value: String(filtered.length),
              hint: `With activity this ${periodNoun}`,
              icon: <Users className="h-4 w-4" aria-hidden />,
              tone: 'violet',
            },
            {
              title: 'Salary paid',
              value: String(paidEmployeeCount),
              hint: 'Employees with a payment recorded',
              icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
              tone: 'emerald',
            },
            {
              title: 'Remaining',
              value: String(remainingEmployeeCount),
              hint: 'Employees not yet paid',
              icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
              tone: 'amber',
            },
            {
              title: 'Amount paid',
              value: money(totals.bankPaid),
              hint: 'UK net recorded as paid (not bank-confirmed)',
              icon: <Banknote className="h-4 w-4" aria-hidden />,
              tone: 'sky',
            },
            {
              title: 'Amount remaining',
              value: hasEligibleUkRun ? money(totals.outstanding) : '—',
              hint: hasEligibleUkRun ? 'UK net still to pay' : 'UK run required',
              icon: <PoundSterling className="h-4 w-4" aria-hidden />,
              tone: 'rose',
            },
            {
              title: 'Rejected',
              value: money(totals.rejected),
              hint: 'Excluded from salary',
              icon: <XCircle className="h-4 w-4" aria-hidden />,
              tone: 'rose',
            },
            {
              title: 'Fines & penalties',
              value: money(totals.fines + totals.penalties),
              hint: 'Deductions',
              icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
              tone: 'amber',
            },
            {
              title: 'Pending review',
              value: String(pendingReviewTotal),
              hint: 'Visits awaiting review',
              icon: <Clock className="h-4 w-4" aria-hidden />,
              tone: 'sky',
            },
          ] as const
        ).map(card => (
          <StatCard
            key={card.title}
            label={card.title}
            value={card.value}
            hint={card.hint}
            icon={card.icon}
            tone={card.tone as StatCardTone}
          />
        ))}
      </div>

      {canReadPayouts ? (
        <ContentCard className="space-y-3 p-4" data-testid="billing-salary-payout-batches">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Payout batches this period</p>
              <p className="text-xs text-muted-foreground">
                Period {period} — full history is on{' '}
                <Link
                  to="/billing/employee-payouts"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Employee payouts
                </Link>
                . Auto-runs on the 4th from a closed/statutory UK run when eligible.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasOpenBatch ? (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  Open batch in progress
                </Badge>
              ) : null}
              <Button variant="ghost" size="sm" asChild>
                <Link to="/billing/employee-payouts">View all</Link>
              </Button>
            </div>
          </div>
          {batchesQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading batches…
            </div>
          ) : batchesQuery.isError ? (
            <p className="text-sm text-destructive">Could not load payout batches.</p>
          ) : (batchesQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No payout batches for this period yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Created
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Employees
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Total
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(batchesQuery.data ?? []).map(batch => (
                    <tr key={batch.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatBatchCreatedAt(batch.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{batch.lineCount}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {batch.totalAmount}
                      </td>
                      <td className="px-3 py-2">
                        <BillingStatusBadge status={batch.status} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => openBatch(batch)}
                        >
                          Open
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentCard>
      ) : null}

      <ContentCard className="overflow-hidden p-0">
        {query.isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading salaries…</p>
          </div>
        ) : query.isError ? (
          <p className="p-4 text-sm text-destructive">Could not load employee salaries.</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No employees with salary activity for {periodLabel}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                <tr className="border-b border-border">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Employee
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Visit pay
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    In visit-pay run
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-medium text-muted-foreground"
                    title="Approved visit pay not yet in a locked visit-pay run or UK payroll run"
                  >
                    Remaining
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Rejected
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Pending
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Fines</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Penalties
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Net salary
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    UK net
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Payment recorded
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Outstanding
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr
                    key={row.employeeId}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                    data-testid={`billing-salary-row-${row.employeeId}`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{row.employeeName}</span>
                        <span className="text-xs text-muted-foreground">
                          {row.employeeNumber ? `#${row.employeeNumber}` : '—'}
                          {!row.isActive ? ' · Inactive' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <div>{row.salaryAmount}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.salaryVisitCount} visit{row.salaryVisitCount === 1 ? '' : 's'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-success">
                      {row.paidAmount}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{row.remainingAmount}</td>
                    <td className="px-3 py-2.5 text-right">
                      {row.rejectedVisitCount > 0 ? (
                        <div>
                          <span className="tabular-nums text-destructive">{row.rejectedAmount}</span>
                          <div className="text-xs text-muted-foreground">
                            {row.rejectedVisitCount} visit{row.rejectedVisitCount === 1 ? '' : 's'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {row.pendingReviewCount > 0 ? (
                        <Badge
                          variant="outline"
                          className="bg-warning/10 text-warning border-warning/20"
                        >
                          {row.pendingReviewCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2.5 text-right tabular-nums',
                        row.fineTotalValue > 0 && 'text-destructive',
                      )}
                    >
                      {row.fineTotalValue > 0 ? `−${row.fineTotal}` : '—'}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2.5 text-right tabular-nums',
                        row.penaltyTotalValue > 0 && 'text-destructive',
                      )}
                    >
                      {row.penaltyTotalValue > 0 ? `−${row.penaltyTotal}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {row.netSalaryAmount}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {row.hasEligibleUkRun ? (
                        (row.ukNetPayAmount ?? '£0.00')
                      ) : (
                        <span className="text-xs text-muted-foreground">UK run required</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-success">
                      {row.paidOutAmountValue > 0 ? row.paidOutAmount : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {!row.hasEligibleUkRun ? (
                        <span className="text-xs text-muted-foreground">UK run required</span>
                      ) : (row.outstandingPayoutAmountValue ?? 0) > 0 ? (
                        row.outstandingPayoutAmount
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {canOpenEmployee ? (
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            to="/employee/$employeeId/edit"
                            params={{ employeeId: row.employeeId }}
                          >
                            Open
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      <EmployeePayoutBatchDetailDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        batch={selectedBatch}
        canManage={canManagePayouts}
      />
    </div>
  )
}
