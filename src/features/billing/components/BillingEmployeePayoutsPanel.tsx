import * as React from 'react'
import {
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import {
  useCreateEmployeePayoutBatch,
  useEmployeePayoutBatches,
} from '@/features/billing/hooks/useEmployeePayouts'
import { EmployeePayoutBatchDetailDialog } from '@/features/billing/components/EmployeePayoutBatchDetailDialog'
import { BillingStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import type {
  EmployeePayoutBatchRow,
  EmployeePayoutBatchStatus,
} from '@/features/billing/api/employee-payouts.api'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import type { SalaryCalculationBasis } from '@/features/settings/types'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

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
  const [yRaw, mRaw] = month.split('-')
  const y = Number(yRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(y) || !Number.isFinite(m)) return month
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
  const [yRaw, mRaw] = month.split('-')
  const y = Number(yRaw)
  const m = Number(mRaw)
  if (!Number.isFinite(y) || !Number.isFinite(m) || y < 1 || m < 1) return month
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

const STATUS_FILTERS: Array<{ value: 'ALL' | EmployeePayoutBatchStatus; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

type ScopeMode = 'period' | 'all'

export function BillingEmployeePayoutsPanel() {
  const canRead = useAuthStore(s => s.can('billing.employee_payouts.read'))
  const canManage = useAuthStore(s => s.can('billing.employee_payouts.manage'))

  const { data: generalSettings } = useGeneralSettings(canRead)
  const basis: SalaryCalculationBasis =
    generalSettings?.salaryCalculationBasis === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY'
  const isWeekly = basis === 'WEEKLY'
  const periodNoun = isWeekly ? 'week' : 'month'

  const [period, setPeriod] = React.useState(() =>
    basis === 'WEEKLY' ? currentUtcWeek() : currentUtcMonth(),
  )
  const [scope, setScope] = React.useState<ScopeMode>('period')
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | EmployeePayoutBatchStatus>('ALL')
  const [selectedBatch, setSelectedBatch] = React.useState<EmployeePayoutBatchRow | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  React.useEffect(() => {
    setPeriod(isWeekly ? currentUtcWeek() : currentUtcMonth())
  }, [isWeekly])

  const queryPeriodKey = scope === 'period' ? period : undefined
  const batchesQuery = useEmployeePayoutBatches(queryPeriodKey, canRead)
  const createBatch = useCreateEmployeePayoutBatch()

  const rows = React.useMemo(() => {
    let list = batchesQuery.data ?? []
    if (statusFilter !== 'ALL') {
      list = list.filter(b => b.status === statusFilter)
    }
    return list
  }, [batchesQuery.data, statusFilter])

  const totals = React.useMemo(() => {
    const all = batchesQuery.data ?? []
    return {
      batches: all.length,
      paid: all.filter(b => b.status === 'PAID').reduce((s, b) => s + b.totalAmountValue, 0),
      open: all.filter(b => b.status === 'DRAFT' || b.status === 'APPROVED').length,
      cancelled: all.filter(b => b.status === 'CANCELLED').length,
    }
  }, [batchesQuery.data])

  const hasOpenBatchForPeriod = React.useMemo(() => {
    const list = batchesQuery.data ?? []
    return list.some(
      b =>
        b.periodKey === period &&
        (b.status === 'DRAFT' || b.status === 'APPROVED'),
    )
  }, [batchesQuery.data, period])

  const money = (n: number) =>
    `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const periodLabel = isWeekly ? utcWeekLabel(period) : utcMonthLabel(period)
  const shiftPeriod = (delta: number) => {
    setScope('period')
    setPeriod(p => (isWeekly ? shiftWeek(p, delta) : shiftMonth(p, delta)))
  }

  const openBatch = (batch: EmployeePayoutBatchRow) => {
    setSelectedBatch(batch)
    setDialogOpen(true)
  }

  const handleCreate = async () => {
    try {
      const detail = await createBatch.mutateAsync({ periodKey: period })
      toastSuccess('Payout batch created', `${detail.lineCount} employees · ${detail.totalAmount}`)
      setScope('period')
      openBatch(detail)
    } catch (e) {
      toastApiError(e, 'Could not create payout batch')
    }
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view employee payouts. Required:{' '}
        <span className="font-mono text-xs">billing.employee_payouts.read</span>.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4" data-testid="billing-employee-payouts-panel">
      <ContentSectionHeader
        title="Employee payouts"
        titleClassName="sr-only"
        descriptionClassName="sr-only"
        description="Bank payout batches for visit-pay net salaries."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/billing/salary">Open salary overview</Link>
            </Button>
            {canManage ? (
              <Button
                type="button"
                size="sm"
                disabled={createBatch.isPending || hasOpenBatchForPeriod}
                onClick={() => void handleCreate()}
                data-testid="billing-payouts-create-batch"
              >
                {createBatch.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-3.5 w-3.5" />
                )}
                Create batch
              </Button>
            ) : null}
          </div>
        }
      />

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
          <p className="text-xs text-muted-foreground">{period}</p>
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
          variant={scope === 'period' ? 'secondary' : 'ghost'}
          onClick={() => {
            setScope('period')
            setPeriod(isWeekly ? currentUtcWeek() : currentUtcMonth())
          }}
        >
          This {periodNoun}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={scope === 'all' ? 'secondary' : 'ghost'}
          onClick={() => setScope('all')}
          data-testid="billing-payouts-show-all"
        >
          All history
        </Button>
        {scope === 'period' && hasOpenBatchForPeriod ? (
          <Badge variant="outline" className="ml-auto bg-warning/10 text-warning border-warning/20">
            Open batch in progress
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Banknote className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Batches</p>
              <p className="text-xl font-semibold tabular-nums">{totals.batches}</p>
              <p className="text-xs text-muted-foreground">
                {scope === 'all' ? 'All periods' : period}
              </p>
            </div>
          </div>
        </ContentCard>
        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <Banknote className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Bank paid</p>
              <p className="text-xl font-semibold tabular-nums text-success">
                {money(totals.paid)}
              </p>
              <p className="text-xs text-muted-foreground">PAID batches</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300">
              <Banknote className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Open</p>
              <p className="text-xl font-semibold tabular-nums">{totals.open}</p>
              <p className="text-xs text-muted-foreground">Draft or approved</p>
            </div>
          </div>
        </ContentCard>
        <ContentCard className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Banknote className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Cancelled</p>
              <p className="text-xl font-semibold tabular-nums">{totals.cancelled}</p>
              <p className="text-xs text-muted-foreground">Not paid</p>
            </div>
          </div>
        </ContentCard>
      </div>

      <ContentCard className="space-y-3 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {scope === 'all' ? 'Payout history (all periods)' : `Payouts for ${periodLabel}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Open a batch to approve, mark paid, or cancel. Changing the {periodNoun} reloads this
              list.
            </p>
          </div>
          <Select
            value={statusFilter}
            onValueChange={v => setStatusFilter(v as 'ALL' | EmployeePayoutBatchStatus)}
          >
            <SelectTrigger className="w-[10rem]" data-testid="billing-payouts-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {batchesQuery.isLoading || batchesQuery.isFetching ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading payouts…
          </div>
        ) : batchesQuery.isError ? (
          <p className="text-sm text-destructive">Could not load payouts.</p>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Banknote className="h-5 w-5 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-sm text-muted-foreground">
              {(batchesQuery.data ?? []).length === 0
                ? scope === 'all'
                  ? 'No payout batches yet.'
                  : `No payout batches for ${period}.`
                : 'No batches match the current status filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Period
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Dates
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Employees
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Created
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(batch => (
                  <tr
                    key={batch.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20"
                    data-testid={`billing-payout-history-row-${batch.id}`}
                  >
                    <td className="px-3 py-2.5 font-medium tabular-nums">{batch.periodKey}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {batch.periodStart} – {batch.periodEnd}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{batch.lineCount}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {batch.totalAmount}
                    </td>
                    <td className="px-3 py-2.5">
                      <BillingStatusBadge status={batch.status} />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {new Date(batch.createdAt).toLocaleString('en-GB')}
                    </td>
                    <td className="px-3 py-2.5 text-right">
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

      <EmployeePayoutBatchDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        batch={selectedBatch}
        canManage={canManage}
      />
    </div>
  )
}
