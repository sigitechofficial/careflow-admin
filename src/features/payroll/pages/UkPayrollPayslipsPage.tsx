import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { FileText, Filter, Loader2, RotateCcw, Search } from 'lucide-react'
import { PayrollSectionLayout } from '@/features/payroll/components/PayrollSectionLayout'
import { downloadUkPayrollPayslipPdf } from '@/features/payroll/api/payroll.api'
import { useUkPayrollPayslips } from '@/features/payroll/hooks/usePayroll'
import type { UkPayrollPayslipListItem } from '@/features/payroll/types/payroll.types'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { PAYROLL_PATHS } from '@/features/payroll/payroll-routes'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { StatCard } from '@/shared/ui/card'
import { cn } from '@/shared/lib/utils'

/** Gate C20: a figure the run was calculated before it was recorded. */
function Unavailable() {
  return <span className="text-xs text-muted-foreground">Historical detail unavailable</span>
}

function formatGbp(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

function bankStatusBadgeClass(status: UkPayrollPayslipListItem['bankStatus'] | undefined) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
    case 'APPROVED':
      return 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200'
    default:
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
  }
}

function bankStatusShortLabel(row: UkPayrollPayslipListItem) {
  if (row.bankStatus === 'PAID') return 'Paid'
  if (row.bankStatus === 'APPROVED') return 'Awaiting bank'
  return 'Not yet paid'
}

function periodKey(row: Pick<UkPayrollPayslipListItem, 'periodStart' | 'frequency' | 'periodLabel'>) {
  return `${row.periodStart ?? ''}|${row.frequency}|${row.periodLabel}`
}

type PeriodOption = {
  key: string
  label: string
  paymentDate: string | null
  taxYearCode: string
  frequency: string
  frequencyLabel: string
}

export default function UkPayrollPayslipsPage() {
  const { locationId } = useGlobalLocationScope()
  const { formatDate } = useOrganisationDisplayFormat()
  const { data = [], isLoading, isError } = useUkPayrollPayslips(locationId)

  const [query, setQuery] = React.useState('')
  const [taxYear, setTaxYear] = React.useState('all')
  const [period, setPeriod] = React.useState('all')
  const [frequency, setFrequency] = React.useState('all')
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null)
  const [didInitPeriod, setDidInitPeriod] = React.useState(false)

  const taxYearOptions = React.useMemo(() => {
    const years = [...new Set(data.map((r) => r.taxYearCode).filter(Boolean))]
    return years.sort((a, b) => b.localeCompare(a))
  }, [data])

  const periodOptions = React.useMemo(() => {
    const map = new Map<string, PeriodOption>()
    for (const row of data) {
      const key = periodKey(row)
      if (map.has(key)) continue
      map.set(key, {
        key,
        label: row.periodCaption || row.periodLabel,
        paymentDate: row.paymentDate,
        taxYearCode: row.taxYearCode,
        frequency: row.frequency,
        frequencyLabel: row.frequencyLabel || row.frequency,
      })
    }
    return [...map.values()].sort((a, b) =>
      (b.paymentDate ?? '').localeCompare(a.paymentDate ?? ''),
    )
  }, [data])

  const periodsForTaxYear = React.useMemo(() => {
    if (taxYear === 'all') return periodOptions
    return periodOptions.filter((p) => p.taxYearCode === taxYear)
  }, [periodOptions, taxYear])

  const frequencyOptions = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const row of data) {
      if (!row.frequency) continue
      map.set(row.frequency, row.frequencyLabel || row.frequency)
    }
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [data])

  // Default to the latest pay period so the list is focused; user can switch month/week.
  React.useEffect(() => {
    if (didInitPeriod || periodOptions.length === 0) return
    setPeriod(periodOptions[0]!.key)
    setDidInitPeriod(true)
  }, [didInitPeriod, periodOptions])

  // If tax year filter excludes the selected period, reset period to all/latest in year.
  React.useEffect(() => {
    if (period === 'all') return
    if (!periodsForTaxYear.some((p) => p.key === period)) {
      setPeriod(periodsForTaxYear[0]?.key ?? 'all')
    }
  }, [period, periodsForTaxYear])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return data.filter((row) => {
      if (taxYear !== 'all' && row.taxYearCode !== taxYear) return false
      if (period !== 'all' && periodKey(row) !== period) return false
      if (frequency !== 'all' && row.frequency !== frequency) return false
      if (!q) return true
      const hay = [
        row.displayName,
        row.payrollNumber,
        row.runLabel,
        row.periodLabel,
        row.periodCaption,
        row.taxYearCode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [data, query, taxYear, period, frequency])

  const selectedPeriodLabel =
    period === 'all'
      ? 'All periods'
      : (periodsForTaxYear.find((p) => p.key === period)?.label ?? 'Selected period')

  const hasActiveFilters =
    taxYear !== 'all' || period !== 'all' || frequency !== 'all' || query.trim().length > 0

  const totalNet = filtered.reduce((s, r) => s + r.netPay, 0)

  const clearFilters = () => {
    setQuery('')
    setTaxYear('all')
    setFrequency('all')
    setPeriod(periodOptions[0]?.key ?? 'all')
  }

  const handleDownload = async (runEmployeeId: string, displayName: string) => {
    setDownloadingId(runEmployeeId)
    try {
      const { blob, filename } = await downloadUkPayrollPayslipPdf(runEmployeeId)
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
      setDownloadingId(null)
    }
  }

  const selectClass = cn(
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  )

  return (
    <PayrollSectionLayout
      title="Payslips"
      description="Filter by tax year and pay period (month or week), then download itemised pay statements for closed UK payroll runs."
      testId="payroll-payslips-page"
      guidance={{
        title: 'Payslips',
        purpose:
          'Give each worker a written itemised pay statement on or before payday: gross, deductions with purpose, net, and hours when pay varies by time worked.',
        flow: [
          'Close a UK payroll run after tax & NI calculation.',
          'Open Payslips — pick Tax year, then Pay period (month/week) to find the right slips.',
          'Download the PDF and give it to the worker (print or electronic).',
          'Student loans and pensions are not on the slip until those engines ship.',
        ],
      }}
    >
      <div className="space-y-5">
        {!isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard
              label="Showing"
              value={String(filtered.length)}
              icon={<FileText className="h-5 w-5" aria-hidden />}
              tone="emerald"
              tooltip="Payslips matching the filters below"
            />
            <StatCard
              label="All closed-run slips"
              value={String(data.length)}
              icon={<Filter className="h-5 w-5" aria-hidden />}
              tone="sky"
              tooltip="Total downloadable payslips from closed runs (before filters)"
            />
            <StatCard
              label="Net pay (showing)"
              value={formatGbp(totalNet)}
              icon={<FileText className="h-5 w-5" aria-hidden />}
              tone="violet"
              tooltip="Sum of net pay for the filtered rows"
            />
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="space-y-4 border-b border-border bg-muted/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <FileText className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Find a payslip</p>
                  <p className="text-xs text-muted-foreground">
                    Choose another month or week in <span className="font-medium text-foreground">Pay period</span>
                    {' — '}currently showing{' '}
                    <span className="font-medium text-foreground">{selectedPeriodLabel}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={!hasActiveFilters}
                  onClick={clearFilters}
                  data-testid="payroll-payslips-clear-filters"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Reset filters
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to={PAYROLL_PATHS.runs}>UK payroll runs</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label htmlFor="payslip-tax-year" className="text-xs font-medium text-foreground">
                  Tax year
                </label>
                <select
                  id="payslip-tax-year"
                  className={selectClass}
                  value={taxYear}
                  onChange={(e) => setTaxYear(e.target.value)}
                  data-testid="payroll-payslips-tax-year"
                >
                  <option value="all">All tax years</option>
                  {taxYearOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="payslip-period" className="text-xs font-medium text-foreground">
                  Pay period (month / week)
                </label>
                <select
                  id="payslip-period"
                  className={selectClass}
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  data-testid="payroll-payslips-period"
                >
                  <option value="all">All periods</option>
                  {periodsForTaxYear.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                      {p.paymentDate ? ` · pay date ${formatDate(p.paymentDate)}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="payslip-frequency" className="text-xs font-medium text-foreground">
                  Frequency
                </label>
                <select
                  id="payslip-frequency"
                  className={selectClass}
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  data-testid="payroll-payslips-frequency"
                >
                  <option value="all">All frequencies</option>
                  {frequencyOptions.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="payslip-search" className="text-xs font-medium text-foreground">
                  Search employee
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="payslip-search"
                    className="pl-9"
                    placeholder="Name or payroll no.…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    data-testid="payroll-payslips-search"
                  />
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading payslips…</p>
          ) : isError ? (
            <p className="px-4 py-10 text-center text-sm text-destructive">Could not load payslips.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead className="border-b border-border bg-muted/10 text-muted-foreground">
                  <tr>
                    <th className="py-2.5 pl-4 pr-3 font-medium">Employee</th>
                    <th className="py-2.5 pr-3 font-medium">Period</th>
                    <th className="py-2.5 pr-3 font-medium">Pay date</th>
                    <th className="py-2.5 pr-3 font-medium">Bank payment</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Gross</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Tax</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Emp NI</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Student loan</th>
                    <th className="py-2.5 pr-3 text-right font-medium">PG loan</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Pension (employee)</th>
                    <th className="py-2.5 pr-3 text-right font-medium">Net</th>
                    <th className="py-2.5 pr-4 text-right font-medium">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.runEmployeeId}
                      className="border-b border-border/70 transition-colors hover:bg-muted/20"
                    >
                      <td className="py-3 pl-4 pr-3">
                        <div className="font-medium text-foreground">{row.displayName}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {row.payrollNumber ?? 'No payroll no.'}
                          {row.taxCodeApplied
                            ? ` · ${row.taxCodeApplied}${row.niCategoryApplied ? ` · NI ${row.niCategoryApplied}` : ''}`
                            : ''}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-foreground">
                          {row.periodCaption || row.periodLabel}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                            {row.frequencyLabel || row.frequency}
                          </span>
                          <Link
                            to={PAYROLL_PATHS.runDetail(row.ukPayrollRunId)}
                            className="underline-offset-2 hover:underline"
                          >
                            {row.runLabel}
                          </Link>
                          <span>· {row.taxYearCode}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 tabular-nums text-muted-foreground">
                        {row.paymentDate ? formatDate(row.paymentDate) : '—'}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge
                          variant="secondary"
                          className={cn(bankStatusBadgeClass(row.bankStatus))}
                          title={row.bankStatusLabel}
                        >
                          {bankStatusShortLabel(row)}
                        </Badge>
                        {row.bankStatus === 'PAID' && row.bankPaidAt ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatDate(row.bankPaidAt.slice(0, 10))}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">
                        {formatGbp(row.totalGross)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">
                        {formatGbp(row.incomeTax)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums">
                        {formatGbp(row.employeeNi)}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums" data-testid={`payslip-student-loan-${row.runEmployeeId}`}>
                        {row.studentLoanPlanApplied == null ? (
                          <Unavailable />
                        ) : row.studentLoanPlanApplied === 'NONE' ? (
                          '—'
                        ) : (
                          <>
                            {formatGbp(row.studentLoanDeduction ?? 0)}
                            <div className="text-xs text-muted-foreground">Plan {row.studentLoanPlanApplied}</div>
                          </>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums" data-testid={`payslip-pg-loan-${row.runEmployeeId}`}>
                        {row.postgraduateLoanApplied == null ? <Unavailable /> : row.postgraduateLoanApplied ? formatGbp(row.postgraduateLoanDeduction ?? 0) : '—'}
                      </td>
                      <td className="py-3 pr-3 text-right tabular-nums" data-testid={`payslip-pension-${row.runEmployeeId}`}>
                        {row.pensionApplied == null ? (
                          <Unavailable />
                        ) : row.pensionApplied ? (
                          <>
                            {formatGbp(row.pensionEmployeeNet ?? 0)}
                            <div className="text-xs text-muted-foreground">
                              Employer-paid {formatGbp(row.pensionEmployer ?? 0)} (not deducted)
                            </div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">
                        {formatGbp(row.netPay)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={downloadingId === row.runEmployeeId}
                          onClick={() => void handleDownload(row.runEmployeeId, row.displayName)}
                          data-testid={`payroll-payslip-row-download-${row.runEmployeeId}`}
                        >
                          {downloadingId === row.runEmployeeId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : (
                            <FileText className="h-3.5 w-3.5" aria-hidden />
                          )}
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                        <FileText
                          className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40"
                          aria-hidden
                        />
                        {data.length === 0
                          ? 'No payslips yet. Close a UK payroll run after tax & NI to unlock downloads.'
                          : 'No payslips match these filters. Change Pay period to another month/week, or reset filters.'}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PayrollSectionLayout>
  )
}
