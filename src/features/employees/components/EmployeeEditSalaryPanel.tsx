import * as React from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import {
  useCreateEmployeeSalaryDeduction,
  useDeleteEmployeeSalaryDeduction,
  useEmployeeEarnings,
} from '@/features/billing/hooks/usePayrollRuns'
import { useSetVisitPayableAmount } from '@/features/billing/hooks/useVisitReconciliations'
import type { EmployeeEarningVisitRow } from '@/features/billing/api/payroll-runs.api'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import type { SalaryCalculationBasis } from '@/features/settings/types'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Input } from '@/shared/ui/input'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { apiErrorMessage } from '@/shared/lib/api-error-message'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** ISO week period key YYYY-Www (UTC, week starts Monday). */
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

/** Monday UTC of the given ISO week key. */
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
  const year = period.slice(0, 4)
  return `Week ${period.slice(6)} · ${fmt.format(monday)} – ${fmt.format(sunday)} ${year}`
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

function formatVisitDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

function paymentStateLabel(state: EmployeeEarningVisitRow['paymentState']): string {
  if (state === 'PAID') return 'Paid'
  if (state === 'REMAINING') return 'Accepted'
  if (state === 'REJECTED') return 'Rejected'
  return 'Pending'
}

function paymentStateBadgeClass(state: EmployeeEarningVisitRow['paymentState']): string {
  if (state === 'PAID') return 'bg-success/10 text-success border-success/20'
  if (state === 'REMAINING') return 'bg-primary/10 text-primary border-primary/20'
  if (state === 'REJECTED') return 'bg-destructive/10 text-destructive border-destructive/20'
  return 'bg-warning/10 text-warning border-warning/20'
}

function StatCard({
  title,
  value,
  hint,
  emphasize,
}: {
  title: string
  value: string | number
  hint: string
  emphasize?: boolean
}) {
  return (
    <ContentCard className={cn('space-y-1 p-4', emphasize && 'border-primary/40 bg-primary/5')}>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </ContentCard>
  )
}

export function EmployeeEditSalaryPanel({ employeeId }: { employeeId: string }) {
  const canRead = useAuthStore(
    s =>
      s.can('employees.read') ||
      s.can('employees.update') ||
      s.can('billing.payroll_runs.read' as never),
  )
  const canManage = useAuthStore(
    s => s.can('employees.update') || s.can('billing.payroll_runs.manage' as never),
  )
  const canEditVisitAmount = useAuthStore(
    s =>
      s.can('employees.update') ||
      s.can('billing.visit_reconciliations.manage' as never),
  )
  const canViewRecon = useAuthStore(s =>
    s.can('billing.visit_reconciliations.read' as never),
  )

  const { data: generalSettings } = useGeneralSettings(canRead)
  const basis: SalaryCalculationBasis =
    generalSettings?.salaryCalculationBasis === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY'
  const isWeekly = basis === 'WEEKLY'

  const [period, setPeriod] = React.useState(() =>
    basis === 'WEEKLY' ? currentUtcWeek() : currentUtcMonth(),
  )

  React.useEffect(() => {
    setPeriod(isWeekly ? currentUtcWeek() : currentUtcMonth())
  }, [isWeekly])

  const filters = React.useMemo(
    () => (isWeekly ? weekDateRange(period) : monthDateRange(period)),
    [isWeekly, period],
  )
  const periodLabel = isWeekly ? utcWeekLabel(period) : utcMonthLabel(period)
  const periodNoun = isWeekly ? 'week' : 'month'

  const query = useEmployeeEarnings(employeeId, filters, canRead)
  const createDeduction = useCreateEmployeeSalaryDeduction(employeeId)
  const deleteDeduction = useDeleteEmployeeSalaryDeduction(employeeId)
  const setPayableAmount = useSetVisitPayableAmount()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [deductionType, setDeductionType] = React.useState<'FINE' | 'PENALTY'>('FINE')
  const [amount, setAmount] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)

  const [amountDialogOpen, setAmountDialogOpen] = React.useState(false)
  const [editingVisit, setEditingVisit] = React.useState<EmployeeEarningVisitRow | null>(null)
  const [visitAmount, setVisitAmount] = React.useState('')
  const [visitAmountNotes, setVisitAmountNotes] = React.useState('')
  const [visitAmountError, setVisitAmountError] = React.useState<string | null>(null)

  const data = query.data
  const visits = data?.visits ?? []
  const deductions = data?.deductions ?? []

  const salaryVisits = visits.filter(
    v =>
      v.countsTowardSalary ??
      (v.paymentState === 'PAID' || v.paymentState === 'REMAINING'),
  )
  const pendingVisits = visits.filter(v => v.paymentState === 'PENDING')
  const rejectedVisits = visits.filter(v => v.paymentState === 'REJECTED')

  const visitSalary =
    data?.salaryAmount ??
    (data
      ? `£${((data.totalEarnedAmount ?? 0) + (data.remainingAmountValue ?? 0)).toFixed(2)}`
      : '£0.00')
  const netSalary = data?.netSalaryAmount ?? visitSalary
  const salaryVisitCount = data?.salaryVisitCount ?? salaryVisits.length

  const resetForm = () => {
    setDeductionType('FINE')
    setAmount('')
    setReason('')
    setNotes('')
    setFormError(null)
  }

  const handleAddDeduction = async () => {
    setFormError(null)
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError('Enter a valid amount greater than zero.')
      return
    }
    if (!reason.trim()) {
      setFormError('Reason is required.')
      return
    }
    try {
      await createDeduction.mutateAsync({
        type: deductionType,
        amount: parsed,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        salaryMonth: period,
      })
      setDialogOpen(false)
      resetForm()
    } catch (err) {
      setFormError(apiErrorMessage(err) || 'Could not save deduction.')
    }
  }

  const openEditAmount = (row: EmployeeEarningVisitRow) => {
    setEditingVisit(row)
    setVisitAmount(
      row.payableAmountValue != null
        ? String(row.payableAmountValue)
        : row.payableAmount.replace(/[^0-9.]/g, ''),
    )
    setVisitAmountNotes('')
    setVisitAmountError(null)
    setAmountDialogOpen(true)
  }

  const handleSaveVisitAmount = async () => {
    if (!editingVisit) return
    setVisitAmountError(null)
    const parsed = Number(visitAmount)
    if (!Number.isFinite(parsed) || parsed < 0) {
      setVisitAmountError('Enter a valid amount (0 or greater).')
      return
    }
    try {
      await setPayableAmount.mutateAsync({
        id: editingVisit.id,
        body: {
          payableAmount: parsed,
          notes: visitAmountNotes.trim() || undefined,
          approveForPay: true,
        },
      })
      setAmountDialogOpen(false)
      setEditingVisit(null)
    } catch (err) {
      setVisitAmountError(apiErrorMessage(err) || 'Could not update visit amount.')
    }
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view employee salary.
      </p>
    )
  }

  const shiftPeriod = (delta: number) =>
    setPeriod(p => (isWeekly ? shiftWeek(p, delta) : shiftMonth(p, delta)))

  return (
    <div className="space-y-6" data-testid="employee-edit-salary-panel">
      <ContentSectionHeader
        title="Salary"
        description={`Net ${isWeekly ? 'weekly' : 'monthly'} salary = accepted visit pay − fines − penalties. Edit visit amounts below to adjust salary. Clean visits are accepted by default.`}
        action={
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  resetForm()
                  setDialogOpen(true)
                }}
                data-testid="employee-salary-add-deduction"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add fine / penalty
              </Button>
            ) : null}
            {canViewRecon ? (
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="/billing/visit-reconciliation"
                  search={{ employeeId }}
                  data-testid="employee-salary-open-recon"
                >
                  Visit reconciliation
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

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
      </div>

      {query.isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading salary…</p>
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Could not load salary for this employee.</p>
      ) : data ? (
        <>
          <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6')}>
            <StatCard
              title="Visit pay"
              value={visitSalary}
              hint={`${salaryVisitCount} accepted visit${salaryVisitCount === 1 ? '' : 's'}`}
            />
            <StatCard
              title="Fines"
              value={data.fineTotal ?? '£0.00'}
              hint="Deducted from salary"
            />
            <StatCard
              title="Penalties"
              value={data.penaltyTotal ?? '£0.00'}
              hint="Deducted from salary"
            />
            <StatCard
              title={`${periodLabel} net salary`}
              value={netSalary}
              hint="Visit pay − fines − penalties"
              emphasize
            />
            <StatCard
              title="Already paid"
              value={data.totalEarned}
              hint={`${data.paidVisitCount} in locked payroll`}
            />
            <StatCard
              title="Pending review"
              value={data.pendingReviewCount}
              hint={
                rejectedVisits.length
                  ? `${rejectedVisits.length} rejected (excluded)`
                  : 'Needs accept / reject'
              }
            />
          </div>

          <ContentCard className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Fines & penalties</h3>
              <p className="text-xs text-muted-foreground">
                Total deductions {data.deductionsTotal ?? '£0.00'}
              </p>
            </div>
            {deductions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No fines or penalties for {periodLabel}.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Type
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Reason
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Amount
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Notes
                      </th>
                      {canManage ? (
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                          Action
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {deductions.map(row => (
                      <tr
                        key={row.id}
                        className="border-b border-border last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-3 py-2.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-medium',
                              row.type === 'FINE'
                                ? 'bg-warning/10 text-warning border-warning/20'
                                : 'bg-destructive/10 text-destructive border-destructive/20',
                            )}
                          >
                            {row.type === 'FINE' ? 'Fine' : 'Penalty'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">{row.reason}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium text-destructive">
                          −{row.amount}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{row.notes || '—'}</td>
                        {canManage ? (
                          <td className="px-3 py-2.5 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              disabled={deleteDeduction.isPending}
                              onClick={() => void deleteDeduction.mutateAsync(row.id)}
                              aria-label={`Remove ${row.type.toLowerCase()}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ContentCard>

          <ContentCard className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Visits in this {periodNoun}
              </h3>
              <p className="text-xs text-muted-foreground">
                {salaryVisits.length} in salary
                {pendingVisits.length ? ` · ${pendingVisits.length} pending` : ''}
                {rejectedVisits.length ? ` · ${rejectedVisits.length} rejected` : ''}
              </p>
            </div>

            {visits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reconciled visits for {periodLabel}.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Visit
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Service user
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Planned
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Hours
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Amount
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        In salary
                      </th>
                      {canEditVisitAmount ? (
                        <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                          Action
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map(row => {
                      const inSalary =
                        row.countsTowardSalary ??
                        (row.paymentState === 'PAID' || row.paymentState === 'REMAINING')
                      const canEditAmount =
                        canEditVisitAmount &&
                        row.paymentState !== 'PAID' &&
                        !row.payrollRunId
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-border last:border-0 hover:bg-muted/20"
                        >
                          <td className="px-3 py-2.5 font-mono text-xs">{row.visitRef}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                            {formatVisitDate(row.plannedStart)}
                          </td>
                          <td className="px-3 py-2.5">{row.serviceUserName}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                            {row.plannedTime ?? '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {row.payableHours ??
                              (row.payableMinutes != null
                                ? `${(row.payableMinutes / 60).toFixed(2)}h`
                                : '—')}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                            {row.payableAmount}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant="outline"
                              className={cn('font-medium', paymentStateBadgeClass(row.paymentState))}
                            >
                              {paymentStateLabel(row.paymentState)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">
                            {inSalary ? 'Yes' : 'No'}
                          </td>
                          {canEditVisitAmount ? (
                            <td className="px-3 py-2.5 text-right">
                              {canEditAmount ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEditAmount(row)}
                                  aria-label={`Edit amount for ${row.visitRef}`}
                                  data-testid={`employee-salary-edit-amount-${row.id}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span className="ml-1.5">Edit</span>
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">Locked</span>
                              )}
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ContentCard>
        </>
      ) : null}

      <Dialog
        open={amountDialogOpen}
        onOpenChange={open => {
          setAmountDialogOpen(open)
          if (!open) {
            setEditingVisit(null)
            setVisitAmountError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit visit amount</DialogTitle>
            <DialogDescription>
              {editingVisit
                ? `Update payable amount for ${editingVisit.visitRef}. This updates salary totals and accepts the visit for pay if needed.`
                : 'Update the payable amount for this visit.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {editingVisit ? (
              <p className="text-sm text-muted-foreground">
                {editingVisit.serviceUserName} · {formatVisitDate(editingVisit.plannedStart)}
                {editingVisit.plannedTime ? ` · ${editingVisit.plannedTime}` : ''}
              </p>
            ) : null}
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Payable amount (£)</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={visitAmount}
                onChange={e => setVisitAmount(e.target.value)}
                placeholder="0.00"
                data-testid="employee-salary-visit-amount-input"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Notes (optional)</span>
              <Input
                value={visitAmountNotes}
                onChange={e => setVisitAmountNotes(e.target.value)}
                placeholder="Reason for amount change"
              />
            </label>
            {visitAmountError ? (
              <p className="text-sm text-destructive">{visitAmountError}</p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAmountDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={setPayableAmount.isPending}
              onClick={() => void handleSaveVisitAmount()}
              data-testid="employee-salary-visit-amount-save"
            >
              {setPayableAmount.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save amount'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          setDialogOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add fine or penalty</DialogTitle>
            <DialogDescription>
              Deducted from {periodLabel} net salary for this carer.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={deductionType === 'FINE' ? 'default' : 'outline'}
                onClick={() => setDeductionType('FINE')}
              >
                Fine
              </Button>
              <Button
                type="button"
                size="sm"
                variant={deductionType === 'PENALTY' ? 'default' : 'outline'}
                onClick={() => setDeductionType('PENALTY')}
              >
                Penalty
              </Button>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Amount (£)</span>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="25.00"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Reason</span>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Late arrival without notice"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Notes (optional)</span>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Extra detail"
              />
            </label>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createDeduction.isPending}
              onClick={() => void handleAddDeduction()}
            >
              {createDeduction.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save deduction'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
