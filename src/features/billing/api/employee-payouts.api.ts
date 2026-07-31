import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type EmployeePayoutBatchStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED'
export type EmployeePayoutLineStatus = 'PENDING' | 'PAID' | 'SKIPPED'

export type EmployeePayoutBatchRow = {
  id: string
  periodKey: string
  periodStart: string
  periodEnd: string
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
  lines: EmployeePayoutLineRow[]
}

export async function fetchEmployeePayoutBatches(params?: {
  periodKey?: string
}): Promise<EmployeePayoutBatchRow[]> {
  const qs = new URLSearchParams()
  if (params?.periodKey) qs.set('periodKey', params.periodKey)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<EmployeePayoutBatchRow[]>>(
    `/billing/employee-payouts${suffix}`,
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
  periodKey: string
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

export async function markEmployeePayoutBatchPaid(
  id: string,
): Promise<EmployeePayoutBatchDetail> {
  const res = await apiJson<ApiEnvelope<EmployeePayoutBatchDetail>>(
    `/billing/employee-payouts/${id}/mark-paid`,
    { method: 'POST' },
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
