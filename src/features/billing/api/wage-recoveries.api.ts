import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type WageRecoveryStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'WITHDRAWN'

export const WAGE_RECOVERY_STATUS_LABELS: Record<WageRecoveryStatus, string> = {
  PROPOSED: 'Awaiting decision',
  APPROVED: 'Authorised',
  REJECTED: 'Rejected (written off)',
  APPLIED: 'Deducted',
  WITHDRAWN: 'Withdrawn',
}

export const WAGE_RECOVERY_KIND_LABELS: Record<string, string> = {
  SALARY: 'Salary overpaid',
  GUARANTEED_HOURS: 'Guaranteed-hours top-up overpaid',
  NMW_TOP_UP: 'Minimum wage top-up overpaid',
  OVERTIME: 'Overtime overpaid',
}

/** What the authoriser relied on. Recording it is not proof that the deduction is lawful. */
export const RECOVERY_AUTHORITY_TYPES: Array<{ value: string; label: string }> = [
  { value: 'CONTRACT_TERM', label: 'Term of the employment contract' },
  { value: 'WRITTEN_AGREEMENT', label: 'Written agreement signed by the worker beforehand' },
  { value: 'STATUTORY_PROVISION', label: 'Statutory provision' },
  { value: 'OTHER', label: 'Other authority' },
]

export type WageRecovery = {
  id: string
  employeeId: string
  employeeName: string
  kind: string
  /** The original payment, what is now due, and the difference proposed for recovery. */
  paidAmount: number | null
  dueAmount: number | null
  amount: number
  reason: string
  originalReference: string | null
  status: WageRecoveryStatus
  authorityBasis: string | null
  decisionNote: string | null
  proposedAt: string
  proposedById: string | null
  proposedByName: string | null
  proposedInRun: string | null
  decidedById: string | null
  decidedByName: string | null
  decidedAt: string | null
  appliedInRunId: string | null
  appliedInRun: string | null
  appliedAt: string | null
}

export type WageRecoveryEvent = { at: string; event: string; by: string | null; detail: string }
export type WageRecoveryDetail = WageRecovery & { history: WageRecoveryEvent[] }

export type WageRecoveryPolicy = {
  inForce: boolean
  reference: string | null
  recordedAt: string | null
  recordedByName: string | null
}

type Done = { message: string }

export async function fetchWageRecoveries(status?: string): Promise<WageRecovery[]> {
  const res = await apiJson<ApiEnvelope<WageRecovery[]>>(`/billing/wage-recoveries${status ? `?status=${status}` : ''}`, { method: 'GET' })
  return res.data
}
export async function fetchWageRecovery(id: string): Promise<WageRecoveryDetail> {
  const res = await apiJson<ApiEnvelope<WageRecoveryDetail>>(`/billing/wage-recoveries/${id}`, { method: 'GET' })
  return res.data
}
export async function fetchWageRecoveryPolicy(): Promise<WageRecoveryPolicy> {
  const res = await apiJson<ApiEnvelope<WageRecoveryPolicy>>('/billing/wage-recoveries/policy', { method: 'GET' })
  return res.data
}
export async function approveWageRecovery(id: string, authorityBasis: string, reason: string): Promise<Done> {
  return apiJson<Done>(`/billing/wage-recoveries/${id}/approve`, { method: 'POST', body: JSON.stringify({ authorityBasis, reason }) })
}
export async function rejectWageRecovery(id: string, note: string): Promise<Done> {
  return apiJson<Done>(`/billing/wage-recoveries/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) })
}
export async function recordWageRecoveryPolicy(reference: string): Promise<Done> {
  return apiJson<Done>('/billing/wage-recoveries/policy', { method: 'POST', body: JSON.stringify({ reference }) })
}
export async function withdrawWageRecoveryPolicy(note: string): Promise<Done> {
  return apiJson<Done>('/billing/wage-recoveries/policy/withdraw', { method: 'POST', body: JSON.stringify({ note }) })
}
