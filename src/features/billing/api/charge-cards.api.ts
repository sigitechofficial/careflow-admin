import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  ChargeCard,
  ChargeCardAssignmentPreview,
  ChargeCardInput,
  ChargeCardResolveResult,
  ChargeCardRule,
} from '@/features/billing/types/billing-cards.types'

function normalizeChargeRule(rule: ChargeCardRule): ChargeCardRule {
  return {
    ...rule,
    amount: Number(rule.amount),
    multiplier: rule.multiplier != null ? Number(rule.multiplier) : null,
  }
}

function normalizeChargeCard(
  card: ChargeCard & {
    _count?: { defaultFunders?: number; defaultServiceUsers?: number; defaultFundings?: number }
  },
): ChargeCard {
  const { _count, ...rest } = card
  const attachedRecordCount =
    (_count?.defaultFunders ?? 0) + (_count?.defaultServiceUsers ?? 0) + (_count?.defaultFundings ?? 0)
  return {
    ...rest,
    attachedRecordCount,
    rules: card.rules.map(normalizeChargeRule),
  }
}

export async function fetchChargeCards(params?: {
  search?: string
  status?: string
}): Promise<ChargeCard[]> {
  const qs = new URLSearchParams()
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  if (params?.status) qs.set('status', params.status)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<ChargeCard[]>>(`/billing/charge-cards${suffix}`, { method: 'GET' })
  return res.data.map(normalizeChargeCard)
}

export async function fetchChargeCard(id: string): Promise<ChargeCard> {
  const res = await apiJson<ApiEnvelope<ChargeCard>>(`/billing/charge-cards/${id}`, { method: 'GET' })
  return normalizeChargeCard(res.data)
}

export async function createChargeCard(body: ChargeCardInput): Promise<ChargeCard> {
  const res = await apiJson<ApiEnvelope<ChargeCard>>('/billing/charge-cards', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return normalizeChargeCard(res.data)
}

export async function updateChargeCard(id: string, body: Partial<ChargeCardInput>): Promise<ChargeCard> {
  const res = await apiJson<ApiEnvelope<ChargeCard>>(`/billing/charge-cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return normalizeChargeCard(res.data)
}

export async function deleteChargeCard(id: string): Promise<void> {
  await apiJson(`/billing/charge-cards/${id}`, { method: 'DELETE' })
}

export async function fetchChargeCardAssignmentPreview(id: string): Promise<ChargeCardAssignmentPreview> {
  const res = await apiJson<ApiEnvelope<ChargeCardAssignmentPreview>>(
    `/billing/charge-cards/${id}/assignment-preview`,
    { method: 'GET' },
  )
  return res.data
}

export async function assignChargeCardToMatching(
  id: string,
  body?: { onlyUnassigned?: boolean },
): Promise<{ assignedCount: number }> {
  const res = await apiJson<ApiEnvelope<{ assignedCount: number }>>(
    `/billing/charge-cards/${id}/assign-matching`,
    {
      method: 'POST',
      body: JSON.stringify(body ?? { onlyUnassigned: true }),
    },
  )
  return res.data
}

export async function resolveServiceUserChargeCard(serviceUserId: string): Promise<ChargeCardResolveResult> {
  const res = await apiJson<ApiEnvelope<ChargeCardResolveResult>>(
    `/billing/charge-cards/resolve/${serviceUserId}`,
    { method: 'GET' },
  )
  return {
    ...res.data,
    chargeCard: res.data.chargeCard ? normalizeChargeCard(res.data.chargeCard) : null,
  }
}
