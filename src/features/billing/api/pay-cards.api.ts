import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { PayCard, PayCardInput, PayCardRule, PayCardAssignmentPreview, PayCardResolveResult } from '@/features/billing/types/billing-cards.types'

function normalizePayCard(card: PayCard & { _count?: { defaultEmployments?: number } }): PayCard {
  const { _count, ...rest } = card
  return {
    ...rest,
    assignedCarerCount: _count?.defaultEmployments,
    rules: card.rules.map(normalizePayRule),
  }
}

function normalizePayRule(rule: PayCardRule): PayCardRule {
  return {
    ...rule,
    amount: Number(rule.amount),
    multiplier: rule.multiplier != null ? Number(rule.multiplier) : null,
  }
}

export async function fetchPayCards(params?: {
  search?: string
  status?: string
}): Promise<PayCard[]> {
  const qs = new URLSearchParams()
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  if (params?.status) qs.set('status', params.status)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<PayCard[]>>(`/billing/pay-cards${suffix}`, { method: 'GET' })
  return res.data.map(normalizePayCard)
}

export async function fetchPayCard(id: string): Promise<PayCard> {
  const res = await apiJson<ApiEnvelope<PayCard>>(`/billing/pay-cards/${id}`, { method: 'GET' })
  return normalizePayCard(res.data)
}

export async function createPayCard(body: PayCardInput): Promise<PayCard> {
  const res = await apiJson<ApiEnvelope<PayCard>>('/billing/pay-cards', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return normalizePayCard(res.data)
}

export async function updatePayCard(id: string, body: Partial<PayCardInput>): Promise<PayCard> {
  const res = await apiJson<ApiEnvelope<PayCard>>(`/billing/pay-cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return normalizePayCard(res.data)
}

export async function deletePayCard(id: string): Promise<void> {
  await apiJson(`/billing/pay-cards/${id}`, { method: 'DELETE' })
}

export async function fetchPayCardAssignmentPreview(id: string): Promise<PayCardAssignmentPreview> {
  const res = await apiJson<ApiEnvelope<PayCardAssignmentPreview>>(
    `/billing/pay-cards/${id}/assignment-preview`,
    { method: 'GET' },
  )
  return res.data
}

export async function assignPayCardToMatching(
  id: string,
  body?: { onlyUnassigned?: boolean },
): Promise<{ assignedCount: number }> {
  const res = await apiJson<ApiEnvelope<{ assignedCount: number }>>(
    `/billing/pay-cards/${id}/assign-matching`,
    {
      method: 'POST',
      body: JSON.stringify(body ?? { onlyUnassigned: true }),
    },
  )
  return res.data
}

export async function resolveEmployeePayCard(employeeId: string): Promise<PayCardResolveResult> {
  const res = await apiJson<ApiEnvelope<PayCardResolveResult>>(
    `/billing/pay-cards/resolve/${employeeId}`,
    { method: 'GET' },
  )
  return {
    ...res.data,
    payCard: res.data.payCard ? normalizePayCard(res.data.payCard) : null,
  }
}
