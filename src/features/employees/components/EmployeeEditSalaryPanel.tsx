import * as React from 'react'
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Gavel,
  ListChecks,
  Loader2,
  Pencil,
  Percent,
  Plus,
  PoundSterling,
  Scale,
  Trash2,
  Wallet,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import {
  useCreateEmployeeSalaryDeduction,
  useDeleteEmployeeSalaryDeduction,
  useEmployeeEarnings,
} from '@/features/billing/hooks/usePayrollRuns'
import { useSetVisitPayableAmount } from '@/features/billing/hooks/useVisitReconciliations'
import type { EmployeeEarningVisitRow } from '@/features/billing/api/payroll-runs.api'
import {
  summariseNiCategoryRate,
  summariseTaxCodeRates,
} from '@/features/payroll/data/uk-payroll-lookups'
import { useEmployeePayrollProfile } from '@/features/payroll/hooks/usePayroll'
import { PAYROLL_PATHS } from '@/features/payroll/payroll-routes'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import type { SalaryCalculationBasis } from '@/features/settings/types'
import { formatTimezoneUtcOffset } from '@/features/settings/organisation-timezone'
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
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import {
  dayKeyFromInstant,
  formatOpsCalendarDate,
  getSyncedOperationalTimeZone,
  syncOrganisationOperationalTimezone,
} from '@/shared/lib/operational-day.util'
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

function formatVisitDate(
  iso: string,
  formatDate: (dayIso: string) => string,
): string {
  const day = dayKeyFromInstant(iso)
  if (!day) return formatOpsCalendarDate(iso)
  return formatDate(day)
}

function paymentStateLabel(state: EmployeeEarningVisitRow['paymentState']): string {
  if (state === 'BANK_PAID') return 'Bank paid'
  if (state === 'IN_UK_PAYROLL') return 'In UK payroll'
  if (state === 'PAID') return 'In visit-pay run'
  if (state === 'REMAINING') return 'Ready for payroll'
  if (state === 'REJECTED') return 'Rejected'
  return 'Pending'
}

function paymentStateBadgeClass(state: EmployeeEarningVisitRow['paymentState']): string {
  if (state === 'BANK_PAID') return 'bg-success/10 text-success border-success/20'
  if (state === 'IN_UK_PAYROLL')
    return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300'
  if (state === 'PAID') return 'bg-success/10 text-success border-success/20'
  if (state === 'REMAINING') return 'bg-warning/10 text-warning border-warning/20'
  if (state === 'REJECTED') return 'bg-destructive/10 text-destructive border-destructive/20'
  return 'bg-muted text-muted-foreground border-border'
}

function PaymentStateIcon({ state }: { state: EmployeeEarningVisitRow['paymentState'] }) {
  if (state === 'BANK_PAID') return <Banknote className="h-3 w-3" aria-hidden />
  if (state === 'IN_UK_PAYROLL') return <CheckCircle2 className="h-3 w-3" aria-hidden />
  if (state === 'PAID') return <CheckCircle2 className="h-3 w-3" aria-hidden />
  if (state === 'REMAINING') return <Clock className="h-3 w-3" aria-hidden />
  if (state === 'REJECTED') return <AlertCircle className="h-3 w-3" aria-hidden />
  return <AlertCircle className="h-3 w-3" aria-hidden />
}

function StatCard({
  title,
  value,
  hint,
  emphasize,
  icon,
  iconClassName,
}: {
  title: string
  value: string | number
  hint: string
  emphasize?: boolean
  icon: React.ReactNode
  iconClassName: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm',
        emphasize && 'border-primary/40 bg-primary/5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-display font-bold tabular-nums text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <span
          className={cn(
            'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            iconClassName,
          )}
        >
          {icon}
        </span>
      </div>
    </div>
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
  const canReadPayrollProfile = useAuthStore(s =>
    s.can('payroll.employees.read' as never),
  )

  const { data: generalSettings } = useGeneralSettings(canRead)
  React.useEffect(() => {
    if (generalSettings?.timezone) {
      syncOrganisationOperationalTimezone(generalSettings.timezone)
    }
  }, [generalSettings?.timezone])
  const { formatDate } = useOrganisationDisplayFormat()
  const basis: SalaryCalculationBasis =
    generalSettings?.salaryCalculationBasis === 'WEEKLY' ? 'WEEKLY' : 'MONTHLY'
  const isWeekly = basis === 'WEEKLY'

  const [period, setPeriod] = React.useState(() =>
    basis === 'WEEKLY' ? currentOpsWeek() : currentOpsMonth(),
  )

  React.useEffect(() => {
    setPeriod(isWeekly ? currentOpsWeek() : currentOpsMonth())
  }, [isWeekly])

  const filters = React.useMemo(
    () => (isWeekly ? salaryWeekDateRange(period) : salaryMonthDateRange(period)),
    [isWeekly, period],
  )
  const periodLabel = isWeekly ? salaryWeekLabel(period, formatDate) : salaryMonthLabel(period)
  const periodNoun = isWeekly ? 'week' : 'month'

  const query = useEmployeeEarnings(employeeId, filters, canRead)
  const payrollProfileQuery = useEmployeePayrollProfile(
    employeeId,
    canRead && canReadPayrollProfile,
  )
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
  const organisationTimezone =
    data?.organisationTimezone?.trim() ||
    generalSettings?.timezone?.trim() ||
    getSyncedOperationalTimeZone()
  const timezoneHint = `${organisationTimezone} (${formatTimezoneUtcOffset(organisationTimezone)})`

  const salaryVisits = visits.filter(
    v =>
      v.countsTowardSalary ??
      (v.paymentState === 'PAID' ||
        v.paymentState === 'REMAINING' ||
        v.paymentState === 'BANK_PAID' ||
        v.paymentState === 'IN_UK_PAYROLL'),
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

  const payrollProfile = payrollProfileQuery.data
  const taxCodeRaw = payrollProfile?.taxCode?.trim() || null
  const taxCode = taxCodeRaw || '1257L'
  const taxRateSummary = summariseTaxCodeRates(taxCode)
  const niCategory = payrollProfile?.niCategory ?? 'A'
  const niRateSummary = summariseNiCategoryRate(niCategory)

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
    setPeriod(p => (isWeekly ? shiftSalaryWeek(p, delta) : shiftSalaryMonth(p, delta)))

  return (
    <div className="space-y-6" data-testid="employee-edit-salary-panel">
      <ContentSectionHeader
        title="Salary"
        description={`Visit-pay net for this ${isWeekly ? 'week' : 'month'} = completed visit pay − fines − penalties (not bank pay). Bank paid uses UK net after PAYE/NI — see Earnings or Billing → Employee payouts. Periods and visit clocks use the organisation operational timezone.`}
        icon={<Wallet className="h-5 w-5" aria-hidden />}
        iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        action={
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button
                type="button"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  resetForm()
                  setDialogOpen(true)
                }}
                data-testid="employee-salary-add-deduction"
              >
                Add fine / penalty
              </Button>
            ) : null}
            {canViewRecon ? (
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="/billing/visit-reconciliation"
                  search={{ employeeId }}
                  data-testid="employee-salary-open-recon"
                  className="inline-flex items-center gap-1.5"
                >
                  Visit reconciliation
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/10 p-4">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <CalendarDays className="h-4 w-4" aria-hidden />
        </span>
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
          leftIcon={<CalendarDays className="h-3.5 w-3.5" />}
          onClick={() => setPeriod(isWeekly ? currentOpsWeek() : currentOpsMonth())}
        >
          This {periodNoun}
        </Button>
        <span
          className="inline-flex h-8 items-center rounded-md border border-dashed border-border bg-muted/40 px-2.5 text-xs text-muted-foreground"
          title="Salary period, visit dates, and planned times use the organisation operational timezone"
          data-testid="employee-salary-timezone-hint"
        >
          Times in {timezoneHint}
        </span>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading salary…</p>
        </div>
      ) : query.isError ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          Could not load salary for this employee.
        </div>
      ) : data ? (
        <>
          <div className={cn('grid gap-3 sm:grid-cols-3')}>
            <StatCard
              title="Visit pay"
              value={visitSalary}
              hint={`${salaryVisitCount} accepted visit${salaryVisitCount === 1 ? '' : 's'}`}
              icon={<PoundSterling className="h-5 w-5" aria-hidden />}
              iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            />
            <StatCard
              title="Deductions"
              value={data.deductionsTotal ?? '£0.00'}
              hint={`Fines ${data.fineTotal ?? '£0.00'} · Penalties ${data.penaltyTotal ?? '£0.00'}`}
              icon={<Gavel className="h-5 w-5" aria-hidden />}
              iconClassName="bg-amber-500/10 text-amber-800 dark:text-amber-300"
            />
            <StatCard
              title={`${periodLabel} net`}
              value={netSalary}
              hint="Visit pay − fines − penalties"
              emphasize
              icon={<Wallet className="h-5 w-5" aria-hidden />}
              iconClassName="bg-primary/10 text-primary"
            />
          </div>

          {canReadPayrollProfile ? (
            <ContentCard
              className="space-y-3 border-sky-500/20 bg-sky-500/5 p-4"
              data-testid="employee-salary-tax-summary"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-800 dark:text-sky-200">
                    <Percent className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      UK tax &amp; NI (Week 1 / Month 1)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Applied when this carer is enrolled in a statutory UK payroll run — bank pay
                      uses UK net after PAYE/NI, not visit-pay net above.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to={PAYROLL_PATHS.employees}
                    data-testid="employee-salary-open-payroll-setup"
                    className="inline-flex items-center gap-1.5"
                  >
                    Payroll setup
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              </div>

              {payrollProfileQuery.isLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading tax profile…
                </p>
              ) : payrollProfileQuery.isError ? (
                <p className="text-sm text-destructive">Could not load payroll tax profile.</p>
              ) : !payrollProfile ? (
                <p className="text-sm text-muted-foreground">
                  No UK payroll profile yet. Set tax code and NI category in{' '}
                  <Link
                    to={PAYROLL_PATHS.employees}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    UK Payroll → Employee setup
                  </Link>
                  .
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border/80 bg-background/80 px-3 py-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Tax code
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                      {taxCode}
                      {!taxCodeRaw ? (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          (default)
                        </span>
                      ) : null}
                      {payrollProfile.taxCodeWeek1Month1 ? (
                        <span className="ml-1.5 text-xs font-medium text-sky-800 dark:text-sky-200">
                          W1/M1
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-background/80 px-3 py-2.5 sm:col-span-2 lg:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Tax rate
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {taxRateSummary.headline}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{taxRateSummary.detail}</p>
                  </div>
                  <div className="rounded-lg border border-border/80 bg-background/80 px-3 py-2.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      NI category
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{niCategory}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{niRateSummary}</p>
                  </div>
                  {data?.hasEligibleUkRun ? (
                    <div className="rounded-lg border border-border/80 bg-background/80 px-3 py-2.5 sm:col-span-2 lg:col-span-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        UK net (this period)
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                        {data.ukNetPayAmount ?? '£0.00'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        After W1/M1 PAYE/NI from eligible statutory UK run(s). See Earnings for bank
                        paid / outstanding.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </ContentCard>
          ) : null}

          <ContentCard className="space-y-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-300">
                  <Gavel className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Fines & penalties</h3>
                  <p className="text-xs text-muted-foreground">
                    Total deductions {data.deductionsTotal ?? '£0.00'}
                  </p>
                </div>
              </div>
            </div>
            {deductions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Scale className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm text-muted-foreground">
                  No fines or penalties for {periodLabel}.
                </p>
              </div>
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
                              'inline-flex items-center gap-1 font-medium',
                              row.type === 'FINE'
                                ? 'bg-warning/10 text-warning border-warning/20'
                                : 'bg-destructive/10 text-destructive border-destructive/20',
                            )}
                          >
                            {row.type === 'FINE' ? (
                              <Gavel className="h-3 w-3" aria-hidden />
                            ) : (
                              <Scale className="h-3 w-3" aria-hidden />
                            )}
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

          <ContentCard className="space-y-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
                  <ListChecks className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Visits in this {periodNoun}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {salaryVisits.length} in salary
                    {pendingVisits.length ? ` · ${pendingVisits.length} pending` : ''}
                    {rejectedVisits.length ? ` · ${rejectedVisits.length} rejected` : ''}
                  </p>
                </div>
              </div>
            </div>

            {visits.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <ClipboardCheck className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm text-muted-foreground">
                  No reconciled visits for {periodLabel}.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Visit
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                          Date
                        </span>
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
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <PoundSterling className="h-3.5 w-3.5" aria-hidden />
                          Amount
                        </span>
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
                        (row.paymentState === 'PAID' ||
                          row.paymentState === 'REMAINING' ||
                          row.paymentState === 'BANK_PAID' ||
                          row.paymentState === 'IN_UK_PAYROLL')
                      const canEditAmount =
                        canEditVisitAmount &&
                        row.paymentState !== 'PAID' &&
                        row.paymentState !== 'BANK_PAID' &&
                        row.paymentState !== 'IN_UK_PAYROLL' &&
                        !row.payrollRunId
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-border last:border-0 hover:bg-muted/20"
                        >
                          <td className="px-3 py-2.5 font-mono text-xs">{row.visitRef}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                            {formatVisitDate(row.plannedStart, formatDate)}
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
                              className={cn(
                                'inline-flex items-center gap-1 font-medium',
                                paymentStateBadgeClass(row.paymentState),
                              )}
                            >
                              <PaymentStateIcon state={row.paymentState} />
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
                                  leftIcon={<Pencil className="h-3.5 w-3.5" />}
                                  onClick={() => openEditAmount(row)}
                                  aria-label={`Edit amount for ${row.visitRef}`}
                                  data-testid={`employee-salary-edit-amount-${row.id}`}
                                >
                                  Edit
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
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" aria-hidden />
              Edit visit amount
            </DialogTitle>
            <DialogDescription>
              {editingVisit
                ? `Update payable amount for ${editingVisit.visitRef}. This updates salary totals and accepts the visit for pay if needed.`
                : 'Update the payable amount for this visit.'}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {editingVisit ? (
              <p className="text-sm text-muted-foreground">
                {editingVisit.serviceUserName} · {formatVisitDate(editingVisit.plannedStart, formatDate)}
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
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="h-4 w-4 text-primary" aria-hidden />
              Add fine or penalty
            </DialogTitle>
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
