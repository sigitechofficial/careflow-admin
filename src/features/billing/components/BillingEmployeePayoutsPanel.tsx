import * as React from 'react'
import {
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import {
  useCreateEmployeePayoutBatch,
  useDeleteAllEmployeePayoutBatches,
  useEmployeePayoutBatches,
  usePayoutEligibleUkRuns,
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
import { StatCard } from '@/shared/ui/card'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/dialog'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { getSyncedOperationalTimeZone, dayKeyFromInstant } from '@/shared/lib/operational-day.util'
import { formatTimezoneUtcOffset } from '@/features/settings/organisation-timezone'
import {
  currentOpsMonth,
  currentOpsWeek,
  salaryMonthLabel,
  salaryWeekLabel,
  shiftSalaryMonth,
  shiftSalaryWeek,
} from '@/features/billing/utils/salary-period.util'

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
  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const operationalTimezone = getSyncedOperationalTimeZone()
  const timezoneHint = `${operationalTimezone} (${formatTimezoneUtcOffset(operationalTimezone)})`
  const basis: SalaryCalculationBasis =
    generalSettings?.salaryCalculationBasis === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY'
  const isWeekly = basis === 'WEEKLY'
  const periodNoun = isWeekly ? 'week' : 'month'

  const [period, setPeriod] = React.useState(() =>
    basis === 'WEEKLY' ? currentOpsWeek() : currentOpsMonth(),
  )
  const [scope, setScope] = React.useState<ScopeMode>('period')
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | EmployeePayoutBatchStatus>('ALL')
  const [selectedBatch, setSelectedBatch] = React.useState<EmployeePayoutBatchRow | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [purgeOpen, setPurgeOpen] = React.useState(false)
  const [selectedUkRunId, setSelectedUkRunId] = React.useState<string>('')

  React.useEffect(() => {
    setPeriod(isWeekly ? currentOpsWeek() : currentOpsMonth())
  }, [isWeekly])

  const queryPeriodKey = scope === 'period' ? period : undefined
  const batchesQuery = useEmployeePayoutBatches(queryPeriodKey, canRead)
  const eligibleRunsQuery = usePayoutEligibleUkRuns(canManage)
  const createBatch = useCreateEmployeePayoutBatch()
  const deleteAll = useDeleteAllEmployeePayoutBatches()

  const eligibleRuns = eligibleRunsQuery.data ?? []

  React.useEffect(() => {
    if (!selectedUkRunId && eligibleRuns.length > 0) {
      const match = eligibleRuns.find(r => r.periodKey === period) ?? eligibleRuns[0]
      if (match) setSelectedUkRunId(match.id)
    }
  }, [eligibleRuns, period, selectedUkRunId])

  const selectedUkRun = eligibleRuns.find(r => r.id === selectedUkRunId) ?? null

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

  const hasOpenBatchForSelectedRun = React.useMemo(() => {
    if (!selectedUkRunId) return false
    return (batchesQuery.data ?? []).some(
      b =>
        b.ukPayrollRunId === selectedUkRunId &&
        (b.status === 'DRAFT' || b.status === 'APPROVED'),
    )
  }, [batchesQuery.data, selectedUkRunId])

  const money = (n: number) =>
    `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const periodLabel = isWeekly ? salaryWeekLabel(period, formatDate) : salaryMonthLabel(period)
  const shiftPeriod = (delta: number) => {
    setScope('period')
    setPeriod(p => (isWeekly ? shiftSalaryWeek(p, delta) : shiftSalaryMonth(p, delta)))
  }

  const formatInstant = (iso: string | null | undefined) => {
    if (!iso) return '—'
    const day = dayKeyFromInstant(iso)
    return day ? `${formatDate(day)} ${formatTime(iso)}` : '—'
  }

  const formatDayRange = (from: string | null | undefined, to: string | null | undefined) => {
    if (!from && !to) return '—'
    if (from && to) return `${formatDate(from)} – ${formatDate(to)}`
    return formatDate(from || to || '')
  }

  const openBatch = (batch: EmployeePayoutBatchRow) => {
    setSelectedBatch(batch)
    setDialogOpen(true)
  }

  const handleCreate = async () => {
    if (!selectedUkRunId) {
      toastApiError(new Error('Select a UK payroll run first'), 'Could not create payout batch')
      return
    }
    try {
      const detail = await createBatch.mutateAsync({ ukPayrollRunId: selectedUkRunId })
      toastSuccess('Payout batch created', `${detail.lineCount} employees · ${detail.totalAmount}`)
      if (detail.periodKey) {
        setScope('period')
        setPeriod(detail.periodKey)
      }
      openBatch(detail)
    } catch (e) {
      toastApiError(e, 'Could not create payout batch')
    }
  }

  const handleDeleteAll = async (onlyCurrentPeriod: boolean) => {
    try {
      const result = await deleteAll.mutateAsync(
        onlyCurrentPeriod ? { periodKey: period } : undefined,
      )
      toastSuccess(
        'Payouts deleted',
        `${result.deletedBatches} batch${result.deletedBatches === 1 ? '' : 'es'} removed`,
      )
      setPurgeOpen(false)
      setDialogOpen(false)
      setSelectedBatch(null)
    } catch (e) {
      toastApiError(e, 'Could not delete payouts')
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
        description="Bank payout of UK Payroll net (after W1/M1 PAYE/NI)."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/billing/salary">Open salary overview</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/payroll/runs">UK payroll runs</Link>
            </Button>
            {canManage ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    createBatch.isPending ||
                    !selectedUkRunId ||
                    hasOpenBatchForSelectedRun
                  }
                  onClick={() => void handleCreate()}
                  data-testid="billing-payouts-create-batch"
                >
                  {createBatch.isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-3.5 w-3.5" />
                  )}
                  Create from UK run
                </Button>
                <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={deleteAll.isPending}
                      data-testid="billing-payouts-delete-all"
                    >
                      {deleteAll.isPending ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                      )}
                      Delete payouts
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete payout batches?</AlertDialogTitle>
                      <AlertDialogDescription>
                        For testing only. This permanently deletes payout batches and lines, and
                        resets Bank paid / Outstanding on Salary. Visit reconciliations and
                        visit-pay runs are not affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={deleteAll.isPending}
                        onClick={e => {
                          e.preventDefault()
                          void handleDeleteAll(false)
                        }}
                      >
                        Delete all periods
                      </AlertDialogAction>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={deleteAll.isPending}
                        onClick={() => void handleDeleteAll(true)}
                      >
                        Delete {period} only
                      </Button>
                      <AlertDialogCancel disabled={deleteAll.isPending}>Cancel</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
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
            setPeriod(isWeekly ? currentOpsWeek() : currentOpsMonth())
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
        <span
          className="inline-flex h-8 items-center rounded-md border border-dashed border-border bg-muted/40 px-2.5 text-xs text-muted-foreground"
          title="Payout periods and timestamps use the organisation operational timezone"
          data-testid="billing-payouts-timezone-hint"
        >
          Times in {timezoneHint}
        </span>
        {scope === 'period' && hasOpenBatchForSelectedRun ? (
          <Badge variant="outline" className="ml-auto bg-warning/10 text-warning border-warning/20">
            Open batch in progress
          </Badge>
        ) : null}
      </div>

      {canManage ? (
        <ContentCard className="space-y-3 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Create payout from UK run</p>
            <p className="text-xs text-muted-foreground">
              Pays <span className="font-medium text-foreground">UK net pay</span> (after W1/M1
              PAYE/NI). Runs must be statutory-calculated or closed. Purge any legacy visit-pay-net
              payouts before relying on Bank paid.
            </p>
          </div>
          {eligibleRunsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading UK runs…
            </div>
          ) : eligibleRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No eligible UK payroll runs. Calculate tax &amp; NI on a UK run first, then return
              here.
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-[18rem] flex-1 space-y-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">UK payroll run</span>
                <Select value={selectedUkRunId} onValueChange={setSelectedUkRunId}>
                  <SelectTrigger data-testid="billing-payouts-uk-run-select">
                    <SelectValue placeholder="Select UK run" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleRuns.map(run => (
                      <SelectItem key={run.id} value={run.id}>
                        {run.label} · {run.totalNetPay} · {run.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              {selectedUkRun ? (
                <p className="text-xs text-muted-foreground pb-2">
                  {formatDayRange(selectedUkRun.periodStart, selectedUkRun.periodEnd)} ·{' '}
                  {selectedUkRun.employeeCount} employees
                </p>
              ) : null}
            </div>
          )}
        </ContentCard>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Batches"
          value={totals.batches}
          hint={scope === 'all' ? 'All periods' : period}
          icon={<Banknote className="h-5 w-5" aria-hidden />}
          tone="violet"
        />
        <StatCard
          label="Bank paid"
          value={money(totals.paid)}
          hint="PAID batches"
          icon={<Banknote className="h-5 w-5" aria-hidden />}
          tone="emerald"
          valueClassName="text-success"
        />
        <StatCard
          label="Open"
          value={totals.open}
          hint="Draft or approved"
          icon={<Banknote className="h-5 w-5" aria-hidden />}
          tone="amber"
        />
        <StatCard
          label="Cancelled"
          value={totals.cancelled}
          hint="Not paid"
          icon={<Banknote className="h-5 w-5" aria-hidden />}
          tone="muted"
        />
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
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    Period
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                    UK run
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
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {batch.ukPayrollRunLabel ?? '—'}
                        </span>
                        {batch.ukPayrollRunStatus ? (
                          <span className="text-xs text-muted-foreground">
                            {batch.ukPayrollRunStatus}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatDayRange(batch.periodStart, batch.periodEnd)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{batch.lineCount}</td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                      {batch.totalAmount}
                    </td>
                    <td className="px-3 py-2.5">
                      <BillingStatusBadge status={batch.status} />
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatInstant(batch.createdAt)}
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
