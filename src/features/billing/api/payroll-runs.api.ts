import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { PayrollRunStatus } from '@/features/billing/types/billing.types'

export type PayrollRunRow = {
  id: string
  period: string
  periodStart: string
  periodEnd: string
  status: PayrollRunStatus
  carers: number
  visitLines: number
  grossPay: string
  nmwTopUp: string
  exceptions: number
}

export type PayrollRunsSummary = {
  payrollDrafts: number
}

export type PayrollRunLineDetail = {
  id: string
  lineType:
    | 'VISIT_PAY'
    | 'MILEAGE'
    | 'TRAVEL_TIME'
    | 'WAITING_TIME'
    | 'NMW_TOP_UP'
    | 'ADJUSTMENT'
    | 'OVERTIME'
    | 'ON_CALL_STANDBY'
    | 'NON_VISIT_ACTIVITY'
    | 'HOLIDAY_PAY'
    | 'SICK_PAY'
    | 'BONUS'
    | 'LIVE_IN'
    | 'GUARANTEED_HOURS'
    | 'CANCELLATION'
    | (string & {})
  visitRef: string | null
  employeeId: string | null
  carerName: string
  serviceUserName: string
  payableTime: string
  hoursLabel: string | null
  minutes: number
  unitRate: string | null
  formula: string | null
  amount: string
  description: string
  exceptionMessage: string | null
}

export type PayrollRunCarerSummary = {
  employeeId: string
  carerName: string
  visitCount: number
  totalMinutes: number
  totalHours: string
  grossPay: string
}

/** A minimum wage assessment of the run that needs a person (Sprint B3). */
export type PayrollRunNmwException = {
  employeeId: string
  periodStart: string
  periodEnd: string
  periodSource: string
  issue: string
  message: string | null
  compliant: boolean | null
}

export type PayrollRunDetail = PayrollRunRow & {
  notes: string | null
  carerSummaries: PayrollRunCarerSummary[]
  lines: PayrollRunLineDetail[]
  nmwExceptions?: PayrollRunNmwException[]
}

export async function fetchPayrollRuns(params?: {
  locationId?: string
}): Promise<PayrollRunRow[]> {
  const qs = new URLSearchParams()
  if (params?.locationId) qs.set('locationId', params.locationId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<PayrollRunRow[]>>(
    `/billing/payroll-runs${suffix}`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchPayrollRunsSummary(locationId?: string): Promise<PayrollRunsSummary> {
  const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ''
  const res = await apiJson<ApiEnvelope<PayrollRunsSummary>>(
    `/billing/payroll-runs/summary${qs}`,
    {
      method: 'GET',
    },
  )
  return res.data
}

export async function fetchPayrollRun(id: string): Promise<PayrollRunDetail> {
  const res = await apiJson<ApiEnvelope<PayrollRunDetail>>(`/billing/payroll-runs/${id}`, {
    method: 'GET',
  })
  return res.data
}

export async function createPayrollRun(body: {
  periodStart: string
  periodEnd: string
  notes?: string
}): Promise<PayrollRunRow> {
  const res = await apiJson<ApiEnvelope<PayrollRunRow>>('/billing/payroll-runs', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

/** Returns how many approved visits were left out because another pay run already holds them. */
export async function calculatePayrollRun(id: string): Promise<{ heldByOtherRuns: number }> {
  const res = await apiJson<ApiEnvelope<{ heldByOtherRuns?: number }>>(
    `/billing/payroll-runs/${id}/calculate`,
    { method: 'POST' },
  )
  return { heldByOtherRuns: res.data?.heldByOtherRuns ?? 0 }
}

/** Remove a run that has not been locked; its visits become available to other runs. */
export async function discardPayrollRun(id: string): Promise<void> {
  await apiJson(`/billing/payroll-runs/${id}`, { method: 'DELETE' })
}

export async function approvePayrollRun(id: string): Promise<void> {
  await apiJson(`/billing/payroll-runs/${id}/approve`, { method: 'POST' })
}

export async function lockPayrollRun(id: string): Promise<void> {
  await apiJson(`/billing/payroll-runs/${id}/lock`, { method: 'POST' })
}

function parseContentDispositionFilename(header: string | null, fallback: string): string {
  if (!header) return fallback
  const match = /filename="([^"]+)"/i.exec(header)
  return match?.[1] ?? fallback
}

function triggerCsvDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

async function downloadPayrollRunCsvFile(
  id: string,
  method: 'GET' | 'POST',
): Promise<{ blob: Blob; filename: string }> {
  const { getApiBaseUrl } = await import('@/shared/lib/api-base')
  const { useAuthStore } = await import('@/features/auth/store')
  const base = getApiBaseUrl()
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${base}/billing/payroll-runs/${id}/export`, {
    method,
    headers,
  })

  if (!res.ok) {
    const text = await res.text()
    let message = text || `Payroll export failed (${res.status})`
    try {
      const json = JSON.parse(text) as { message?: string; errors?: string[] }
      if (json.errors?.length) message = json.errors.join('; ')
      else if (json.message) message = json.message
    } catch {
      /* plain text body */
    }
    throw new Error(message)
  }

  const fallback = `payroll-run-${id}.csv`
  const filename = parseContentDispositionFilename(res.headers.get('Content-Disposition'), fallback)
  return { blob: await res.blob(), filename }
}

/** Download CSV and mark the run as exported (locked runs only). */
export async function exportPayrollRun(id: string): Promise<void> {
  const { blob, filename } = await downloadPayrollRunCsvFile(id, 'POST')
  triggerCsvDownload(blob, filename)
}

/** Re-download CSV for an already-exported run. */
export async function downloadPayrollRunCsv(id: string): Promise<void> {
  const { blob, filename } = await downloadPayrollRunCsvFile(id, 'GET')
  triggerCsvDownload(blob, filename)
}

export type EmployeeEarningVisitRow = {
  id: string
  visitRef: string
  serviceUserName: string
  plannedStart: string
  plannedEnd: string | null
  plannedTime: string | null
  actualStart?: string | null
  actualEnd?: string | null
  actualTime?: string | null
  approvedPayStart: string | null
  approvedPayEnd: string | null
  approvedPayTime: string | null
  payableAmount: string
  payableAmountValue?: number
  payableMinutes: number | null
  payableHours: string | null
  status: string
  paymentState:
    | 'PAID'
    | 'REMAINING'
    | 'PENDING'
    | 'REJECTED'
    | 'BANK_PAID'
    | 'IN_UK_PAYROLL'
  /** Where the pay has reached; the server's wording is in `earningStageLabel`. */
  earningStage?:
    | 'RECORDED'
    | 'RECONCILED'
    | 'APPROVED'
    | 'REJECTED'
    | 'IN_DRAFT_PAY_RUN'
    | 'IN_LOCKED_PAY_RUN'
    | 'IN_OPEN_UK_RUN'
    | 'IN_CLOSED_UK_RUN'
    | 'PAYMENT_PREPARED'
    | 'PAYMENT_APPROVED'
    | 'PAYMENT_RECORDED'
  earningStageLabel?: string
  earningPhase?: 'NOT_PAYABLE' | 'EARNED' | 'PAYROLL_PROCESSED' | 'PAYMENT_PREPARED' | 'PAYMENT_RECORDED'
  correctionState?: 'NONE' | 'PENDING_APPROVAL' | 'ADJUSTED'
  correctionAdjustmentValue?: number
  /** In a locked visit pay run or a closed UK run: changed only through a pay correction. */
  paySettled?: boolean
  paid: boolean
  countsTowardSalary?: boolean
  payrollRunId: string | null
  payrollPeriod: string | null
  payrollRunStatus: string | null
  ukPayrollRunId?: string | null
  ukPayrollRunLabel?: string | null
}

export type EmployeeSalaryDeductionRow = {
  id: string
  type: 'FINE' | 'PENALTY'
  amount: string
  amountValue: number
  reason: string
  notes: string | null
  salaryMonth: string
  createdAt: string
}

export type EmployeeEarningsSummary = {
  employeeId: string
  dateFrom: string | null
  dateTo: string | null
  organisationTimezone?: string
  currency: string
  /** Gross from accepted visits before fines/penalties. */
  salaryAmount?: string
  salaryAmountValue?: number
  salaryVisitCount?: number
  netSalaryAmount?: string
  netSalaryAmountValue?: number
  fineTotal?: string
  fineTotalValue?: number
  penaltyTotal?: string
  penaltyTotalValue?: number
  deductionsTotal?: string
  deductionsTotalValue?: number
  deductions?: EmployeeSalaryDeductionRow[]
  totalEarned: string
  totalEarnedAmount: number
  paidVisitCount: number
  remainingVisitCount: number
  remainingAmount: string
  remainingAmountValue: number
  pendingReviewCount: number
  /** Bank payout of UK net (PAID batches) — not visit-pay run. */
  paidOutAmount?: string
  paidOutAmountValue?: number
  outstandingPayoutAmount?: string
  outstandingPayoutAmountValue?: number
  ukNetPayAmount?: string
  ukNetPayAmountValue?: number
  hasEligibleUkRun?: boolean
  visits: EmployeeEarningVisitRow[]
}

export async function fetchEmployeeEarnings(
  employeeId: string,
  params?: { dateFrom?: string; dateTo?: string },
): Promise<EmployeeEarningsSummary> {
  const qs = new URLSearchParams()
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params?.dateTo) qs.set('dateTo', params.dateTo)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<EmployeeEarningsSummary>>(
    `/billing/payroll-runs/employee/${employeeId}/earnings${suffix}`,
    { method: 'GET' },
  )
  return res.data
}

export type EmployeeSalaryOverviewRow = {
  employeeId: string
  employeeName: string
  employeeNumber: string | null
  isActive: boolean
  salaryAmount: string
  salaryAmountValue: number
  salaryVisitCount: number
  paidAmount: string
  paidAmountValue: number
  paidLineCount: number
  remainingAmount: string
  remainingAmountValue: number
  remainingVisitCount: number
  rejectedAmount: string
  rejectedAmountValue: number
  rejectedVisitCount: number
  pendingReviewCount: number
  fineTotal: string
  fineTotalValue: number
  penaltyTotal: string
  penaltyTotalValue: number
  deductionsTotal: string
  deductionsTotalValue: number
  netSalaryAmount: string
  netSalaryAmountValue: number
  ukNetPayAmount?: string
  ukNetPayAmountValue?: number
  hasEligibleUkRun?: boolean
  paidOutAmount: string
  paidOutAmountValue: number
  outstandingPayoutAmount: string
  outstandingPayoutAmountValue: number
}

export type EmployeeSalariesOverview = {
  dateFrom: string | null
  dateTo: string | null
  periodKey: string | null
  hasEligibleUkRun?: boolean
  currency: string
  employeeCount: number
  rows: EmployeeSalaryOverviewRow[]
}

export async function fetchEmployeeSalaries(
  params?: { dateFrom?: string; dateTo?: string; locationId?: string },
): Promise<EmployeeSalariesOverview> {
  const qs = new URLSearchParams()
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params?.dateTo) qs.set('dateTo', params.dateTo)
  if (params?.locationId) qs.set('locationId', params.locationId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<EmployeeSalariesOverview>>(
    `/billing/payroll-runs/employee-salaries${suffix}`,
    { method: 'GET' },
  )
  return res.data
}

export async function createEmployeeSalaryDeduction(
  employeeId: string,
  body: {
    type: 'FINE' | 'PENALTY'
    amount: number
    reason: string
    notes?: string
    salaryMonth: string
  },
): Promise<EmployeeSalaryDeductionRow> {
  const res = await apiJson<ApiEnvelope<EmployeeSalaryDeductionRow>>(
    `/billing/payroll-runs/employee/${employeeId}/salary-deductions`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteEmployeeSalaryDeduction(
  employeeId: string,
  deductionId: string,
): Promise<void> {
  await apiJson(`/billing/payroll-runs/employee/${employeeId}/salary-deductions/${deductionId}`, {
    method: 'DELETE',
  })
}

export type ResetEmployeeEarningsResult = {
  deletedPayoutLines: number
  deletedPayoutBatches: number
  updatedPayoutBatches: number
  clearedDeductions: number
  zeroedReadyVisits: number
  removedUkRunEmployees: number
  updatedUkRuns: number
}

/** Test/ops: wipe Bank paid, ready visit pay, UK net / Outstanding for this employee. */
export async function resetEmployeeEarnings(
  employeeId: string,
): Promise<ResetEmployeeEarningsResult> {
  const res = await apiJson<ApiEnvelope<ResetEmployeeEarningsResult>>(
    `/billing/payroll-runs/employee/${employeeId}/reset-earnings`,
    { method: 'POST' },
  )
  return res.data
}
