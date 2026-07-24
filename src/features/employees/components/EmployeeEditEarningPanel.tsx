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
  Wallet,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/features/auth/store'
import { useEmployeeEarnings } from '@/features/billing/hooks/usePayrollRuns'
import type { EmployeeEarningVisitRow } from '@/features/billing/api/payroll-runs.api'
import {
  rangeForPreset,
  type EarningsPeriodPreset,
} from '@/features/employees/utils/employee-earnings-period.util'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ContentCard, ContentSectionHeader } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'

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
  if (state === 'REMAINING') return 'Remaining'
  if (state === 'REJECTED') return 'Rejected'
  return 'Pending'
}

function paymentStateBadgeClass(state: EmployeeEarningVisitRow['paymentState']): string {
  if (state === 'PAID') return 'bg-success/10 text-success border-success/20'
  if (state === 'REMAINING') return 'bg-warning/10 text-warning border-warning/20'
  if (state === 'REJECTED') return 'bg-destructive/10 text-destructive border-destructive/20'
  return 'bg-muted text-muted-foreground border-border'
}

function PaymentStateIcon({ state }: { state: EmployeeEarningVisitRow['paymentState'] }) {
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

  const [preset, setPreset] = React.useState<EarningsPeriodPreset>('all')
  const [customFrom, setCustomFrom] = React.useState('')
  const [customTo, setCustomTo] = React.useState('')

  const filters = React.useMemo(() => {
    if (preset === 'custom') {
      return rangeForPreset('custom', { dateFrom: customFrom, dateTo: customTo })
    }
    return rangeForPreset(preset)
  }, [preset, customFrom, customTo])

  const query = useEmployeeEarnings(employeeId, filters, canRead)
  const data = query.data
  const visits = data?.visits ?? []

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
        description="Payroll totals for this carer — paid visits from locked payroll runs, and visit pay accepted automatically when a visit is completed (while a pay card can price it)."
        icon={<Wallet className="h-5 w-5" aria-hidden />}
        iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        action={
          canViewVisits ? (
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
          ) : null
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total earned"
              value={data.totalEarned}
              hint="From locked / exported payroll runs"
              icon={<PoundSterling className="h-5 w-5" aria-hidden />}
              iconClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            />
            <StatCard
              title="Visits paid"
              value={data.paidVisitCount}
              hint="Visits included in locked payroll"
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
              iconClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300"
            />
            <StatCard
              title="Remaining"
              value={data.remainingAmount}
              hint={`${data.remainingVisitCount} completed visit${data.remainingVisitCount === 1 ? '' : 's'} ready for payroll`}
              icon={<Clock className="h-5 w-5" aria-hidden />}
              iconClassName="bg-amber-500/10 text-amber-800 dark:text-amber-300"
            />
            <StatCard
              title="Pending review"
              value={data.pendingReviewCount}
              hint="Visits missing a pay card or pay rates"
              icon={<AlertCircle className="h-5 w-5" aria-hidden />}
              iconClassName="bg-violet-500/10 text-violet-700 dark:text-violet-300"
            />
          </div>

          <ContentCard className="space-y-4 p-4">
            <div className="flex items-start gap-2.5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-500/10 text-slate-700 dark:text-slate-300">
                <Wallet className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Visit earnings detail</h3>
                <p className="text-xs text-muted-foreground">
                  {visits.length} visit{visits.length === 1 ? '' : 's'} in the selected period
                </p>
              </div>
            </div>

            {visits.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Wallet className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm text-muted-foreground">
                  No paid, remaining, or pending visits in this period.
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
                        Payment
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Payroll period
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
                          {row.payrollPeriod ?? '—'}
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
