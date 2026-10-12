import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type EmployeePayoutBatchStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED'
export type EmployeePayoutLineStatus = 'PENDING' | 'PAID' | 'SKIPPED'

export type EmployeePayoutBatchRow = {
  id: string
  periodKey: string
  periodStart: string
  periodEnd: string
  ukPayrollRunId: string | null
  ukPayrollRunLabel: string | null
  ukPayrollRunStatus: string | null
  status: EmployeePayoutBatchStatus
  currency: string
  totalAmount: string
  totalAmountValue: number
  lineCount: number
  createdAt: string
  updatedAt: string
}

export type EmployeePayoutLineRow = {
  id: string
  employeeId: string
  employeeName: string
  employeeNumber: string | null
  ukPayrollRunEmployeeId?: string
  amount: string
  amountValue: number
  status: EmployeePayoutLineStatus
  notes: string | null
}

export type EmployeePayoutBatchDetail = EmployeePayoutBatchRow & {
  notes: string | null
  createdById: string | null
  approvedById: string | null
  approvedAt: string | null
  paidById: string | null
  paidAt: string | null
  /** Settlement evidence recorded when the batch was marked paid. */
  paymentReference?: string | null
  settledOn?: string | null
  settlementEvidence?: string | null
  lines: EmployeePayoutLineRow[]
}

export type SettleEmployeePayoutBatchInput = {
  id: string
  /** Bank or payment provider reference for the batch. */
  paymentReference: string
  /** Date the money left the account (YYYY-MM-DD). */
  settledOn: string
  settlementEvidence?: string
}

export type PayoutEligibleUkRun = {
  id: string
  label: string
  status: string
  totalNetPay: string
  totalNetPayValue: number
  employeeCount: number
  periodLabel: string
  periodStart: string
  periodEnd: string
  periodKey: string
  statutoryCalculatedAt: string | null
}

export async function fetchEmployeePayoutBatches(params?: {
  periodKey?: string
  ukPayrollRunId?: string
  locationId?: string
}): Promise<EmployeePayoutBatchRow[]> {
  const qs = new URLSearchParams()
  if (params?.periodKey) qs.set('periodKey', params.periodKey)
  if (params?.ukPayrollRunId) qs.set('ukPayrollRunId', params.ukPayrollRunId)
  if (params?.locationId) qs.set('locationId', params.locationId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<EmployeePayoutBatchRow[]>>(
    `/billing/employee-payouts${suffix}`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchPayoutEligibleUkRuns(): Promise<PayoutEligibleUkRun[]> {
  const res = await apiJson<ApiEnvelope<PayoutEligibleUkRun[]>>(
    '/billing/employee-payouts/eligible-uk-runs',
    { method: 'GET' },
  )
  return res.data
}

export async function fetchEmployeePayoutBatch(
  id: string,
): Promise<EmployeePayoutBatchDetail> {
  const res = await apiJson<ApiEnvelope<EmployeePayoutBatchDetail>>(
    `/billing/employee-payouts/${id}`,
    { method: 'GET' },
  )
  return res.data
}

export async function createEmployeePayoutBatch(body: {
  ukPayrollRunId: string
  notes?: string
}): Promise<EmployeePayoutBatchDetail> {
  const res = await apiJson<ApiEnvelope<EmployeePayoutBatchDetail>>(
    '/billing/employee-payouts',
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function approveEmployeePayoutBatch(
  id: string,
): Promise<EmployeePayoutBatchDetail> {
  const res = await apiJson<ApiEnvelope<EmployeePayoutBatchDetail>>(
    `/billing/employee-payouts/${id}/approve`,
    { method: 'POST' },
  )
  return res.data
}

export async function markEmployeePayoutBatchPaid({
  id,
  ...evidence
}: SettleEmployeePayoutBatchInput): Promise<EmployeePayoutBatchDetail> {
  const res = await apiJson<ApiEnvelope<EmployeePayoutBatchDetail>>(
    `/billing/employee-payouts/${id}/mark-paid`,
    { method: 'POST', body: JSON.stringify(evidence) },
  )
  return res.data
}

export async function cancelEmployeePayoutBatch(
  id: string,
): Promise<EmployeePayoutBatchDetail> {
  const res = await apiJson<ApiEnvelope<EmployeePayoutBatchDetail>>(
    `/billing/employee-payouts/${id}/cancel`,
    { method: 'POST' },
  )
  return res.data
}

export async function deleteAllEmployeePayoutBatches(params?: {
  periodKey?: string
}): Promise<{ deletedBatches: number }> {
  const qs = new URLSearchParams()
  if (params?.periodKey) qs.set('periodKey', params.periodKey)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<{ deletedBatches: number }>>(
    `/billing/employee-payouts${suffix}`,
    { method: 'DELETE' },
  )
  return res.data
}
