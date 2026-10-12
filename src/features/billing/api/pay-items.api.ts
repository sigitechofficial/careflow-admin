import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CreatePayItemInput,
  PayItem,
  PayItemSuggestion,
  PayItemUnit,
  PayItemWageType,
  RecordVisitPayCorrectionInput,
  VisitPayCorrectionHistory,
} from '@/features/billing/types/pay-items.types'

export async function fetchPayItems(params?: { status?: string; employeeId?: string; wageTypeCode?: string }): Promise<PayItem[]> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.employeeId) qs.set('employeeId', params.employeeId)
  if (params?.wageTypeCode) qs.set('wageTypeCode', params.wageTypeCode)
  const suffix = qs.toString() ? `?${qs}` : ''
  const res = await apiJson<ApiEnvelope<PayItem[]>>(`/billing/pay-items${suffix}`, { method: 'GET' })
  return res.data
}

export async function fetchPayItemSuggestion(params: {
  employeeId: string
  wageTypeCode: PayItemWageType
  unit: PayItemUnit
  date: string
}): Promise<PayItemSuggestion> {
  const qs = new URLSearchParams(params as Record<string, string>)
  const res = await apiJson<ApiEnvelope<PayItemSuggestion>>(`/billing/pay-items/suggest-rate?${qs}`, { method: 'GET' })
  return res.data
}

export async function createPayItem(body: CreatePayItemInput): Promise<PayItem> {
  const res = await apiJson<ApiEnvelope<PayItem>>('/billing/pay-items', { method: 'POST', body: JSON.stringify(body) })
  return res.data
}

export async function approvePayItem(id: string): Promise<{ message: string }> {
  return apiJson<{ message: string }>(`/billing/pay-items/${id}/approve`, { method: 'POST' })
}

export async function rejectPayItem(id: string, reason: string): Promise<{ message: string }> {
  return apiJson<{ message: string }>(`/billing/pay-items/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function cancelPayItem(id: string): Promise<{ message: string }> {
  return apiJson<{ message: string }>(`/billing/pay-items/${id}/cancel`, { method: 'POST' })
}

export async function fetchVisitPayCorrections(visitReconciliationId: string): Promise<VisitPayCorrectionHistory> {
  const res = await apiJson<ApiEnvelope<VisitPayCorrectionHistory>>(
    `/billing/pay-items/visit-corrections/${visitReconciliationId}`,
    { method: 'GET' },
  )
  return res.data
}

export async function recordVisitPayCorrection(body: RecordVisitPayCorrectionInput): Promise<{ message: string }> {
  return apiJson<{ message: string }>('/billing/pay-items/visit-corrections', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function reversePayItem(id: string, reason: string): Promise<{ message: string }> {
  return apiJson<{ message: string }>(`/billing/pay-items/${id}/reverse`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}
