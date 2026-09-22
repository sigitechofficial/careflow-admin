import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type HoursApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type HoursApproval = {
  id: string
  employeeId: string
  employeeName: string
  serviceUserId: string
  serviceUserName: string
  visitPlanId: string
  status: HoursApprovalStatus
  contractedWeeklyHours: number | null
  projectedWeeklyHours: number | null
  extraHours: number | null
  requestedAt: string
  decidedAt: string | null
  decisionNotes: string | null
}

export async function fetchHoursApprovals(
  status?: HoursApprovalStatus,
  init?: RequestInit,
): Promise<HoursApproval[]> {
  const q = status ? `?status=${status}` : ''
  const res = await apiJson<ApiEnvelope<HoursApproval[]>>(`/hours-approvals${q}`, {
    method: 'GET',
    ...init,
  })
  return res.data ?? []
}

export async function approveHours(id: string, notes?: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/hours-approvals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(notes ? { notes } : {}),
  })
}

export async function rejectHours(id: string, notes?: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/hours-approvals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(notes ? { notes } : {}),
  })
}
