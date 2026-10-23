import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  IncidentInvestigatorOption,
  InvestigationRecord,
  UpsertIncidentInvestigationInput,
} from '@/features/incidents/types'

export type FeedbackType = 'COMPLAINT' | 'COMPLIMENT'
export type FeedbackStatus = 'RECEIVED' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESPONDED' | 'CLOSED'
export type FeedbackFromKind = 'SERVICE_USER' | 'FAMILY' | 'PROFESSIONAL' | 'STAFF' | 'PUBLIC' | 'ANONYMOUS'
export type FeedbackChannel = 'PHONE' | 'EMAIL' | 'LETTER' | 'IN_PERSON' | 'PORTAL' | 'SURVEY' | 'OTHER'
export type ComplaintSeverity = 'LOW' | 'MEDIUM' | 'HIGH'
export type ComplaintOutcome = 'UPHELD' | 'PARTIALLY_UPHELD' | 'NOT_UPHELD' | 'WITHDRAWN'
export type FeedbackAction = 'ACKNOWLEDGE' | 'START_INVESTIGATION' | 'RESPOND' | 'CLOSE' | 'REOPEN' | 'SHARE'

export type FeedbackPersonRef = { id: string; name: string }

export type FeedbackRow = {
  id: string
  referenceNumber: string
  type: FeedbackType
  status: FeedbackStatus
  receivedAt: string
  channel: FeedbackChannel
  fromKind: FeedbackFromKind
  fromName: string | null
  fromContact: string | null
  fromServiceUser: FeedbackPersonRef | null
  fromEmployee: FeedbackPersonRef | null
  aboutServiceUser: FeedbackPersonRef | null
  aboutEmployees: FeedbackPersonRef[]
  location: FeedbackPersonRef | null
  subject: string
  details: string
  category: string | null
  severity: ComplaintSeverity | null
  desiredOutcome: string | null
  handler: FeedbackPersonRef | null
  acknowledgeDueAt: string | null
  acknowledgedAt: string | null
  responseDueAt: string | null
  respondedAt: string | null
  investigationNotes: string | null
  responseSummary: string | null
  outcome: ComplaintOutcome | null
  lessonsLearned: string | null
  closedAt: string | null
  sharedWithStaffAt: string | null
  recordedByName: string | null
  acknowledgeOverdue: boolean
  responseOverdue: boolean
  createdAt: string
  updatedAt: string
}

export type FeedbackEvent = {
  id: string
  action: string
  note: string | null
  userName: string | null
  createdAt: string
}

/** Complaint investigation: the same record as an incident investigation. */
export type FeedbackInvestigation = InvestigationRecord & { feedbackId: string }

export type FeedbackDetail = FeedbackRow & {
  events: FeedbackEvent[]
  investigation: FeedbackInvestigation | null
}

export type FeedbackSummary = {
  openComplaints: number
  overdueComplaints: number
  complaintsThisMonth: number
  complimentsThisMonth: number
  complimentsToShare: number
}

export type FeedbackListParams = {
  type?: FeedbackType
  status?: FeedbackStatus | 'OPEN'
  overdue?: boolean
  search?: string
  from?: string
  to?: string
  /** Made by or about this service user. */
  serviceUserId?: string
}

export type FeedbackDetailsPayload = {
  receivedAt: string
  channel: FeedbackChannel
  fromKind: FeedbackFromKind
  fromName?: string
  fromContact?: string
  fromServiceUserId?: string | null
  fromEmployeeId?: string | null
  aboutServiceUserId?: string | null
  aboutEmployeeIds?: string[]
  locationId?: string | null
  subject: string
  details: string
  category?: string
  severity?: ComplaintSeverity | null
  desiredOutcome?: string
  handlerEmployeeId?: string | null
}

export type CreateFeedbackPayload = FeedbackDetailsPayload & { type: FeedbackType }
export type UpdateFeedbackPayload = Partial<FeedbackDetailsPayload> & { investigationNotes?: string }

export type FeedbackTransitionPayload = {
  action: FeedbackAction
  at?: string
  note?: string
  responseSummary?: string
  outcome?: ComplaintOutcome
  lessonsLearned?: string
}

export async function fetchFeedbackList(params: FeedbackListParams): Promise<FeedbackRow[]> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '' || v === false) continue
    qs.set(k, String(v))
  }
  const res = await apiJson<ApiEnvelope<FeedbackRow[]>>(`/feedback${qs.size ? `?${qs}` : ''}`, { method: 'GET' })
  return res.data
}

export async function fetchFeedbackSummary(): Promise<FeedbackSummary> {
  const res = await apiJson<ApiEnvelope<FeedbackSummary>>('/feedback/summary', { method: 'GET' })
  return res.data
}

export async function fetchFeedback(id: string): Promise<FeedbackDetail> {
  const res = await apiJson<ApiEnvelope<FeedbackDetail>>(`/feedback/${id}`, { method: 'GET' })
  return res.data
}

export async function createFeedback(body: CreateFeedbackPayload): Promise<{ id: string; referenceNumber: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string; referenceNumber: string }>>('/feedback', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateFeedback(id: string, body: UpdateFeedbackPayload): Promise<FeedbackDetail> {
  const res = await apiJson<ApiEnvelope<FeedbackDetail>>(`/feedback/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function transitionFeedback(id: string, body: FeedbackTransitionPayload): Promise<FeedbackDetail> {
  const res = await apiJson<ApiEnvelope<FeedbackDetail>>(`/feedback/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function addFeedbackNote(id: string, note: string): Promise<FeedbackDetail> {
  const res = await apiJson<ApiEnvelope<FeedbackDetail>>(`/feedback/${id}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  })
  return res.data
}

export async function upsertFeedbackInvestigation(
  id: string,
  input: UpsertIncidentInvestigationInput,
): Promise<FeedbackDetail> {
  const res = await apiJson<ApiEnvelope<FeedbackDetail>>(`/feedback/${id}/investigation`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

/** Staff who can lead the complaint investigation. */
export async function fetchFeedbackInvestigators(
  id: string,
  opts?: { signal?: AbortSignal },
): Promise<IncidentInvestigatorOption[]> {
  const res = await apiJson<ApiEnvelope<IncidentInvestigatorOption[]>>(`/feedback/${id}/investigators`, {
    signal: opts?.signal,
  })
  return res.data
}

export async function pauseFeedbackInvestigation(
  id: string,
  input: { reason: string; nextReviewDate: string },
): Promise<FeedbackDetail> {
  const res = await apiJson<ApiEnvelope<FeedbackDetail>>(`/feedback/${id}/investigation/pause`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function resumeFeedbackInvestigation(id: string): Promise<FeedbackDetail> {
  const res = await apiJson<ApiEnvelope<FeedbackDetail>>(`/feedback/${id}/investigation/resume`, {
    method: 'POST',
  })
  return res.data
}

export async function deleteFeedback(id: string, reason: string): Promise<void> {
  await apiJson(`/feedback/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) })
}
