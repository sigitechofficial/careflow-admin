import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollStatusBadge } from '@/features/payroll/components/PayrollStatusBadge'
import {
  useCalculateUkPayrollGross,
  useCalculateUkPayrollStatutory,
  useCancelUkPayrollRun,
  useCloseUkPayrollRun,
  useEnrolUkPayrollRun,
  useUkPayrollRun,
} from '@/features/payroll/hooks/usePayroll'
import { useAuthStore } from '@/features/auth/store'
import { PAYROLL_PATHS } from '@/features/payroll/payroll-routes'
import { Button } from '@/shared/ui/button'

function formatGbp(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
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
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})

  const open =
    data?.status === 'DRAFT' ||
    data?.status === 'EMPLOYEES_ENROLLED' ||
    data?.status === 'GROSS_CALCULATED' ||
    data?.status === 'STATUTORY_CALCULATED'

  const canCalcStatutory =
    !!data?.grossCalculatedAt &&
    (data.status === 'GROSS_CALCULATED' ||
      data.status === 'STATUTORY_CALCULATED' ||
      data.status === 'CLOSED')

  return (
    <PayrollSectionLayout
      title="Run detail"
      description="Enrol employees, calculate gross, then calculate Week 1 / Month 1 tax & NI. Close when the period is finished."
      testId="payroll-run-detail-page"
    >
      <div className="mb-4">
        <Button asChild size="sm" variant="outline">
          <Link to={PAYROLL_PATHS.runs}>Back to runs</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError || !data ? (
        <p className="text-sm text-destructive">Unable to load run.</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{data.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.period
                  ? `${data.period.periodStart} – ${data.period.periodEnd}`
                  : data.periodId}{' '}
                · {data.taxYear?.code ?? data.taxYearId}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PayrollStatusBadge status={data.status} />
                {data.grossCalculatedAt ? (
                  <span className="text-sm tabular-nums text-muted-foreground">
                    Gross {formatGbp(data.totalGross)}
                    {data.totalExpenses > 0 ? ` · expenses ${formatGbp(data.totalExpenses)}` : ''}
                  </span>
                ) : null}
                {data.statutoryCalculatedAt ? (
                  <span className="text-sm tabular-nums text-muted-foreground">
                    Tax {formatGbp(data.totalIncomeTax)} · Emp NI {formatGbp(data.totalEmployeeNi)} ·
                    Net {formatGbp(data.totalNetPay)}
                  </span>
                ) : null}
              </div>
              {data.statutoryBasis ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Basis: {data.statutoryBasis.replaceAll('_', ' ')}
                </p>
              ) : null}
            </div>
            {canManage && open ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={enrolMut.isPending}
                  onClick={() => enrolMut.mutate()}
                >
                  Enrol ready employees
                </Button>
                <Button
                  size="sm"
                  disabled={calculateMut.isPending || data.employeeCount < 1}
                  onClick={() => calculateMut.mutate()}
                >
                  {calculateMut.isPending ? 'Calculating…' : 'Calculate gross'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={
                    statutoryMut.isPending || !canCalcStatutory || data.employeeCount < 1
                  }
                  onClick={() => statutoryMut.mutate()}
                >
                  {statutoryMut.isPending
                    ? 'Calculating…'
                    : data.statutoryCalculatedAt
                      ? 'Recalculate tax & NI'
                      : 'Calculate tax & NI'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={closeMut.isPending || data.employeeCount < 1}
                  onClick={() => closeMut.mutate()}
                >
                  Close run
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={cancelMut.isPending}
                  onClick={() => cancelMut.mutate()}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
            {canManage && data.status === 'CLOSED' ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={calculateMut.isPending || data.employeeCount < 1}
                  onClick={() => calculateMut.mutate()}
                >
                  {calculateMut.isPending ? 'Calculating…' : 'Recalculate gross'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={
                    statutoryMut.isPending || !canCalcStatutory || data.employeeCount < 1
                  }
                  onClick={() => statutoryMut.mutate()}
                >
                  {statutoryMut.isPending ? 'Calculating…' : 'Recalculate tax & NI'}
                </Button>
              </div>
            ) : null}
          </div>

          {data.phaseNote ? (
            <p className="text-sm text-muted-foreground">{data.phaseNote}</p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 pr-2 font-medium w-8" />
                  <th className="py-2 pr-3 font-medium">Employee</th>
                  <th className="py-2 pr-3 font-medium">Payroll no.</th>
                  <th className="py-2 pr-3 font-medium text-right">Visit pay</th>
                  <th className="py-2 pr-3 font-medium text-right">Salary</th>
                  <th className="py-2 pr-3 font-medium text-right">Gross</th>
                  <th className="py-2 pr-3 font-medium text-right">Tax</th>
                  <th className="py-2 pr-3 font-medium text-right">Emp NI</th>
                  <th className="py-2 pr-3 font-medium text-right">Er NI</th>
                  <th className="py-2 font-medium text-right">Net pay</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((e) => {
                  const isOpen = !!expanded[e.id]
                  return (
                    <React.Fragment key={e.id}>
                      <tr className="border-b border-border/70">
                        <td className="py-2.5 pr-2">
                          {e.inputLineCount > 0 ? (
                            <button
                              type="button"
                              className="rounded p-0.5 text-muted-foreground hover:bg-muted"
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
                        <td className="py-2.5 pr-3 font-medium">
                          {e.displayName}
                          {e.hasProvisionalInputs ? (
                            <span className="ml-2 text-xs font-normal text-amber-700">
                              provisional
                            </span>
                          ) : null}
                          {e.taxCodeApplied ? (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              {e.taxCodeApplied}
                              {e.niCategoryApplied ? ` / NI ${e.niCategoryApplied}` : ''}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3">{e.payrollNumber ?? '—'}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {formatGbp(e.visitPay)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {formatGbp(e.salaryPay)}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-medium tabular-nums">
                          {formatGbp(e.totalGross)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {formatGbp(e.incomeTax)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {formatGbp(e.employeeNi)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {formatGbp(e.employerNi)}
                        </td>
                        <td className="py-2.5 text-right font-medium tabular-nums">
                          {formatGbp(e.netPay)}
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr className="border-b border-border/70 bg-muted/20">
                          <td colSpan={10} className="px-4 py-3">
                            {e.statutoryExplanation ? (
                              <p className="mb-3 text-xs text-muted-foreground">
                                {e.statutoryExplanation}
                              </p>
                            ) : null}
                            <table className="w-full text-left text-xs">
                              <thead className="text-muted-foreground">
                                <tr>
                                  <th className="py-1 pr-3 font-medium">Type</th>
                                  <th className="py-1 pr-3 font-medium">Description</th>
                                  <th className="py-1 pr-3 font-medium text-right">Minutes</th>
                                  <th className="py-1 font-medium text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {e.inputLines.map((line) => (
                                  <tr key={line.id}>
                                    <td className="py-1 pr-3">
                                      {line.lineType.replaceAll('_', ' ')}
                                      {line.isProvisional ? ' · provisional' : ''}
                                    </td>
                                    <td className="py-1 pr-3">{line.description}</td>
                                    <td className="py-1 pr-3 text-right tabular-nums">
                                      {line.minutes ?? '—'}
                                    </td>
                                    <td className="py-1 text-right tabular-nums">
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
                    <td colSpan={10} className="py-6 text-muted-foreground">
                      No employees enrolled yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PayrollSectionLayout>
  )
}
