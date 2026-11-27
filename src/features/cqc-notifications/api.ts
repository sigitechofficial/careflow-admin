import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type CqcNotificationType =
  | 'DEATH'
  | 'SERIOUS_INJURY'
  | 'ABUSE_ALLEGATION'
  | 'POLICE_INCIDENT'
  | 'SERVICE_DISRUPTION'
export type CqcNotificationStatus = 'DRAFT' | 'READY' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'NOT_REQUIRED' | 'CANCELLED'
export type CqcSubmissionMethod = 'PROVIDER_PORTAL' | 'EMAIL_FORM'

export type Ref = { id: string; name: string | null }
export type ServiceUserRef = { id: string; name: string | null; identifier: string | null }

export type CqcFieldOption = { value: string; label: string }
export type CqcDetailField = {
  key: string
  label: string
  /** staff: picked from staff, or typed for someone outside the service (stored as text). */
  kind: 'text' | 'longText' | 'datetime' | 'boolean' | 'select' | 'staff'
  required: boolean
  options?: CqcFieldOption[]
  help?: string
}
export type CqcNotificationTypeSpec = {
  type: CqcNotificationType
  label: string
  regulation: string
  whenToNotify: string
  fields: CqcDetailField[]
}
export type CqcNotificationTypes = {
  targetHours: number
  types: CqcNotificationTypeSpec[]
  othersInformed: CqcFieldOption[]
}

export type CqcNotificationRow = {
  id: string
  referenceNumber: string
  type: CqcNotificationType
  typeLabel: string
  status: CqcNotificationStatus
  location: Ref
  serviceUser: ServiceUserRef | null
  eventOccurredAt: string | null
  becameAwareAt: string
  dueAt: string
  submittedAt: string | null
  cqcReference: string | null
  overdue: boolean
  submittedLate: boolean
}

export type CqcNotificationSummary = {
  drafts: number
  ready: number
  dueSoon: number
  overdue: number
  submittedThisMonth: number
}

export type CqcNotificationSnapshot = {
  referenceNumber: string
  typeLabel: string
  regulation: string
  location: Ref
  serviceUserIdentifier: string | null
  incidentReference: string | null
  safeguardingReference: string | null
  eventOccurredAt: string | null
  becameAwareAt: string
  summary: string | null
  actionsTaken: string | null
  othersInformed: string[]
  details: Array<{ label: string; value: string }>
  submittedAt: string
  submissionMethod: CqcSubmissionMethod
  cqcReference: string | null
  /** Policies attached when it was sent (missing on notifications sent before policies could be attached). */
  policies?: Array<{ reference: string; title: string; version: string | null }>
}

export type CqcDetailValue = string | boolean | null

export type CqcNotificationDetail = {
  id: string
  referenceNumber: string
  type: CqcNotificationType
  typeLabel: string
  regulation: string
  status: CqcNotificationStatus
  location: Ref
  serviceUser: ServiceUserRef | null
  incident: { id: string; referenceNumber: string } | null
  safeguardingCase: { id: string; referenceNumber: string } | null
  eventOccurredAt: string | null
  becameAwareAt: string
  dueAt: string
  summary: string | null
  actionsTaken: string | null
  othersInformed: string[]
  details: Record<string, CqcDetailValue>
  missing: string[]
  overdue: boolean
  submittedLate: boolean
  readyAt: string | null
  readyBy: Ref | null
  submissionMethod: CqcSubmissionMethod | null
  submittedAt: string | null
  submittedBy: Ref | null
  submittedSnapshot: CqcNotificationSnapshot | null
  cqcReference: string | null
  acknowledgedAt: string | null
  closedReason: string | null
  closedAt: string | null
  closedBy: Ref | null
  createdBy: Ref | null
  createdAt: string
  updatedAt: string
}

export type CqcNotificationListParams = {
  status?: CqcNotificationStatus
  type?: CqcNotificationType
  locationId?: string
  overdue?: boolean
  search?: string
  incidentId?: string
  safeguardingCaseId?: string
  page?: number
  limit?: number
}

/**
 * An incident, safeguarding case or service user recorded as deceased that may need a notification
 * and has none yet. An incident can appear once per type it may need.
 */
export type CqcNotificationCandidate = {
  source: 'INCIDENT' | 'SAFEGUARDING' | 'SERVICE_USER'
  id: string
  referenceNumber: string
  title: string
  occurredAt: string
  location: Ref | null
  serviceUser: { id: string; name: string } | null
  reason: string
  suggestedType: CqcNotificationType
  suggestedTypeLabel: string
}

export type CqcNotificationFieldsInput = {
  locationId?: string
  serviceUserId?: string | null
  eventOccurredAt?: string | null
  becameAwareAt?: string
  summary?: string
  actionsTaken?: string
  othersInformed?: string[]
  details?: Record<string, CqcDetailValue>
  /** Required on update when becameAwareAt changes (it moves the 24-hour deadline). */
  becameAwareAtReason?: string
}
/** With an incident or safeguarding case, answers not given are filled in from it. */
export type CreateCqcNotificationInput = CqcNotificationFieldsInput & {
  type: CqcNotificationType
  incidentId?: string
  safeguardingCaseId?: string
}
export type SubmitCqcNotificationInput = {
  submittedAt: string
  method: CqcSubmissionMethod
  cqcReference?: string
}
export type AcknowledgeCqcNotificationInput = { acknowledgedAt?: string; cqcReference?: string }

const BASE = '/cqc-notifications'

export async function fetchCqcNotificationTypes(): Promise<CqcNotificationTypes> {
  const res = await apiJson<ApiEnvelope<CqcNotificationTypes>>(`${BASE}/types`, { method: 'GET' })
  return res.data
}

export async function fetchCqcNotificationSummary(): Promise<CqcNotificationSummary> {
  const res = await apiJson<ApiEnvelope<CqcNotificationSummary>>(`${BASE}/summary`, { method: 'GET' })
  return res.data
}

export async function fetchCqcNotificationCandidates(): Promise<CqcNotificationCandidate[]> {
  const res = await apiJson<ApiEnvelope<CqcNotificationCandidate[]>>(`${BASE}/candidates`, { method: 'GET' })
  return res.data
}

export async function fetchCqcNotifications(
  params: CqcNotificationListParams,
): Promise<{ rows: CqcNotificationRow[]; total: number }> {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v))
  }
  const res = await apiJson<ApiEnvelope<CqcNotificationRow[]> & { meta?: { total?: number } }>(
    `${BASE}${qs.size ? `?${qs}` : ''}`,
    { method: 'GET' },
  )
  return { rows: res.data, total: res.meta?.total ?? res.data.length }
}

export async function fetchCqcNotification(id: string): Promise<CqcNotificationDetail> {
  const res = await apiJson<ApiEnvelope<CqcNotificationDetail>>(`${BASE}/${id}`, { method: 'GET' })
  return res.data
}

async function send(path: string, method: 'POST' | 'PATCH', body?: unknown): Promise<CqcNotificationDetail> {
  const res = await apiJson<ApiEnvelope<CqcNotificationDetail>>(path, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  return res.data
}

export const createCqcNotification = (body: CreateCqcNotificationInput) => send(BASE, 'POST', body)
export const updateCqcNotification = (id: string, body: CqcNotificationFieldsInput) =>
  send(`${BASE}/${id}`, 'PATCH', body)
export const markCqcNotificationReady = (id: string) => send(`${BASE}/${id}/ready`, 'POST')
export const reopenCqcNotification = (id: string) => send(`${BASE}/${id}/reopen`, 'POST')
export const submitCqcNotification = (id: string, body: SubmitCqcNotificationInput) =>
  send(`${BASE}/${id}/submit`, 'POST', body)
export const acknowledgeCqcNotification = (id: string, body: AcknowledgeCqcNotificationInput) =>
  send(`${BASE}/${id}/acknowledge`, 'POST', body)
export const markCqcNotificationNotRequired = (id: string, reason: string) =>
  send(`${BASE}/${id}/not-required`, 'POST', { reason })
export const cancelCqcNotification = (id: string, reason: string) => send(`${BASE}/${id}/cancel`, 'POST', { reason })

/** An organisation policy offered for, or attached to, a notification. */
export type CqcPolicyOption = {
  policyDocumentId: string
  reference: string
  title: string
  version: string | null
  reviewDate: string | null
  reviewOverdue: boolean
}

export type CqcAttachedPolicy = CqcPolicyOption & { source: 'SUGGESTED' | 'MANUAL'; addedAt: string }

export type CqcNotificationPolicies = {
  editable: boolean
  attached: CqcAttachedPolicy[]
  suggested: CqcPolicyOption[]
  /** Suggested ready-made policies the organisation has not published (adoptedStatus = its draft's status). */
  notAdopted: Array<{ libraryReference: string; title: string; adoptedStatus: string | null }>
  /** One line to paste into the CQC form. */
  cqcFormText: string
}

export async function fetchCqcNotificationPolicies(id: string): Promise<CqcNotificationPolicies> {
  const res = await apiJson<ApiEnvelope<CqcNotificationPolicies>>(`${BASE}/${id}/policies`, { method: 'GET' })
  return res.data
}

export async function searchCqcNotificationPolicies(id: string, q: string): Promise<CqcPolicyOption[]> {
  const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
  const res = await apiJson<ApiEnvelope<CqcPolicyOption[]>>(`${BASE}/${id}/policies/search${qs}`, { method: 'GET' })
  return res.data
}

export async function addCqcNotificationPolicy(
  id: string,
  body: { policyDocumentId: string; source: 'SUGGESTED' | 'MANUAL' },
): Promise<CqcNotificationPolicies> {
  const res = await apiJson<ApiEnvelope<CqcNotificationPolicies>>(`${BASE}/${id}/policies`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function removeCqcNotificationPolicy(id: string, policyDocumentId: string): Promise<CqcNotificationPolicies> {
  const res = await apiJson<ApiEnvelope<CqcNotificationPolicies>>(`${BASE}/${id}/policies/${policyDocumentId}`, {
    method: 'DELETE',
  })
  return res.data
}
