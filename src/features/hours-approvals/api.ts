import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type HoursApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

/** VISIT_PLAN_OVER_HOURS: a visit plan put the carer over their hours. CONTRACTED_HOURS_CHANGE: a contracted hours change waiting for a manager. */
export type HoursApprovalType =
  | 'VISIT_PLAN_OVER_HOURS'
  | 'CONTRACTED_HOURS_CHANGE'
  | 'SERVICE_USER_WEEKLY_HOURS_CHANGE'
  | 'EXTRA_VISIT_OVER_HOURS'
  | 'DRAFT_PLAN_OVER_HOURS'

/** Extra visit over a service user's weekly hours: the visit created if a manager approves. */
export type ExtraVisitRequestPayload = {
  date: string
  weekStart: string
  weekMinutes: number
  limitWeeklyHours: number | null
  slotLabel: string
  startTime: string
  endTime: string
  durationMinutes: number
  requiredCarers: number
  reason: string
  notes: string | null
}

/** Draft visit plan over a service user's weekly hours: activation waits for this approval. */
export type DraftPlanRequestPayload = {
  kind: 'DRAFT_PLAN'
  heaviestWeekStart: string
  heaviestMinutes: number
  limitWeeklyHours: number | null
  overWeeks: Array<{ weekStart: string; minutes: number }>
}

export type ContractedHoursPlanChange = {
  visitPlanSlotId: string
  visitPlanId: string
  serviceUserId: string
  serviceUserName: string
  slotCode: string
  plannedStartTime: string
  plannedEndTime: string
  removedDays: number[]
  keptDays: number[]
  weeklyHoursRemoved: number
}

export type ContractedHoursWeekImpact = {
  /** Monday of the week, YYYY-MM-DD. */
  weekStart: string
  isCurrentWeek: boolean
  bookedHours: number
  hoursAfter: number
  visitsToUnassign: number
  hoursToUnassign: number
  /** Visits that would be unassigned (org-timezone day and HH:mm). Missing on older requests. */
  visits?: Array<{ date: string; startTime: string; endTime: string; serviceUserName: string }>
}

/** What approving a contracted hours value would change. */
export type ContractedHoursImpact = {
  previousContractedWeeklyHours: number | null
  requestedContractedWeeklyHours: number
  limitWeeklyHours: number
  isDecrease: boolean
  planWeeklyHours: number
  planWeeklyHoursAfter: number
  planChanges: ContractedHoursPlanChange[]
  weeks: ContractedHoursWeekImpact[]
  rotaVisitsToUnassign: number
}

export type PendingContractedHoursChange = {
  id: string
  previousContractedWeeklyHours: number | null
  requestedContractedWeeklyHours: number | null
  reason: string | null
  requestedAt: string
  impactSummary: ContractedHoursImpact | null
}

export type PendingServiceUserHoursChange = {
  id: string
  previousWeeklyHours: number | null
  requestedWeeklyHours: number | null
  reason: string | null
  requestedAt: string
}

export type HoursApproval = {
  id: string
  /** Null for service user weekly hours requests. */
  employeeId: string | null
  employeeName: string | null
  requestType: HoursApprovalType
  serviceUserId: string | null
  serviceUserName: string | null
  visitPlanId: string | null
  status: HoursApprovalStatus
  previousContractedWeeklyHours: number | null
  requestedContractedWeeklyHours: number | null
  /** Contracted requests: the preview when sent (or { requested, applied } once approved). */
  impactSummary: unknown
  /** Extra visit over hours (or a draft plan's busiest week for DRAFT_PLAN_OVER_HOURS). */
  requestPayload?: ExtraVisitRequestPayload | null
  /** Pending extra visits only: that week now, with the visit added (it may have changed since the request). */
  currentWeek?: { weekMinutes: number; limitWeeklyHours: number | null } | null
  /** Extra visits (Settings → Dom Rules) and draft plans (always): Reject needs a reason. */
  rejectReasonRequired?: boolean
  reason: string | null
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

/** Returns the server message (it can say what else happened, e.g. visits cancelled). */
export async function approveHours(id: string, notes?: string): Promise<string | undefined> {
  const res = await apiJson<ApiEnvelope<unknown>>(`/hours-approvals/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(notes ? { notes } : {}),
  })
  return res.message
}

export async function rejectHours(id: string, notes?: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/hours-approvals/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify(notes ? { notes } : {}),
  })
}

export async function fetchContractedHoursPreview(
  employeeId: string,
  contractedWeeklyHours: number,
): Promise<ContractedHoursImpact> {
  const q = new URLSearchParams({ employeeId, contractedWeeklyHours: String(contractedWeeklyHours) })
  const res = await apiJson<ApiEnvelope<ContractedHoursImpact>>(
    `/hours-approvals/contracted-hours/preview?${q.toString()}`,
    { method: 'GET' },
  )
  return res.data
}

export async function fetchPendingContractedHoursChange(
  employeeId: string,
  init?: RequestInit,
): Promise<PendingContractedHoursChange | null> {
  const q = new URLSearchParams({ employeeId })
  const res = await apiJson<ApiEnvelope<{ pending: PendingContractedHoursChange | null }>>(
    `/hours-approvals/contracted-hours/pending?${q.toString()}`,
    { method: 'GET', ...init },
  )
  return res.data?.pending ?? null
}

export async function requestContractedHoursChange(body: {
  employeeId: string
  contractedWeeklyHours: number
  reason?: string
}): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>('/hours-approvals/contracted-hours', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function cancelHoursApproval(id: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/hours-approvals/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

/** Settings → Dom Rules: which weekly hours changes need a manager. */
export type ServiceUserHoursChangeApproval = 'ALWAYS' | 'INCREASE_ONLY' | 'DECREASE_ONLY' | 'NEVER'

export async function fetchPendingServiceUserHoursChange(
  serviceUserId: string,
  init?: RequestInit,
): Promise<{ pending: PendingServiceUserHoursChange | null; changeApproval: ServiceUserHoursChangeApproval }> {
  const q = new URLSearchParams({ serviceUserId })
  const res = await apiJson<
    ApiEnvelope<{ pending: PendingServiceUserHoursChange | null; changeApproval?: ServiceUserHoursChangeApproval }>
  >(`/hours-approvals/service-user-hours/pending?${q.toString()}`, { method: 'GET', ...init })
  return { pending: res.data?.pending ?? null, changeApproval: res.data?.changeApproval ?? 'ALWAYS' }
}


export async function requestServiceUserHoursChange(body: {
  serviceUserId: string
  weeklyContractedHours: number
  reason?: string
}): Promise<{ applied: boolean; message: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string | null; applied?: boolean }>>('/hours-approvals/service-user-hours', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return { applied: res.data?.applied === true, message: res.message }
}

/** What lowering a service user's weekly hours would do to their visits (Settings → Dom Rules). */
export type ServiceUserHoursImpact = {
  decreaseAction: 'KEEP_WARN' | 'CANCEL_LATEST'
  limitMinutes: number
  overWeeks: Array<{ weekStart: string; minutes: number }>
  visitsToCancel: Array<{ date: string; slotLabel: string; startDateTime: string; endDateTime: string; onRota: boolean }>
  /** Weeks still over after cancelling (time-critical visits are never cancelled automatically). */
  stillOverWeeks: Array<{ weekStart: string; minutes: number }>
}

export async function fetchServiceUserHoursImpact(
  serviceUserId: string,
  weeklyHours: number,
  init?: RequestInit,
): Promise<ServiceUserHoursImpact> {
  const q = new URLSearchParams({ serviceUserId, weeklyHours: String(weeklyHours) })
  const res = await apiJson<ApiEnvelope<ServiceUserHoursImpact>>(
    `/hours-approvals/service-user-hours/impact?${q.toString()}`,
    { method: 'GET', ...init },
  )
  return res.data
}
