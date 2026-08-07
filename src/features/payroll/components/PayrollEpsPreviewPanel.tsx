import * as React from 'react'
import { FileJson, Loader2, Send, ShieldAlert } from 'lucide-react'
import {
  useApprovePayrollEpsSubmission,
  usePayrollEpsPreview,
  usePayrollEpsSubmissions,
  usePayrollTaxYears,
  useRejectPayrollEpsSubmission,
  useSubmitPayrollEps,
} from '@/features/payroll/hooks/usePayroll'
import { fetchPayrollEpsSubmission } from '@/features/payroll/api/payroll.api'
import { PayrollHmrcSubmissionStatusPanel } from '@/features/payroll/components/PayrollHmrcSubmissionStatusPanel'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'

type Props = {
  employmentAllowanceClaimedDefault: boolean
}

export function PayrollEpsPreviewPanel({ employmentAllowanceClaimedDefault }: Props) {
  const canManage = useAuthStore((s) => s.can('payroll.settings.manage'))
  const currentUserId = useAuthStore((s) => s.user?.id ?? null)
  const { data: taxYears = [] } = usePayrollTaxYears()
  const current = taxYears.find((t) => t.isCurrent) ?? taxYears[0]
  const [taxYearId, setTaxYearId] = React.useState('')
  const [taxMonth, setTaxMonth] = React.useState(1)
  const [nilPayment, setNilPayment] = React.useState<boolean | 'auto'>('auto')
  const [eaClaimed, setEaClaimed] = React.useState(employmentAllowanceClaimedDefault)
  const [smp, setSmp] = React.useState('0')

  React.useEffect(() => {
    if (current?.id && !taxYearId) setTaxYearId(current.id)
  }, [current?.id, taxYearId])

  React.useEffect(() => {
    setEaClaimed(employmentAllowanceClaimedDefault)
  }, [employmentAllowanceClaimedDefault])

  const queryParams = {
    taxYearId: taxYearId || undefined,
    taxMonth,
    ...(nilPayment === 'auto' ? {} : { noPaymentThisPeriod: nilPayment }),
    employmentAllowanceClaimed: eaClaimed,
    smpRecovered: Number(smp) || 0,
  }

  const epsQuery = usePayrollEpsPreview(queryParams, Boolean(taxYearId || current))
  const subsQuery = usePayrollEpsSubmissions(
    { taxYearId: taxYearId || undefined, taxMonth },
    Boolean(taxYearId),
  )
  const submitMut = useSubmitPayrollEps()
  const approveMut = useApprovePayrollEpsSubmission()
  const rejectMut = useRejectPayrollEpsSubmission()

  const handleDownload = () => {
    if (!epsQuery.data) return
    const blob = new Blob([JSON.stringify(epsQuery.data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eps-preview-m${taxMonth}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const submitBody = {
    taxYearId: taxYearId || undefined,
    taxMonth,
    ...(nilPayment === 'auto' ? {} : { noPaymentThisPeriod: nilPayment as boolean }),
    employmentAllowanceClaimed: eaClaimed,
    smpRecovered: Number(smp) || 0,
  }

  const deadlineTone =
    epsQuery.data?.period.deadlineStatus === 'OVERDUE'
      ? 'border-rose-200 bg-rose-50/80 text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100'
      : epsQuery.data?.period.deadlineStatus === 'DUE_SOON'
        ? 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
        : 'border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'

  return (
    <div className="space-y-3 rounded-xl border border-border p-4" data-testid="payroll-eps-preview">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">EPS preview &amp; submit</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Employer Payment Summary for one tax month — nil payment, Employment Allowance, and
            statutory recoveries. Dry-run builds GovTalk; live send needs a second approver.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={epsQuery.isFetching}
            onClick={() => void epsQuery.refetch()}
          >
            {epsQuery.isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            )}
            Refresh
          </Button>
          <Button size="sm" className="gap-1.5" disabled={!epsQuery.data} onClick={handleDownload}>
            <FileJson className="h-3.5 w-3.5" aria-hidden />
            Download JSON
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-foreground">Tax year</span>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={taxYearId}
            onChange={(e) => setTaxYearId(e.target.value)}
          >
            {taxYears.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code}
                {t.isCurrent ? ' (current)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-foreground">Tax month (1–12)</span>
          <Input
            type="number"
            min={1}
            max={12}
            value={taxMonth}
            onChange={(e) => setTaxMonth(Math.min(12, Math.max(1, Number(e.target.value) || 1)))}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-foreground">Nil payment</span>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={nilPayment === 'auto' ? 'auto' : nilPayment ? 'yes' : 'no'}
            onChange={(e) => {
              const v = e.target.value
              setNilPayment(v === 'auto' ? 'auto' : v === 'yes')
            }}
          >
            <option value="auto">Auto from closed runs</option>
            <option value="yes">Yes — no payment this period</option>
            <option value="no">No — payments made</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-foreground">SMP recovered (£)</span>
          <Input value={smp} onChange={(e) => setSmp(e.target.value)} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={eaClaimed}
          onChange={(e) => setEaClaimed(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        Claim Employment Allowance on this EPS preview
      </label>

      {epsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Building EPS preview…</p>
      ) : epsQuery.isError ? (
        <p className="text-sm text-destructive">
          Could not build EPS preview. Check tax year and employer PAYE settings.
        </p>
      ) : epsQuery.data ? (
        <div className="space-y-3">
          <div className={cn('rounded-lg border px-3 py-2 text-xs', deadlineTone)}>
            <p className="font-medium">
              Tax month {epsQuery.data.period.taxMonth}: {epsQuery.data.period.taxMonthStart} →{' '}
              {epsQuery.data.period.taxMonthEnd}
            </p>
            <p className="mt-1">
              Electronic deadline{' '}
              <span className="font-semibold">{epsQuery.data.period.electronicDeadline}</span>
              {epsQuery.data.period.daysUntilDeadline != null
                ? ` · ${epsQuery.data.period.daysUntilDeadline} day(s) ${
                    epsQuery.data.period.daysUntilDeadline < 0 ? 'overdue' : 'remaining'
                  }`
                : ''}
            </p>
          </div>

          <div
            className={cn(
              'rounded-lg border px-3 py-2 text-xs',
              epsQuery.data.validation.isReadyToSubmit
                ? 'border-emerald-200/80 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                : 'border-rose-200/80 bg-rose-50/80 text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
            )}
          >
            {epsQuery.data.validation.isReadyToSubmit
              ? `EPS checks passed${
                  epsQuery.data.validation.warningCount
                    ? ` · ${epsQuery.data.validation.warningCount} warning(s)`
                    : ''
                }. Ready for dry-run or HMRC send.`
              : `${epsQuery.data.validation.errorCount} blocking issue(s) — fix employer PAYE before send`}
          </div>

          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <p>
              Nil payment:{' '}
              <span className="font-medium text-foreground">
                {epsQuery.data.indicators.noPaymentThisPeriod ? 'Yes' : 'No'}
              </span>
            </p>
            <p>
              Employment Allowance:{' '}
              <span className="font-medium text-foreground">
                {epsQuery.data.indicators.employmentAllowanceClaimed ? 'Claimed' : 'Not claimed'}
              </span>
            </p>
            <p>
              Closed runs this month:{' '}
              <span className="font-medium text-foreground">
                {epsQuery.data.context.closedRunsInTaxMonth}
              </span>
            </p>
            <p>
              Employees paid:{' '}
              <span className="font-medium text-foreground">
                {epsQuery.data.context.employeesPaidInTaxMonth}
              </span>
            </p>
          </div>

          {epsQuery.data.warnings.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {epsQuery.data.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          ) : null}

          {epsQuery.data.validation.items.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {epsQuery.data.validation.items.map((item) => (
                <li key={`${item.code}-${item.field ?? ''}`}>
                  <span
                    className={cn(
                      'mr-1 rounded px-1 py-0.5 font-medium',
                      item.severity === 'error'
                        ? 'bg-rose-500/15 text-rose-800 dark:text-rose-200'
                        : 'bg-amber-500/15 text-amber-900 dark:text-amber-200',
                    )}
                  >
                    {item.severity === 'error' ? 'Must fix' : 'Warning'}
                  </span>
                  {item.message}
                </li>
              ))}
            </ul>
          ) : null}

          {canManage ? (
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={submitMut.isPending || !epsQuery.data.validation.isReadyToSubmit}
                onClick={() =>
                  submitMut.mutate({ ...submitBody, mode: 'DRY_RUN', environment: 'TEST' })
                }
              >
                {submitMut.isPending &&
                submitMut.variables?.mode === 'DRY_RUN' &&
                (submitMut.variables.environment ?? 'TEST') === 'TEST' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <FileJson className="h-3.5 w-3.5" aria-hidden />
                )}
                Dry run (test)
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={submitMut.isPending || !epsQuery.data.validation.isReadyToSubmit}
                onClick={() => {
                  if (
                    !window.confirm(
                      'Send this EPS to the HMRC TEST gateway? (Not live.)',
                    )
                  ) {
                    return
                  }
                  submitMut.mutate({ ...submitBody, mode: 'SUBMIT', environment: 'TEST' })
                }}
              >
                {submitMut.isPending &&
                submitMut.variables?.mode === 'SUBMIT' &&
                (submitMut.variables.environment ?? 'TEST') === 'TEST' ? (
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
                disabled={submitMut.isPending || !epsQuery.data.validation.isReadyToSubmit}
                onClick={() => {
                  if (
                    !window.confirm(
                      'Request a LIVE EPS send? A different user must approve before Care contacts real HMRC.',
                    )
                  ) {
                    return
                  }
                  submitMut.mutate({ ...submitBody, mode: 'SUBMIT', environment: 'LIVE' })
                }}
              >
                {submitMut.isPending &&
                submitMut.variables?.mode === 'SUBMIT' &&
                submitMut.variables.environment === 'LIVE' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                )}
                Request live send
              </Button>
            </div>
          ) : null}

          <PayrollHmrcSubmissionStatusPanel
            documentLabel="EPS"
            isValidated={Boolean(epsQuery.data.validation.isReadyToSubmit)}
            submissions={subsQuery.data ?? []}
            isLoading={subsQuery.isLoading}
            canManage={canManage}
            currentUserId={currentUserId}
            onDownload={(s) => fetchPayrollEpsSubmission(s.id)}
            onRetry={(s) => {
              const env = s.environment === 'LIVE' ? 'LIVE' : 'TEST'
              if (
                !window.confirm(
                  `Retry this EPS ${env} send? This creates a new attempt with the current form values.`,
                )
              ) {
                return
              }
              submitMut.mutate({
                ...submitBody,
                mode: 'SUBMIT',
                environment: env,
              })
            }}
            onApproveLive={(id) => approveMut.mutate(id)}
            onRejectLive={(id, reason) =>
              rejectMut.mutate({ submissionId: id, reason })
            }
            approvePending={approveMut.isPending}
            rejectPending={rejectMut.isPending}
            retryPending={submitMut.isPending}
          />

          <details className="rounded-lg border border-border bg-background">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground">
              View JSON payload
            </summary>
            <pre className="max-h-64 overflow-auto border-t border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
              {JSON.stringify(epsQuery.data, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  )
}
