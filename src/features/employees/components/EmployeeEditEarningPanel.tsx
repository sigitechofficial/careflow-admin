import * as React from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
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
  return 'bg-muted text-muted-foreground border-border'
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string
  value: string | number
  hint: string
}) {
  return (
    <ContentCard className="space-y-1 p-4">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </ContentCard>
  )
}

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
        action={
          canViewVisits ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/billing/visit-reconciliation"
                search={{ employeeId }}
                data-testid="employee-earnings-view-all-visits"
              >
                View all visits
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['all', 'All time'],
              ['previous-week', 'Previous week'],
              ['last-month', 'Last month'],
              ['custom', 'Custom dates'],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={preset === id ? 'default' : 'outline'}
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
              <span className="text-xs text-muted-foreground">From</span>
              <Input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="h-9 w-44"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">To</span>
              <Input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="h-9 w-44"
              />
            </label>
          </div>
        ) : null}

        {(filters.dateFrom || filters.dateTo) && (
          <p className="text-xs text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">
              {filters.dateFrom ?? '…'} → {filters.dateTo ?? '…'}
            </span>
          </p>
        )}
      </div>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading earnings…
        </div>
      ) : query.isError ? (
        <p className="text-sm text-destructive">Could not load earnings for this employee.</p>
      ) : data ? (
        <>
          <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4')}>
            <StatCard
              title="Total earned"
              value={data.totalEarned}
              hint="From locked / exported payroll runs"
            />
            <StatCard
              title="Visits paid"
              value={data.paidVisitCount}
              hint="Visits included in locked payroll"
            />
            <StatCard
              title="Remaining"
              value={data.remainingAmount}
              hint={`${data.remainingVisitCount} completed visit${data.remainingVisitCount === 1 ? '' : 's'} ready for payroll`}
            />
            <StatCard
              title="Pending review"
              value={data.pendingReviewCount}
              hint="Visits missing a pay card or pay rates"
            />
          </div>

          <ContentCard className="space-y-3 p-4">
            <h3 className="text-sm font-semibold text-foreground">Visit earnings detail</h3>
            {visits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No paid, remaining, or pending visits in this period.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[960px] text-sm">
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
                      <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                        Approved pay
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Hours
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                        Payable
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
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                          {formatVisitDate(row.plannedStart)}
                        </td>
                        <td className="px-3 py-2.5">{row.serviceUserName}</td>
                        <td className="px-3 py-2.5 tabular-nums text-muted-foreground whitespace-nowrap">
                          {row.plannedTime ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-muted-foreground whitespace-nowrap">
                          {row.approvedPayTime ?? '—'}
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
                              'font-medium',
                              paymentStateBadgeClass(row.paymentState),
                            )}
                          >
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
