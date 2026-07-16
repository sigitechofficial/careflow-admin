import * as React from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Search } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import { useEmployeeSalaries } from '@/features/billing/hooks/usePayrollRuns'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import type { SalaryCalculationBasis } from '@/features/settings/types'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function isoWeekPeriodKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${pad2(weekNo)}`
}

function currentUtcMonth(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}`
}

function currentUtcWeek(): string {
  return isoWeekPeriodKey(new Date())
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`
}

function mondayOfIsoWeek(period: string): Date {
  const match = /^(\d{4})-W(\d{2})$/.exec(period)
  if (!match) return new Date(NaN)
  const year = Number(match[1])
  const week = Number(match[2])
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Dow = jan4.getUTCDay() || 7
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1))
  const monday = new Date(week1Monday)
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  return monday
}

function shiftWeek(period: string, delta: number): string {
  const monday = mondayOfIsoWeek(period)
  monday.setUTCDate(monday.getUTCDate() + delta * 7)
  return isoWeekPeriodKey(monday)
}

function utcMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)))
}

function utcWeekLabel(period: string): string {
  const monday = mondayOfIsoWeek(period)
  if (Number.isNaN(monday.getTime())) return period
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const fmt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
  return `Week ${period.slice(6)} · ${fmt.format(monday)} – ${fmt.format(sunday)} ${period.slice(0, 4)}`
}

function monthDateRange(month: string): { dateFrom: string; dateTo: string } {
  const [y, m] = month.split('-').map(Number)
  const from = new Date(Date.UTC(y, m - 1, 1))
  const to = new Date(Date.UTC(y, m, 0))
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  }
}

function weekDateRange(period: string): { dateFrom: string; dateTo: string } {
  const monday = mondayOfIsoWeek(period)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return {
    dateFrom: monday.toISOString().slice(0, 10),
    dateTo: sunday.toISOString().slice(0, 10),
  }
}

export function BillingSalaryOverviewPanel() {
  const canRead = useAuthStore(
    s =>
      s.can('billing.payroll_runs.read' as never) ||
      s.can('employees.read') ||
      s.can('employees.update'),
  )
  const canOpenEmployee = useAuthStore(s => s.can('employees.update') || s.can('employees.read'))

  const { data: generalSettings } = useGeneralSettings(canRead)
  const basis: SalaryCalculationBasis =
    generalSettings?.salaryCalculationBasis === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY'
  const isWeekly = basis === 'WEEKLY'
  const periodNoun = isWeekly ? 'week' : 'month'

  const [period, setPeriod] = React.useState(() =>
    basis === 'WEEKLY' ? currentUtcWeek() : currentUtcMonth(),
  )
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    setPeriod(isWeekly ? currentUtcWeek() : currentUtcMonth())
  }, [isWeekly])

  const filters = React.useMemo(
    () => (isWeekly ? weekDateRange(period) : monthDateRange(period)),
    [isWeekly, period],
  )
  const periodLabel = isWeekly ? utcWeekLabel(period) : utcMonthLabel(period)

  const query = useEmployeeSalaries(filters, canRead)
  const rows = query.data?.rows ?? []

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
        acc.paid += r.paidAmountValue
        acc.rejected += r.rejectedAmountValue
        acc.fines += r.fineTotalValue
        acc.penalties += r.penaltyTotalValue
        acc.net += r.netSalaryAmountValue
        return acc
      },
      { visitPay: 0, paid: 0, rejected: 0, fines: 0, penalties: 0, net: 0 },
    )
  }, [filtered])

  const money = (n: number) =>
    `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view employee salaries.
      </p>
    )
  }

  const shiftPeriod = (delta: number) =>
    setPeriod(p => (isWeekly ? shiftWeek(p, delta) : shiftMonth(p, delta)))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" data-testid="billing-salary-overview-panel">
      <div className="flex flex-wrap items-center gap-2">
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
            {filters.dateFrom} → {filters.dateTo}
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
          onClick={() => setPeriod(isWeekly ? currentUtcWeek() : currentUtcMonth())}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { title: 'Employees', value: String(filtered.length), hint: `With activity this ${periodNoun}` },
          { title: 'Visit pay', value: money(totals.visitPay), hint: 'Accepted visits' },
          { title: 'Paid', value: money(totals.paid), hint: 'In locked payroll' },
          { title: 'Rejected', value: money(totals.rejected), hint: 'Excluded from salary' },
          { title: 'Fines & penalties', value: money(totals.fines + totals.penalties), hint: 'Deductions' },
          { title: 'Net salary', value: money(totals.net), hint: 'Visit pay − deductions' },
        ].map(card => (
          <ContentCard key={card.title} className="space-y-1 p-4">
            <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </ContentCard>
        ))}
      </div>

      <ContentCard className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
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
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                <tr className="border-b border-border">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Employee
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Visit pay
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Paid</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
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
    </div>
  )
}
