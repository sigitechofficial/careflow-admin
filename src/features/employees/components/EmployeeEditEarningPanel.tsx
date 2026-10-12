import * as React from 'react'
import {
  AlertCircle,
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
  earningCorrectionNote,
  earningStageLabel,
  earningTone,
  earningToneBadgeClass,
} from '@/features/employees/lib/earning-stage'
import {
  rangeForPreset,
  type EarningsPeriodPreset,
} from '@/features/employees/utils/employee-earnings-period.util'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import {
  dayKeyFromInstant,
  getSyncedOperationalTimeZone,
} from '@/shared/lib/operational-day.util'
import { formatTimezoneUtcOffset } from '@/features/settings/organisation-timezone'
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

function PaymentStateIcon({ row }: { row: EmployeeEarningVisitRow }) {
  const tone = earningTone(row)
  if (tone === 'recorded' || tone === 'processed' || tone === 'earned')
    return <CheckCircle2 className="h-3 w-3" aria-hidden />
  if (tone === 'waiting') return <Clock className="h-3 w-3" aria-hidden />
  return <AlertCircle className="h-3 w-3" aria-hidden />
}

function formatGbp(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(Number.isFinite(amount) ? amount : 0)
}

function formatVisitTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
  formatTime: (iso: string) => string,
): string {
  if (!start) return '—'
  if (!end) return formatTime(start)
  return `${formatTime(start)}–${formatTime(end)}`
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

  const { formatDate, formatTime } = useOrganisationDisplayFormat()
  const operationalTimezone = getSyncedOperationalTimeZone()
  const timezoneHint = `${operationalTimezone} (${formatTimezoneUtcOffset(operationalTimezone)})`

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
        description="Total earned from visits, how much is settled in payroll, and how much is still remaining. A payment shows as recorded only after a payout is marked paid. Periods and visit times use the organisation operational timezone."
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
                      Clears paid and remaining amounts for this employee: deletes payout lines,
                      zeros unpaid visit amounts, removes them from UK payroll runs, and clears
                      fines/penalties. Locked visit-pay run history is kept.
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
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarRange className="h-3.5 w-3.5" aria-hidden />
          Period
          <span
            className="inline-flex items-center rounded border border-dashed border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-normal"
            title="Previous week, last month, custom dates, and visit times use the organisation operational timezone"
            data-testid="employee-earnings-timezone-hint"
          >
            Times in {timezoneHint}
          </span>
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
              {filters.dateFrom ? formatDate(filters.dateFrom) : '…'} →{' '}
              {filters.dateTo ? formatDate(filters.dateTo) : '…'}
            </span>
            {' · '}
            {timezoneHint}
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
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              title="Total earning"
              value={data.salaryAmount ?? formatGbp(
                (data.totalEarnedAmount ?? 0) + (data.remainingAmountValue ?? 0),
              )}
              hint={`${data.salaryVisitCount ?? visits.length} visit${
                (data.salaryVisitCount ?? visits.length) === 1 ? '' : 's'
              } in this period`}
              icon={<PoundSterling className="h-5 w-5" aria-hidden />}
              iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            />
            <StatCard
              title="Settled in payroll"
              value={data.totalEarned}
              hint={`${data.paidVisitCount} visit${data.paidVisitCount === 1 ? '' : 's'} in a locked pay run or closed UK payroll run`}
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
              iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
            />
            <StatCard
              title="Remaining"
              value={data.remainingAmount}
              hint={`${data.remainingVisitCount} visit${
                data.remainingVisitCount === 1 ? '' : 's'
              } still to pay`}
              icon={<Clock className="h-5 w-5" aria-hidden />}
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
                <h3 className="text-sm font-semibold text-foreground">Visits</h3>
                <p className="text-xs text-muted-foreground">
                  {visits.length} visit{visits.length === 1 ? '' : 's'} in the selected period,
                  with planned, actual, and approved pay times.
                </p>
              </div>
            </div>

            {visits.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Wallet className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm text-muted-foreground">
                  No visits in this period.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[1100px] text-sm">
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
                        Planned time
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Actual time
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Approved pay
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
                        Pay period
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map(row => (
                      <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2.5 font-mono text-xs">{row.visitRef}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                          {formatDate(dayKeyFromInstant(row.plannedStart) || row.plannedStart)}
                        </td>
                        <td className="px-3 py-2.5">{row.serviceUserName}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatVisitTimeRange(row.plannedStart, row.plannedEnd, formatTime)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatVisitTimeRange(row.actualStart, row.actualEnd, formatTime)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                          {formatVisitTimeRange(
                            row.approvedPayStart,
                            row.approvedPayEnd,
                            formatTime,
                          )}
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
                              earningToneBadgeClass(row),
                            )}
                            data-testid={`employee-earning-stage-${row.id}`}
                          >
                            <PaymentStateIcon row={row} />
                            {earningStageLabel(row)}
                          </Badge>
                          {earningCorrectionNote(row) ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {earningCorrectionNote(row)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {row.ukPayrollRunLabel ?? row.payrollPeriod ?? '—'}
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
