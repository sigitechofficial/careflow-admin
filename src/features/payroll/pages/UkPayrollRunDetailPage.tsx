import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft,
  BadgePoundSterling,
  Calculator,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  Receipt,
  RotateCcw,
  ShieldAlert,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollStatusBadge } from '@/features/payroll/components/PayrollStatusBadge'
import {
  useCalculateUkPayrollGross,
  useCalculateUkPayrollStatutory,
  useCancelUkPayrollRun,
  useCloseUkPayrollRun,
  useEnrolUkPayrollRun,
  useReactivateUkPayrollRun,
  useUkPayrollRun,
} from '@/features/payroll/hooks/usePayroll'
import { useAuthStore } from '@/features/auth/store'
import { PAYROLL_PATHS } from '@/features/payroll/payroll-routes'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'

function formatGbp(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

const STAT_TONES = {
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
  rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
} as const

function RunStatCard({
  label,
  value,
  icon: Icon,
  tone,
  muted,
}: {
  label: string
  value: string
  icon: LucideIcon
  tone: keyof typeof STAT_TONES
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-sm',
        muted && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            STAT_TONES[tone],
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
    </div>
  )
}

export default function UkPayrollRunDetailPage() {
  const { runId } = useParams({ strict: false }) as { runId: string }
  const canManage = useAuthStore((s) => s.can('payroll.runs.manage'))
  const { data, isLoading, isError } = useUkPayrollRun(runId)
  const enrolMut = useEnrolUkPayrollRun(runId)
  const calculateMut = useCalculateUkPayrollGross(runId)
  const statutoryMut = useCalculateUkPayrollStatutory(runId)
  const closeMut = useCloseUkPayrollRun(runId)
  const cancelMut = useCancelUkPayrollRun(runId)
  const reactivateMut = useReactivateUkPayrollRun(runId)
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})

  const open =
    data?.status === 'DRAFT' ||
    data?.status === 'EMPLOYEES_ENROLLED' ||
    data?.status === 'GROSS_CALCULATED' ||
    data?.status === 'STATUTORY_CALCULATED'

  const canReactivate = data?.status === 'CLOSED' || data?.status === 'CANCELLED'

  const canCalcStatutory =
    !!data?.grossCalculatedAt &&
    (data.status === 'GROSS_CALCULATED' ||
      data.status === 'STATUTORY_CALCULATED' ||
      data.status === 'CLOSED')

  const hasGross = Boolean(data?.grossCalculatedAt)
  const hasStatutory = Boolean(data?.statutoryCalculatedAt)

  return (
    <PayrollSectionLayout
      title="Run detail"
      description="Enrol employees, calculate gross, then calculate Week 1 / Month 1 tax & NI. Close when the period is finished."
      testId="payroll-run-detail-page"
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError || !data ? (
        <div className="space-y-4">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to={PAYROLL_PATHS.runs}>
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Back to runs
            </Link>
          </Button>
          <p className="text-sm text-destructive">Unable to load run.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <Wallet className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">{data.label}</h2>
                  <PayrollStatusBadge status={data.status} />
                </div>
                <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {data.period
                      ? `${data.period.periodStart} – ${data.period.periodEnd}`
                      : data.periodId}
                  </span>
                  <span>·</span>
                  <span>{data.taxYear?.code ?? data.taxYearId}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {data.employeeCount} employee{data.employeeCount === 1 ? '' : 's'}
                  </span>
                </p>
                {data.statutoryBasis ? (
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Receipt className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Basis: {data.statutoryBasis.replace(/_/g, ' ')}
                  </p>
                ) : null}
              </div>
            </div>

            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to={PAYROLL_PATHS.runs}>
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                Back to runs
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <RunStatCard
              label="Employees"
              value={String(data.employeeCount)}
              icon={Users}
              tone="violet"
            />
            <RunStatCard
              label="Gross"
              value={hasGross ? formatGbp(data.totalGross) : '—'}
              icon={BadgePoundSterling}
              tone="sky"
              muted={!hasGross}
            />
            <RunStatCard
              label="Income tax"
              value={hasStatutory ? formatGbp(data.totalIncomeTax) : '—'}
              icon={Calculator}
              tone="amber"
              muted={!hasStatutory}
            />
            <RunStatCard
              label="Employee NI"
              value={hasStatutory ? formatGbp(data.totalEmployeeNi) : '—'}
              icon={ShieldAlert}
              tone="rose"
              muted={!hasStatutory}
            />
            <RunStatCard
              label="Net pay"
              value={hasStatutory ? formatGbp(data.totalNetPay) : hasGross ? formatGbp(data.totalGross) : '—'}
              icon={Wallet}
              tone="emerald"
              muted={!hasGross && !hasStatutory}
            />
          </div>

          {canManage && (open || canReactivate) ? (
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Run actions</p>
                <p className="text-xs text-muted-foreground">
                  {canReactivate
                    ? 'Reactivate to continue edits on this period'
                    : 'Enrol → Gross → Tax & NI → Close'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canReactivate ? (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={reactivateMut.isPending}
                    onClick={() => reactivateMut.mutate(runId)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    {reactivateMut.isPending ? 'Reactivating…' : 'Reactivate run'}
                  </Button>
                ) : null}
                {open ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={enrolMut.isPending}
                      onClick={() => enrolMut.mutate(undefined)}
                    >
                      <UserPlus className="h-3.5 w-3.5" aria-hidden />
                      Enrol ready employees
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={calculateMut.isPending || data.employeeCount < 1}
                      onClick={() => calculateMut.mutate(undefined)}
                    >
                      <Calculator className="h-3.5 w-3.5" aria-hidden />
                      {calculateMut.isPending ? 'Calculating…' : 'Calculate gross'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      disabled={
                        statutoryMut.isPending || !canCalcStatutory || data.employeeCount < 1
                      }
                      onClick={() => statutoryMut.mutate(undefined)}
                    >
                      <Receipt className="h-3.5 w-3.5" aria-hidden />
                      {statutoryMut.isPending
                        ? 'Calculating…'
                        : data.statutoryCalculatedAt
                          ? 'Recalculate tax & NI'
                          : 'Calculate tax & NI'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={closeMut.isPending || data.employeeCount < 1}
                      onClick={() => closeMut.mutate(undefined)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Close run
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                      disabled={cancelMut.isPending}
                      onClick={() => cancelMut.mutate(undefined)}
                    >
                      <XCircle className="h-3.5 w-3.5" aria-hidden />
                      Cancel
                    </Button>
                  </>
                ) : null}
                {data.status === 'CLOSED' ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={calculateMut.isPending || data.employeeCount < 1}
                      onClick={() => calculateMut.mutate(undefined)}
                    >
                      <Calculator className="h-3.5 w-3.5" aria-hidden />
                      {calculateMut.isPending ? 'Calculating…' : 'Recalculate gross'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      disabled={
                        statutoryMut.isPending || !canCalcStatutory || data.employeeCount < 1
                      }
                      onClick={() => statutoryMut.mutate(undefined)}
                    >
                      <Receipt className="h-3.5 w-3.5" aria-hidden />
                      {statutoryMut.isPending ? 'Calculating…' : 'Recalculate tax & NI'}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {data.phaseNote ? (
            <div className="flex gap-3 rounded-xl border border-sky-200/80 bg-sky-50/70 px-4 py-3 dark:border-sky-900 dark:bg-sky-950/30">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
              <p className="text-sm leading-relaxed text-sky-950 dark:text-sky-100">{data.phaseNote}</p>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
                  <Users className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Employees on this run</p>
                  <p className="text-xs text-muted-foreground">
                    Expand a row to see visit-pay and salary input lines
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead className="border-b border-border bg-muted/20 text-muted-foreground">
                  <tr>
                    <th className="w-8 py-2.5 pl-4 pr-2 font-medium" />
                    <th className="py-2.5 pr-3 font-medium">Employee</th>
                    <th className="py-2.5 pr-3 font-medium">Payroll no.</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Visit pay</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Salary</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Gross</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Tax</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Emp NI</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Er NI</th>
                    <th className="bg-emerald-50/60 py-2.5 pr-4 text-right font-medium text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200">
                      Net pay
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees.map((e) => {
                    const isOpen = !!expanded[e.id]
                    return (
                      <React.Fragment key={e.id}>
                        <tr className="border-b border-border/70 transition-colors hover:bg-muted/20">
                          <td className="py-3 pl-4 pr-2">
                            {e.inputLineCount > 0 ? (
                              <button
                                type="button"
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label={isOpen ? 'Hide lines' : 'Show lines'}
                                onClick={() =>
                                  setExpanded((prev) => ({ ...prev, [e.id]: !prev[e.id] }))
                                }
                              >
                                {isOpen ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </button>
                            ) : null}
                          </td>
                          <td className="py-3 pr-3">
                            <div className="font-medium text-foreground">{e.displayName}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {e.hasProvisionalInputs ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                                  provisional
                                </Badge>
                              ) : null}
                              {e.taxCodeApplied ? (
                                <span className="text-xs text-muted-foreground">
                                  {e.taxCodeApplied}
                                  {e.niCategoryApplied ? ` · NI ${e.niCategoryApplied}` : ''}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-3 pr-3 text-muted-foreground">{e.payrollNumber ?? '—'}</td>
                          <td className="py-3 pr-3 text-right tabular-nums">{formatGbp(e.visitPay)}</td>
                          <td className="py-3 pr-3 text-right tabular-nums">{formatGbp(e.salaryPay)}</td>
                          <td className="py-3 pr-3 text-right font-medium tabular-nums">
                            {formatGbp(e.totalGross)}
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums">{formatGbp(e.incomeTax)}</td>
                          <td className="py-3 pr-3 text-right tabular-nums">{formatGbp(e.employeeNi)}</td>
                          <td className="py-3 pr-3 text-right tabular-nums text-muted-foreground">
                            {formatGbp(e.employerNi)}
                          </td>
                          <td className="bg-emerald-50/40 py-3 pr-4 text-right font-semibold tabular-nums text-emerald-900 dark:bg-emerald-950/15 dark:text-emerald-100">
                            {formatGbp(e.netPay)}
                          </td>
                        </tr>
                        {isOpen ? (
                          <tr className="border-b border-border/70 bg-muted/15">
                            <td colSpan={10} className="px-4 py-4">
                              {e.statutoryExplanation ? (
                                <div className="mb-3 flex gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
                                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                                  <p>{e.statutoryExplanation}</p>
                                </div>
                              ) : null}
                              <table className="w-full text-left text-xs">
                                <thead className="text-muted-foreground">
                                  <tr>
                                    <th className="py-1.5 pr-3 font-medium">Type</th>
                                    <th className="py-1.5 pr-3 font-medium">Description</th>
                                    <th className="py-1.5 pr-3 text-right font-medium">Minutes</th>
                                    <th className="py-1.5 text-right font-medium">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {e.inputLines.map((line) => (
                                    <tr key={line.id} className="border-t border-border/50">
                                      <td className="py-1.5 pr-3">
                                        {line.lineType.replace(/_/g, ' ')}
                                        {line.isProvisional ? ' · provisional' : ''}
                                      </td>
                                      <td className="py-1.5 pr-3">{line.description}</td>
                                      <td className="py-1.5 pr-3 text-right tabular-nums">
                                        {line.minutes ?? '—'}
                                      </td>
                                      <td className="py-1.5 text-right tabular-nums font-medium">
                                        {formatGbp(line.amount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    )
                  })}
                  {data.employees.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                        <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" aria-hidden />
                        No employees enrolled yet. Use Enrol ready employees to start.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PayrollSectionLayout>
  )
}
