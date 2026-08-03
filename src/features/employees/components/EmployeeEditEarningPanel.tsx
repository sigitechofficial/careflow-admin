import * as React from 'react'
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  Loader2,
  PoundSterling,
  RotateCcw,
  Wallet,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import {
  useEmployeeEarnings,
  useResetEmployeeEarnings,
} from '@/features/billing/hooks/usePayrollRuns'
import type { EmployeeEarningVisitRow } from '@/features/billing/api/payroll-runs.api'
import {
  rangeForPreset,
  type EarningsPeriodPreset,
} from '@/features/employees/utils/employee-earnings-period.util'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
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
  if (state === 'BANK_PAID') return 'Bank paid'
  if (state === 'IN_UK_PAYROLL') return 'In UK payroll'
  if (state === 'PAID') return 'In visit-pay run'
  if (state === 'REMAINING') return 'Ready for payroll'
  if (state === 'REJECTED') return 'Rejected'
  return 'Pending'
}

function paymentStateBadgeClass(state: EmployeeEarningVisitRow['paymentState']): string {
  if (state === 'BANK_PAID') return 'bg-success/10 text-success border-success/20'
  if (state === 'IN_UK_PAYROLL') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300'
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
  icon,
  iconClassName,
}: {
  title: string
  value: string | number
  hint: string
  icon: React.ReactNode
  iconClassName: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
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

const PERIOD_PRESETS: {
  id: EarningsPeriodPreset
  label: string
  icon: React.ReactNode
}[] = [
  { id: 'all', label: 'All time', icon: <History className="h-3.5 w-3.5" aria-hidden /> },
  { id: 'previous-week', label: 'Previous week', icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden /> },
  { id: 'last-month', label: 'Last month', icon: <CalendarRange className="h-3.5 w-3.5" aria-hidden /> },
  { id: 'custom', label: 'Custom dates', icon: <CalendarDays className="h-3.5 w-3.5" aria-hidden /> },
]

export function EmployeeEditEarningPanel({ employeeId }: { employeeId: string }) {
  const canRead = useAuthStore(
    s =>
      s.can('employees.read') ||
      s.can('employees.update') ||
      s.can('billing.payroll_runs.read' as never),
  )
  const canViewVisits = useAuthStore(s =>
    s.can('billing.visit_reconciliations.read' as never),
  )
  const canViewPayouts = useAuthStore(s => s.can('billing.employee_payouts.read'))
  const canResetEarnings = useAuthStore(
    s =>
      s.can('employees.update') ||
      s.can('billing.payroll_runs.manage' as never) ||
      s.can('billing.employee_payouts.manage'),
  )

  const [preset, setPreset] = React.useState<EarningsPeriodPreset>('all')
  const [customFrom, setCustomFrom] = React.useState('')
  const [customTo, setCustomTo] = React.useState('')
  const [resetOpen, setResetOpen] = React.useState(false)

  const filters = React.useMemo(() => {
    if (preset === 'custom') {
      return rangeForPreset('custom', { dateFrom: customFrom, dateTo: customTo })
    }
    return rangeForPreset(preset)
  }, [preset, customFrom, customTo])

  const query = useEmployeeEarnings(employeeId, filters, canRead)
  const resetEarnings = useResetEmployeeEarnings(employeeId)
  const data = query.data
  const visits = data?.visits ?? []

  const handleResetEarnings = async () => {
    try {
      const result = await resetEarnings.mutateAsync()
      const parts = [
        result.deletedPayoutLines > 0
          ? `${result.deletedPayoutLines} payout line${result.deletedPayoutLines === 1 ? '' : 's'}`
          : null,
        result.zeroedReadyVisits > 0
          ? `${result.zeroedReadyVisits} ready visit${result.zeroedReadyVisits === 1 ? '' : 's'}`
          : null,
        result.removedUkRunEmployees > 0
          ? `${result.removedUkRunEmployees} UK run row${result.removedUkRunEmployees === 1 ? '' : 's'}`
          : null,
        result.clearedDeductions > 0
          ? `${result.clearedDeductions} deduction${result.clearedDeductions === 1 ? '' : 's'}`
          : null,
      ].filter(Boolean)
      toastSuccess(
        'Earnings reset to £0',
        parts.length > 0 ? parts.join(' · ') : 'Nothing left to clear',
      )
      setResetOpen(false)
    } catch (e) {
      toastApiError(e, 'Could not reset earnings')
    }
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view employee earnings.
      </p>
    )
  }

  return (
    <div className="space-y-6" data-testid="employee-edit-earnings-panel">
      <ContentSectionHeader
        title="Earnings"
        description="Visit-pay run progress for this carer. Bank paid / Outstanding are UK net after W1/M1 PAYE/NI — create payouts from Billing → Employee payouts once a statutory UK run exists."
        icon={<Wallet className="h-5 w-5" aria-hidden />}
        iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        action={
          <div className="flex flex-wrap gap-2">
            {canResetEarnings ? (
              <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={resetEarnings.isPending}
                    data-testid="employee-earnings-reset"
                  >
                    {resetEarnings.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Reset to £0
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all earnings to £0?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Clears <span className="font-medium text-foreground">Bank paid</span>,{' '}
                      <span className="font-medium text-foreground">Ready for visit-pay</span>,{' '}
                      <span className="font-medium text-foreground">UK net</span>, and{' '}
                      <span className="font-medium text-foreground">Outstanding</span> for this
                      employee: deletes payout lines, zeros unpaid visit amounts, removes them from
                      UK payroll runs, and clears fines/penalties. Locked visit-pay run history is
                      kept.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={resetEarnings.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={resetEarnings.isPending}
                      onClick={e => {
                        e.preventDefault()
                        void handleResetEarnings()
                      }}
                    >
                      {resetEarnings.isPending ? 'Resetting…' : 'Reset to £0'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            {canViewPayouts ? (
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="/billing/employee-payouts"
                  data-testid="employee-earnings-open-payouts"
                  className="inline-flex items-center gap-1.5"
                >
                  Employee payouts
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            ) : null}
            {canViewVisits ? (
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="/billing/visit-reconciliation"
                  search={{ employeeId }}
                  data-testid="employee-earnings-view-all-visits"
                  className="inline-flex items-center gap-1.5"
                >
                  View all visits
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/10 p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden />
          Period
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PERIOD_PRESETS.map(({ id, label, icon }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={preset === id ? 'default' : 'outline'}
              leftIcon={icon}
              onClick={() => setPreset(id)}
              data-testid={`employee-earnings-preset-${id}`}
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
              />
            </label>
          </div>
        ) : null}

        {(filters.dateFrom || filters.dateTo) ? (
          <p className="text-xs text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">
              {filters.dateFrom ?? '…'} → {filters.dateTo ?? '…'}
            </span>
          </p>
        ) : null}
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading earnings…
        </div>
      ) : query.isError ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          Could not load earnings for this employee.
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="In visit-pay run"
              value={data.totalEarned}
              hint="From locked / exported visit-pay runs"
              icon={<PoundSterling className="h-5 w-5" aria-hidden />}
              iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            />
            <StatCard
              title="Visits in run"
              value={data.paidVisitCount}
              hint="Visits included in locked payroll"
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
              iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
            />
            <StatCard
              title="Ready for payroll"
              value={data.remainingAmount}
              hint={`${data.remainingVisitCount} completed visit${data.remainingVisitCount === 1 ? '' : 's'} not yet in UK payroll`}
              icon={<Clock className="h-5 w-5" aria-hidden />}
              iconClassName="bg-amber-500/10 text-amber-800 dark:text-amber-300"
            />
            <StatCard
              title="UK net"
              value={
                data.hasEligibleUkRun
                  ? (data.ukNetPayAmount ?? '£0.00')
                  : '—'
              }
              hint={
                data.hasEligibleUkRun
                  ? 'After W1/M1 PAYE/NI'
                  : 'Statutory UK run required'
              }
              icon={<PoundSterling className="h-5 w-5" aria-hidden />}
              iconClassName="bg-violet-500/10 text-violet-700 dark:text-violet-300"
            />
            <StatCard
              title="Bank paid"
              value={data.paidOutAmount ?? '£0.00'}
              hint="UK net disbursed (PAID payout batches)"
              icon={<Banknote className="h-5 w-5" aria-hidden />}
              iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
            />
            <StatCard
              title="Outstanding"
              value={
                data.hasEligibleUkRun
                  ? (data.outstandingPayoutAmount ?? '£0.00')
                  : '—'
              }
              hint={
                data.hasEligibleUkRun
                  ? 'UK net − committed payouts'
                  : 'UK run required before bank payable'
              }
              icon={<AlertCircle className="h-5 w-5" aria-hidden />}
              iconClassName="bg-amber-500/10 text-amber-800 dark:text-amber-300"
            />
          </div>

          {data.pendingReviewCount > 0 ? (
            <p className="text-xs text-muted-foreground">
              {data.pendingReviewCount} visit
              {data.pendingReviewCount === 1 ? '' : 's'} pending review (missing pay card or
              rates).
            </p>
          ) : null}

          <ContentCard className="space-y-4 p-4">
            <div className="flex items-start gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-500/10 text-slate-700 dark:text-slate-300">
                <Wallet className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Visit earnings detail</h3>
                <p className="text-xs text-muted-foreground">
                  {visits.length} visit{visits.length === 1 ? '' : 's'} in the selected period.
                  Status reflects UK payroll / bank payout when the visit is on a UK run.
                </p>
              </div>
            </div>

            {visits.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Wallet className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm text-muted-foreground">
                  No visits in visit-pay run, ready for run, or pending in this period.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[960px] text-sm">
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
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Approved pay
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Hours
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <PoundSterling className="h-3.5 w-3.5" aria-hidden />
                          Payable
                        </span>
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Pay status
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        UK / pay period
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Recon status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map(row => (
                      <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2.5 font-mono text-xs">{row.visitRef}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                          {formatVisitDate(row.plannedStart)}
                        </td>
                        <td className="px-3 py-2.5">{row.serviceUserName}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {row.plannedTime ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {row.approvedPayTime ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {row.payableHours ??
                            (row.payableMinutes != null
                              ? `${(row.payableMinutes / 60).toFixed(2)}h`
                              : '—')}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums">
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
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {row.ukPayrollRunLabel ?? row.payrollPeriod ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {row.status.replace(/_/g, ' ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ContentCard>
        </>
      ) : null}
    </div>
  )
}
