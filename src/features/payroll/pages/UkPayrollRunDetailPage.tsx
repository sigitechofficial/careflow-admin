import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import {
  ArrowLeft,
  BadgePoundSterling,
  Banknote,
  Calculator,
  CalendarRange,
  CheckCircle2,
  Info,
  Loader2,
  FileJson,
  FileSpreadsheet,
  FileText,
  Receipt,
  RotateCcw,
  Send,
  ShieldAlert,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { PayrollStatusBadge } from '@/features/payroll/components/PayrollStatusBadge'
import { PayrollHmrcSubmissionStatusPanel } from '@/features/payroll/components/PayrollHmrcSubmissionStatusPanel'
import {
  downloadUkPayrollRunEmployeePayslip,
  downloadUkPayrollRunFpsExcel,
  fetchUkPayrollRunHmrcSubmission,
} from '@/features/payroll/api/payroll.api'
import {
  useCalculateUkPayrollGross,
  useCalculateUkPayrollStatutory,
  useCancelUkPayrollRun,
  useCloseUkPayrollRun,
  useEnrolUkPayrollRun,
  useReactivateUkPayrollRun,
  useApproveUkPayrollRunHmrcSubmission,
  useRejectUkPayrollRunHmrcSubmission,
  useSubmitUkPayrollRunFps,
  useUkPayrollRun,
  useUkPayrollRunFps,
  useUkPayrollRunHmrcSubmissions,
} from '@/features/payroll/hooks/usePayroll'
import { useCreateEmployeePayoutBatch } from '@/features/billing/hooks/useEmployeePayouts'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { PAYROLL_PATHS } from '@/features/payroll/payroll-routes'
import { formatTimezoneUtcOffset } from '@/features/settings/organisation-timezone'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { getSyncedOperationalTimeZone } from '@/shared/lib/operational-day.util'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { StatCard } from '@/shared/ui/card'
import { cn } from '@/shared/lib/utils'

function formatGbp(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

export default function UkPayrollRunDetailPage() {
  const { runId } = useParams({ strict: false }) as { runId: string }
  const canManage = useAuthStore((s) => s.can('payroll.runs.manage'))
  const currentUserId = useAuthStore((s) => s.user?.id ?? null)
  const canManagePayouts = useAuthStore((s) => s.can('billing.employee_payouts.manage'))
  const canReadPayouts = useAuthStore((s) => s.can('billing.employee_payouts.read'))
  const { locationId } = useGlobalLocationScope()
  const { formatDate } = useOrganisationDisplayFormat()
  const organisationTimezone = getSyncedOperationalTimeZone()
  const timezoneHint = `${organisationTimezone} (${formatTimezoneUtcOffset(organisationTimezone)})`
  const { data, isLoading, isError } = useUkPayrollRun(runId, locationId)
  const fpsQuery = useUkPayrollRunFps(runId, data?.status === 'CLOSED')
  const hmrcSubsQuery = useUkPayrollRunHmrcSubmissions(runId, data?.status === 'CLOSED')
  const submitFpsMut = useSubmitUkPayrollRunFps(runId)
  const approveLiveMut = useApproveUkPayrollRunHmrcSubmission(runId)
  const rejectLiveMut = useRejectUkPayrollRunHmrcSubmission(runId)
  const enrolMut = useEnrolUkPayrollRun(runId)
  const calculateMut = useCalculateUkPayrollGross(runId)
  const statutoryMut = useCalculateUkPayrollStatutory(runId)
  const closeMut = useCloseUkPayrollRun(runId)
  const cancelMut = useCancelUkPayrollRun(runId)
  const reactivateMut = useReactivateUkPayrollRun(runId)
  const createPayout = useCreateEmployeePayoutBatch()
  const [fpsExcelDownloading, setFpsExcelDownloading] = React.useState(false)
  const [payslipDownloadingId, setPayslipDownloadingId] = React.useState<string | null>(null)

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

  const canDownloadPayslips = data?.status === 'CLOSED'

  const hasGross = Boolean(data?.grossCalculatedAt)
  const hasStatutory = Boolean(data?.statutoryCalculatedAt)
  const canCreatePayoutFromRun =
    canManagePayouts &&
    (data?.status === 'STATUTORY_CALCULATED' || data?.status === 'CLOSED') &&
    (data?.totalNetPay ?? 0) > 0

  const handleCreatePayout = async () => {
    try {
      const detail = await createPayout.mutateAsync({ ukPayrollRunId: runId })
      toastSuccess('Payout batch created', `${detail.lineCount} employees · ${detail.totalAmount}`)
    } catch (e) {
      toastApiError(e, 'Could not create payout from this run')
    }
  }

  const handleDownloadFps = () => {
    if (!fpsQuery.data) return
    const blob = new Blob([JSON.stringify(fpsQuery.data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fps-preview-${runId.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadFpsExcel = async () => {
    setFpsExcelDownloading(true)
    try {
      const blob = await downloadUkPayrollRunFpsExcel(runId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `care-fps-${runId.slice(0, 8)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess('Downloaded FPS Excel workbook')
    } catch (err) {
      toastApiError(err, 'Could not download FPS Excel')
    } finally {
      setFpsExcelDownloading(false)
    }
  }

  const handleDownloadPayslip = async (runEmployeeId: string, displayName: string) => {
    setPayslipDownloadingId(runEmployeeId)
    try {
      const { blob, filename } = await downloadUkPayrollRunEmployeePayslip(runId, runEmployeeId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toastSuccess('Downloaded payslip', displayName)
    } catch (err) {
      toastApiError(err, 'Could not download payslip')
    } finally {
      setPayslipDownloadingId(null)
    }
  }

  return (
    <PayrollSectionLayout
      title="Run detail"
      description="Enrol employees, calculate gross, then calculate Week 1 / Month 1 tax & NI. Close when the period is finished. Period dates use the organisation date format and operational timezone."
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
                      ? `${formatDate(data.period.periodStart)} – ${formatDate(data.period.periodEnd)}`
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
                <p
                  className="text-[11px] text-muted-foreground"
                  title="Pay period dates use the organisation operational timezone and date display format"
                  data-testid="payroll-run-detail-timezone-hint"
                >
                  Times in {timezoneHint}
                </p>
                {data.statutoryBasis ? (
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Receipt className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Basis: {data.statutoryBasis.replace(/_/g, ' ')}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canCreatePayoutFromRun ? (
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={createPayout.isPending}
                  onClick={() => void handleCreatePayout()}
                  data-testid="payroll-run-create-payout"
                >
                  {createPayout.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Banknote className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Create payout from this run
                </Button>
              ) : canReadPayouts && hasStatutory ? (
                <Button asChild size="sm" variant="secondary" className="gap-1.5">
                  <Link to="/billing/employee-payouts">
                    <Banknote className="h-3.5 w-3.5" aria-hidden />
                    Employee payouts
                  </Link>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link to={PAYROLL_PATHS.runs}>
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  Back to runs
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard
              label="Employees"
              value={String(data.employeeCount)}
              icon={<Users className="h-5 w-5" aria-hidden />}
              tone="violet"
            />
            <StatCard
              label="Gross"
              value={hasGross ? formatGbp(data.totalGross) : '—'}
              icon={<BadgePoundSterling className="h-5 w-5" aria-hidden />}
              tone="sky"
              muted={!hasGross}
            />
            <StatCard
              label="Income tax"
              value={hasStatutory ? formatGbp(data.totalIncomeTax) : '—'}
              icon={<Calculator className="h-5 w-5" aria-hidden />}
              tone="amber"
              muted={!hasStatutory}
            />
            <StatCard
              label="Employee NI"
              value={hasStatutory ? formatGbp(data.totalEmployeeNi) : '—'}
              icon={<ShieldAlert className="h-5 w-5" aria-hidden />}
              tone="rose"
              muted={!hasStatutory}
            />
            <StatCard
              label="Net pay"
              value={
                hasStatutory
                  ? formatGbp(data.totalNetPay)
                  : hasGross
                    ? formatGbp(data.totalGross)
                    : '—'
              }
              icon={<Wallet className="h-5 w-5" aria-hidden />}
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

          {data.status === 'CLOSED' ? (
            <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-200">
                    <FileJson className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-foreground">FPS preview</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Full Payment Submission draft from this closed run. When checks pass you can
                      dry-run GovTalk XML or send to the HMRC test gateway (live send is locked).
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={fpsQuery.isFetching}
                    onClick={() => void fpsQuery.refetch()}
                  >
                    {fpsQuery.isFetching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={!fpsQuery.data}
                    onClick={handleDownloadFps}
                    data-testid="payroll-run-download-fps"
                  >
                    <FileJson className="h-3.5 w-3.5" aria-hidden />
                    Download JSON
                  </Button>
                </div>
              </div>

              {fpsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Building FPS preview…</p>
              ) : fpsQuery.isError ? (
                <p className="text-sm text-destructive">
                  Could not build FPS preview. Check employer PAYE settings and employee RTI fields.
                </p>
              ) : fpsQuery.data ? (
                <div className="space-y-3">
                  {(() => {
                    const v = fpsQuery.data.validation
                    if (!v) return null
                    return (
                      <div
                        className={cn(
                          'rounded-lg border px-3 py-2 text-xs',
                          v.isReadyToSubmit
                            ? 'border-emerald-200/80 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                            : 'border-rose-200/80 bg-rose-50/80 text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
                        )}
                        data-testid="payroll-fps-validation-summary"
                      >
                        {v.isReadyToSubmit ? (
                          <p className="font-medium">
                            FPS checks passed
                            {v.warningCount > 0
                              ? ` · ${v.warningCount} warning${v.warningCount === 1 ? '' : 's'} (not blocking)`
                              : ''}
                            . Ready for dry-run or HMRC test send.
                          </p>
                        ) : (
                          <p className="font-medium">
                            {v.errorCount} blocking issue{v.errorCount === 1 ? '' : 's'}
                            {v.warningCount > 0
                              ? ` · ${v.warningCount} warning${v.warningCount === 1 ? '' : 's'}`
                              : ''}
                            . Fix these before Care can send this FPS to HMRC.
                          </p>
                        )}
                      </div>
                    )
                  })()}

                  {fpsQuery.data.validation?.items?.length ? (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Level</th>
                            <th className="px-3 py-2 font-medium">Who / where</th>
                            <th className="px-3 py-2 font-medium">What to fix</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fpsQuery.data.validation.items.map((item) => (
                            <tr
                              key={`${item.code}-${item.employeeId ?? item.scope}-${item.field ?? ''}`}
                              className="border-t border-border"
                            >
                              <td className="px-3 py-2">
                                <span
                                  className={cn(
                                    'rounded px-1.5 py-0.5 font-medium',
                                    item.severity === 'error'
                                      ? 'bg-rose-500/15 text-rose-800 dark:text-rose-200'
                                      : 'bg-amber-500/15 text-amber-900 dark:text-amber-200',
                                  )}
                                >
                                  {item.severity === 'error' ? 'Must fix' : 'Warning'}
                                </span>
                              </td>
                              <td className="px-3 py-2 font-medium text-foreground">
                                {item.employeeName ??
                                  (item.scope === 'employer'
                                    ? 'Employer'
                                    : item.scope === 'submission'
                                      ? 'Pay period'
                                      : item.scope === 'run'
                                        ? 'Run'
                                        : item.scope)}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">{item.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {fpsQuery.data.warnings.length > 0 ? (
                    <ul className="space-y-1 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                      {fpsQuery.data.warnings.map((w) => (
                        <li key={w}>• {w}</li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                    <p>
                      Employer:{' '}
                      <span className="font-medium text-foreground">
                        {fpsQuery.data.employer.fullPayeReference || '—'}
                      </span>
                    </p>
                    <p>
                      Tax year:{' '}
                      <span className="font-medium text-foreground">
                        {fpsQuery.data.submission.relatedTaxYear}
                      </span>
                    </p>
                    <p>
                      Period:{' '}
                      <span className="font-medium text-foreground">
                        {fpsQuery.data.submission.taxMonthOrWeekNumber}
                      </span>
                    </p>
                    <p>
                      Employees:{' '}
                      <span className="font-medium text-foreground">
                        {fpsQuery.data.totals.employeeCount}
                      </span>
                    </p>
                  </div>

                  {fpsQuery.data.employees.some(
                    (e) =>
                      e.employment.isFirstPayOfEmployment || e.employment.isLastPayOfEmployment,
                  ) ? (
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/40 text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Employee</th>
                            <th className="px-3 py-2 font-medium">Starter / leaver</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fpsQuery.data.employees
                            .filter(
                              (e) =>
                                e.employment.isFirstPayOfEmployment ||
                                e.employment.isLastPayOfEmployment,
                            )
                            .map((e) => (
                              <tr key={`sl-${e.employeeId}`} className="border-t border-border">
                                <td className="px-3 py-2 font-medium text-foreground">
                                  {e.name.forename} {e.name.surname}
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {[
                                    e.employment.isFirstPayOfEmployment
                                      ? 'First pay (starter in period)'
                                      : null,
                                    e.employment.isLastPayOfEmployment
                                      ? 'Last pay (leaver in period)'
                                      : null,
                                    e.employment.p45Received ? 'P45 received' : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  <details className="rounded-lg border border-border bg-background">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground">
                      View JSON payload
                    </summary>
                    <pre className="max-h-72 overflow-auto border-t border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
                      {JSON.stringify(fpsQuery.data, null, 2)}
                    </pre>
                  </details>

                  <div
                    className="space-y-3 rounded-lg border border-border bg-background p-3"
                    data-testid="payroll-hmrc-test-submit"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-foreground">HMRC gateway</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Test sends post when HMRC_RTI_HTTP_ENABLED=true. Live sends need Employer
                          PAYE on Live, HMRC_RTI_LIVE_ENABLED=true, and a second person to approve
                          (you cannot approve your own request).
                        </p>
                      </div>
                      {canManage ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={
                              submitFpsMut.isPending || !fpsQuery.data.validation?.isReadyToSubmit
                            }
                            onClick={() =>
                              submitFpsMut.mutate({ mode: 'DRY_RUN', environment: 'TEST' })
                            }
                            data-testid="payroll-fps-dry-run"
                          >
                            {submitFpsMut.isPending &&
                            submitFpsMut.variables?.mode === 'DRY_RUN' &&
                            (submitFpsMut.variables.environment ?? 'TEST') === 'TEST' ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            ) : (
                              <FileJson className="h-3.5 w-3.5" aria-hidden />
                            )}
                            Dry run (test)
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={
                              submitFpsMut.isPending || !fpsQuery.data.validation?.isReadyToSubmit
                            }
                            onClick={() => {
                              if (
                                !window.confirm(
                                  'Send this FPS to the HMRC TEST gateway? This contacts HMRC’s test Transaction Engine (not live).',
                                )
                              ) {
                                return
                              }
                              submitFpsMut.mutate({ mode: 'SUBMIT', environment: 'TEST' })
                            }}
                            data-testid="payroll-fps-submit-test"
                          >
                            {submitFpsMut.isPending &&
                            submitFpsMut.variables?.mode === 'SUBMIT' &&
                            (submitFpsMut.variables.environment ?? 'TEST') === 'TEST' ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            ) : (
                              <Send className="h-3.5 w-3.5" aria-hidden />
                            )}
                            Send to HMRC test
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-rose-300 text-rose-800 dark:border-rose-800 dark:text-rose-200"
                            disabled={
                              submitFpsMut.isPending || !fpsQuery.data.validation?.isReadyToSubmit
                            }
                            onClick={() => {
                              if (
                                !window.confirm(
                                  'Request a LIVE FPS send? A different user must approve before Care contacts real HMRC. Nothing is sent yet.',
                                )
                              ) {
                                return
                              }
                              submitFpsMut.mutate({ mode: 'SUBMIT', environment: 'LIVE' })
                            }}
                            data-testid="payroll-fps-request-live"
                          >
                            {submitFpsMut.isPending &&
                            submitFpsMut.variables?.mode === 'SUBMIT' &&
                            submitFpsMut.variables.environment === 'LIVE' ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            ) : (
                              <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                            )}
                            Request live send
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={!fpsQuery.data || fpsExcelDownloading}
                        onClick={() => void handleDownloadFpsExcel()}
                        data-testid="payroll-fps-download-excel"
                      >
                        {fpsExcelDownloading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
                        )}
                        Download FPS Excel
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Human-readable workbook (Summary + Employees). GovTalk XML is on each
                        submission row below.
                      </span>
                    </div>

                    <PayrollHmrcSubmissionStatusPanel
                      documentLabel="FPS"
                      isValidated={Boolean(fpsQuery.data.validation?.isReadyToSubmit)}
                      submissions={hmrcSubsQuery.data ?? []}
                      isLoading={hmrcSubsQuery.isLoading}
                      canManage={canManage}
                      currentUserId={currentUserId}
                      onDownload={(s) => fetchUkPayrollRunHmrcSubmission(runId, s.id)}
                      onDownloadFpsExcel={() => void handleDownloadFpsExcel()}
                      fpsExcelDownloading={fpsExcelDownloading}
                      onRetry={(s) => {
                        const env = s.environment === 'LIVE' ? 'LIVE' : 'TEST'
                        if (
                          !window.confirm(
                            `Retry this FPS ${env} send? This creates a new attempt.`,
                          )
                        ) {
                          return
                        }
                        if (env === 'LIVE') {
                          submitFpsMut.mutate({ mode: 'SUBMIT', environment: 'LIVE' })
                        } else {
                          submitFpsMut.mutate({ mode: 'SUBMIT', environment: 'TEST' })
                        }
                      }}
                      onApproveLive={(id) => approveLiveMut.mutate(id)}
                      onRejectLive={(id, reason) =>
                        rejectLiveMut.mutate({ submissionId: id, reason })
                      }
                      approvePending={approveLiveMut.isPending}
                      rejectPending={rejectLiveMut.isPending}
                      retryPending={submitFpsMut.isPending}
                    />
                  </div>
                </div>
              ) : null}
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
                    {canDownloadPayslips
                      ? 'Download an ERA itemised payslip PDF per employee after the run is closed'
                      : 'Expand a row to see visit-pay and salary input lines. Payslips unlock when the run is closed.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-left text-sm">
                <thead className="border-b border-border bg-muted/20 text-muted-foreground">
                  <tr>
                    <th className="py-2.5 pl-4 pr-3 font-medium">Employee</th>
                    <th className="py-2.5 pr-3 font-medium">Payroll no.</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Visit pay</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Salary</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Gross</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Tax</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Emp NI</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Er NI</th>
                    <th className="bg-emerald-50/60 py-2.5 pr-3 text-right font-medium text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200">
                      Net pay
                    </th>
                    <th className="py-2.5 pr-3 text-right font-medium">Tax YTD</th>
                    <th className="py-2.5 pr-4 text-right font-medium">Payslip</th>
                  </tr>
                </thead>
                <tbody>
                  {data.employees.map((e) => (
                    <tr
                      key={e.id}
                      className="border-b border-border/70 transition-colors hover:bg-muted/20"
                    >
                      <td className="py-3 pl-4 pr-3">
                        <div className="font-medium text-foreground">{e.displayName}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {e.hasProvisionalInputs ? (
                            <Badge
                              variant="secondary"
                              className="bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                            >
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
                      <td className="bg-emerald-50/40 py-3 pr-3 text-right font-semibold tabular-nums text-emerald-900 dark:bg-emerald-950/15 dark:text-emerald-100">
                        {formatGbp(e.netPay)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums text-muted-foreground">
                        {e.ytd ? formatGbp(e.ytd.incomeTaxYtd) : '—'}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={
                            !canDownloadPayslips ||
                            !e.statutoryCalculatedAt ||
                            payslipDownloadingId === e.id
                          }
                          onClick={() => void handleDownloadPayslip(e.id, e.displayName)}
                          data-testid={`payroll-payslip-download-${e.id}`}
                          title={
                            canDownloadPayslips
                              ? 'Download itemised payslip PDF'
                              : 'Close the run to download payslips'
                          }
                        >
                          {payslipDownloadingId === e.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : (
                            <FileText className="h-3.5 w-3.5" aria-hidden />
                          )}
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {data.employees.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
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
