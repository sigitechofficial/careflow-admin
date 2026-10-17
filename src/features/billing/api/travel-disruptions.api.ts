import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type TravelCategory =
  | 'BETWEEN_SERVICE_USERS'
  | 'REQUIRED_WAITING'
  | 'REST_BREAK'
  | 'ORDINARY_COMMUTE'
  | 'TRAINING_JOURNEY'
  | 'CANCELLED_VISIT_JOURNEY'
  | 'OTHER'
export type TravelEvidence = 'ESTIMATED' | 'RECORDED' | 'VERIFIED'

export const TRAVEL_CATEGORY_LABELS: Record<TravelCategory, string> = {
  BETWEEN_SERVICE_USERS: 'Travel between service users',
  REQUIRED_WAITING: 'Required waiting',
  REST_BREAK: 'Rest break (not paid)',
  ORDINARY_COMMUTE: 'Ordinary commute (not paid)',
  TRAINING_JOURNEY: 'Training journey',
  CANCELLED_VISIT_JOURNEY: 'Journey to a cancelled visit',
  OTHER: 'Other',
}
/** Categories that are paid only when the person approving says so (employer policy). */
export const TRAVEL_POLICY_CATEGORIES: TravelCategory[] = ['TRAINING_JOURNEY', 'CANCELLED_VISIT_JOURNEY', 'OTHER']

export type TravelInterval = {
  id: string
  category: TravelCategory
  evidence: TravelEvidence
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  startAt: string
  endAt: string
  minutes: number
  paid: boolean
  note: string | null
  decisionNote: string | null
  createdByName: string | null
  decidedByName: string | null
}

export type VisitTravelTime = {
  visit: { id: string; visitRef: string; employeeId: string | null; paySettled: boolean }
  /** What the pay run uses for this visit. */
  basis: 'APPROVED_INTERVALS' | 'RECORDED_ON_VISIT' | 'ESTIMATED_FROM_GAP' | 'NONE'
  /** Travel minutes entered on the visit itself (used when no interval is approved). */
  recordedOnVisitMinutes?: number
  decided: { travelMinutes: number; waitingMinutes: number; notPaidMinutes: number; summary: string } | null
  estimate: {
    fromVisitRef: string
    gapMinutes: number
    classification: string
    travelMinutes: number
    waitingMinutes: number
    needsReview: boolean
  } | null
  intervals: TravelInterval[]
}

export type RecordTravelIntervalInput = {
  toVisitReconciliationId: string
  category: TravelCategory
  evidence: TravelEvidence
  startAt: string
  endAt: string
  payable?: boolean
  note: string
}

export async function fetchVisitTravelTime(visitReconciliationId: string): Promise<VisitTravelTime> {
  const res = await apiJson<ApiEnvelope<VisitTravelTime>>(`/billing/travel-intervals/visit/${visitReconciliationId}`, { method: 'GET' })
  return res.data
}
export async function recordTravelInterval(body: RecordTravelIntervalInput): Promise<{ message: string }> {
  return apiJson<{ message: string }>('/billing/travel-intervals', { method: 'POST', body: JSON.stringify(body) })
}
export async function approveTravelInterval(id: string): Promise<{ message: string }> {
  return apiJson<{ message: string }>(`/billing/travel-intervals/${id}/approve`, { method: 'POST', body: JSON.stringify({}) })
}
export async function rejectTravelInterval(id: string, note: string): Promise<{ message: string }> {
  return apiJson<{ message: string }>(`/billing/travel-intervals/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) })
}

// ---------------------------------------------------------------- visits that do not go ahead as planned (Q13)

export type DisruptionDecision = {
  id: string
  employeeId: string
  scheduledJobId: string | null
  eventType: string
  eventLabel: string
  eventAt: string
  noticeMinutes: number | null
  scheduledMinutes: number | null
  affectedMinutes: number | null
  proposedOutcome: string
  proposedAmount: number | null
  amount: number | null
  status: 'NEEDS_DECISION' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  reason: string
  decisionNote: string | null
}

export type UndecidedCancellation = {
  scheduledJobId: string
  employeeId: string
  jobName: string
  scheduledStart: string
  scheduledMinutes: number | null
  cancelledAt: string
  noticeMinutes: number
  reasonCode: string
}

export type RecordDisruptionInput = {
  employeeId: string
  scheduledJobId?: string
  eventType: string
  eventAt: string
  noticeMinutes?: number | null
  scheduledMinutes?: number | null
  reason: string
}

export async function fetchDisruptionDecisions(status?: string): Promise<DisruptionDecision[]> {
  const res = await apiJson<ApiEnvelope<DisruptionDecision[]>>(`/billing/visit-disruptions${status ? `?status=${status}` : ''}`, { method: 'GET' })
  return res.data
}
export async function fetchUndecidedCancellations(): Promise<UndecidedCancellation[]> {
  const res = await apiJson<ApiEnvelope<UndecidedCancellation[]>>('/billing/visit-disruptions/undecided-cancellations', { method: 'GET' })
  return res.data
}
export async function recordDisruption(body: RecordDisruptionInput): Promise<{ message: string }> {
  return apiJson<{ message: string }>('/billing/visit-disruptions', { method: 'POST', body: JSON.stringify(body) })
}
export async function decideDisruption(id: string, amount: number, note: string): Promise<{ message: string }> {
  return apiJson<{ message: string }>(`/billing/visit-disruptions/${id}/decide`, { method: 'POST', body: JSON.stringify({ amount, note }) })
}
export async function approveDisruption(id: string): Promise<{ message: string }> {
  return apiJson<{ message: string }>(`/billing/visit-disruptions/${id}/approve`, { method: 'POST' })
}
export async function rejectDisruption(id: string, note: string): Promise<{ message: string }> {
  return apiJson<{ message: string }>(`/billing/visit-disruptions/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) })
}
