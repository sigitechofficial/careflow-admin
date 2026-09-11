import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  PaymentMatchStatus,
  PaymentRecordStatus,
  PaymentType,
} from '@/features/billing/types/billing.types'

export type PaymentRow = {
  id: string
  reference: string
  type: string
  amount: string
  received: string
  matched: string
  unmatched: string
  status: string
  recordStatus: PaymentRecordStatus
  matchStatus: PaymentMatchStatus
}

export type PaymentAllocationRow = {
  id: string
  invoiceRunId: string
  period: string
  amount: string
  notes: string | null
}

export type PaymentDetail = PaymentRow & {
  notes: string | null
  funderId: string | null
  allocations: PaymentAllocationRow[]
}

export type AgedDebtBucket = {
  bucket: string
  count: number
  amount: string
}

export type PaymentsSummary = {
  unmatchedPayments: number
  overdueInvoices: number
  overdueAmount: string
  agedDebt: AgedDebtBucket[]
}

export type OutstandingInvoiceRun = {
  id: string
  period: string
  netTotal: string
  paidAmount: string
  outstanding: string
  dueDate: string
}

export type PaymentAllocationInput = {
  invoiceRunId: string
  amount: number
  notes?: string
}

export async function fetchPayments(params?: { locationId?: string }): Promise<PaymentRow[]> {
  const qs = new URLSearchParams()
  if (params?.locationId) qs.set('locationId', params.locationId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<PaymentRow[]>>(`/billing/payments${suffix}`, {
    method: 'GET',
  })
  return res.data
}

export async function fetchPayment(id: string): Promise<PaymentDetail> {
  const res = await apiJson<ApiEnvelope<PaymentDetail>>(`/billing/payments/${id}`, { method: 'GET' })
  return res.data
}

export async function fetchPaymentsSummary(): Promise<PaymentsSummary> {
  const res = await apiJson<ApiEnvelope<PaymentsSummary>>('/billing/payments/summary', {
    method: 'GET',
  })
  return res.data
}

export async function fetchAgedDebt(): Promise<AgedDebtBucket[]> {
  const res = await apiJson<ApiEnvelope<AgedDebtBucket[]>>('/billing/payments/aged-debt', {
    method: 'GET',
  })
  return res.data
}

export async function fetchOutstandingInvoiceRuns(
  locationId?: string,
): Promise<OutstandingInvoiceRun[]> {
  const qs = locationId ? `?locationId=${encodeURIComponent(locationId)}` : ''
  const res = await apiJson<ApiEnvelope<OutstandingInvoiceRun[]>>(
    `/billing/payments/outstanding-invoices${qs}`,
    { method: 'GET' },
  )
  return res.data
}

export async function createPayment(body: {
  reference: string
  paymentType: PaymentType
  amount: number
  receivedDate?: string
  recordStatus?: PaymentRecordStatus
  funderId?: string
  serviceUserId?: string
  notes?: string
  allocations?: PaymentAllocationInput[]
}): Promise<PaymentRow> {
  const res = await apiJson<ApiEnvelope<PaymentRow>>('/billing/payments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function addPaymentAllocation(
  paymentId: string,
  body: PaymentAllocationInput,
): Promise<PaymentRow> {
  const res = await apiJson<ApiEnvelope<PaymentRow>>(`/billing/payments/${paymentId}/allocations`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function removePaymentAllocation(paymentId: string, allocationId: string): Promise<void> {
  await apiJson(`/billing/payments/${paymentId}/allocations/${allocationId}`, { method: 'DELETE' })
}
