import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  PayCard,
  PayCardAssignedCarer,
  PayCardInput,
  PayCardRule,
  PayCardAssignmentPreview,
  PayCardResolveResult,
  PayCardVersionHistoryItem,
  EmployeePayCardHistory,
  ChangeEmployeePayCardInput,
  ChangeEmployeePayCardResult,
  EmployeeFunderPayAssignment,
  EmployeeFunderPayAssignmentInput,
} from '@/features/billing/types/billing-cards.types'

type PayCardApiRow = PayCard & {
  _count?: { defaultEmployments?: number }
  defaultEmployments?: Array<{
    employeeId: string
    employeeNumber?: string | null
    employee?: {
      id: string
      personalDetail?: { firstName?: string | null; lastName?: string | null } | null
    } | null
  }>
}

function formatCarerName(
  personalDetail?: { firstName?: string | null; lastName?: string | null } | null,
  fallbackId?: string,
): string {
  const name = [personalDetail?.firstName, personalDetail?.lastName]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(' ')
  return name || fallbackId || 'Unknown carer'
}

function mapAssignedCarers(card: PayCardApiRow): PayCardAssignedCarer[] {
  return (card.defaultEmployments ?? []).map(row => ({
    employeeId: row.employeeId || row.employee?.id || '',
    fullName: formatCarerName(row.employee?.personalDetail, row.employeeId),
    employeeNumber: row.employeeNumber ?? null,
  })).filter(row => row.employeeId)
}

function normalizePayCard(card: PayCardApiRow): PayCard {
  const { _count, defaultEmployments: _defaultEmployments, ...rest } = card
  return {
    ...rest,
    assignedCarerCount: _count?.defaultEmployments,
    assignedCarers: mapAssignedCarers(card),
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
  locationId?: string
}): Promise<PayCard[]> {
  const qs = new URLSearchParams()
  if (params?.search?.trim()) qs.set('search', params.search.trim())
  if (params?.status) qs.set('status', params.status)
  if (params?.locationId) qs.set('locationId', params.locationId)
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

export async function fetchPayCardVersions(id: string): Promise<PayCardVersionHistoryItem[]> {
  const res = await apiJson<ApiEnvelope<PayCardVersionHistoryItem[]>>(
    `/billing/pay-cards/${id}/versions`,
    { method: 'GET' },
  )
  return res.data.map(v => ({ ...v, rules: v.rules.map(normalizePayRule) }))
}

export async function fetchEmployeePayCardHistory(employeeId: string): Promise<EmployeePayCardHistory> {
  const res = await apiJson<ApiEnvelope<EmployeePayCardHistory>>(
    `/billing/pay-cards/employee-history/${employeeId}`,
    { method: 'GET' },
  )
  return res.data
}

export async function changeEmployeePayCard(
  employeeId: string,
  body: ChangeEmployeePayCardInput,
): Promise<ChangeEmployeePayCardResult> {
  const res = await apiJson<ApiEnvelope<ChangeEmployeePayCardResult>>(
    `/billing/pay-cards/employee-history/${employeeId}/change`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
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

export async function unassignPayCardEmployee(
  id: string,
  employeeId: string,
): Promise<{ employeeId: string }> {
  const res = await apiJson<ApiEnvelope<{ employeeId: string }>>(
    `/billing/pay-cards/${id}/unassign`,
    {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    },
  )
  return res.data
}

export async function resolveEmployeePayCard(
  employeeId: string,
  options?: { funderId?: string | null },
): Promise<PayCardResolveResult> {
  const qs = new URLSearchParams()
  if (options?.funderId?.trim()) qs.set('funderId', options.funderId.trim())
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<ApiEnvelope<PayCardResolveResult>>(
    `/billing/pay-cards/resolve/${employeeId}${suffix}`,
    { method: 'GET' },
  )
  return {
    ...res.data,
    payCard: res.data.payCard ? normalizePayCard(res.data.payCard) : null,
  }
}

export async function fetchEmployeeFunderPayAssignments(
  employeeId: string,
): Promise<EmployeeFunderPayAssignment[]> {
  const res = await apiJson<ApiEnvelope<EmployeeFunderPayAssignment[]>>(
    `/billing/pay-cards/employee-funder-assignments/${employeeId}`,
    { method: 'GET' },
  )
  return res.data.map(row => ({
    ...row,
    payCard: normalizePayCard(row.payCard as PayCard & { _count?: { defaultEmployments?: number } }),
  }))
}

export async function upsertEmployeeFunderPayAssignment(
  body: EmployeeFunderPayAssignmentInput,
): Promise<EmployeeFunderPayAssignment> {
  const res = await apiJson<ApiEnvelope<EmployeeFunderPayAssignment>>(
    '/billing/pay-cards/employee-funder-assignments',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
  return {
    ...res.data,
    payCard: normalizePayCard(res.data.payCard as PayCard & { _count?: { defaultEmployments?: number } }),
  }
}

export async function deleteEmployeeFunderPayAssignment(id: string): Promise<void> {
  await apiJson(`/billing/pay-cards/employee-funder-assignments/${id}`, { method: 'DELETE' })
}
