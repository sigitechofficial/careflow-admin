import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CorrectIncidentInput,
  CreateIncidentActionInput,
  CreateIncidentInput,
  IncidentAction,
  IncidentAnalytics,
  IncidentAnalyticsFilters,
  IncidentCategoryOption,
  IncidentCarerSuspension,
  IncidentExternalBody,
  IncidentExternalBodyInput,
  EmployeeIncidentSuspension,
  IncidentClarificationField,
  IncidentDetail,
  IncidentInvestigation,
  IncidentInvestigatorOption,
  IncidentListFilters,
  IncidentListItem,
  IncidentVisitOption,
  IncidentListResponse,
  IncidentOutcome,
  IncidentReview,
  IncidentSeverity,
  IncidentStats,
  IncidentStatus,
  MyActionItem,
  UpdateIncidentActionInput,
  UpsertIncidentInvestigationInput,
  UpsertIncidentOutcomeInput,
  UpsertIncidentReviewInput,
} from '@/features/incidents/types'

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export async function fetchIncidentVisitOptions(
  params: { date: string; serviceUserId?: string; employeeId?: string },
  init?: RequestInit,
): Promise<IncidentVisitOption[]> {
  const query = buildQuery(params)
  const res = await apiJson<ApiEnvelope<IncidentVisitOption[]>>(`/incidents/visit-options${query}`, {
    method: 'GET',
    ...init,
  })
  return res.data ?? []
}

export async function fetchIncidentCategories(init?: RequestInit): Promise<IncidentCategoryOption[]> {
  const res = await apiJson<ApiEnvelope<IncidentCategoryOption[]>>('/incidents/categories', {
    method: 'GET',
    ...init,
  })
  return res.data ?? []
}

export async function fetchIncidents(
  filters: IncidentListFilters,
  init?: RequestInit,
): Promise<IncidentListResponse> {
  const query = buildQuery({
    search: filters.search,
    status: filters.status,
    severity: filters.severity,
    severities: filters.severities?.length ? filters.severities.join(',') : undefined,
    closedFrom: filters.closedFrom,
    hasOverdueActions: filters.hasOverdueActions || undefined,
    categoryId: filters.categoryId,
    serviceUserId: filters.serviceUserId,
    employeeId: filters.employeeId,
    locationId: filters.locationId,
    openOnly: filters.openOnly,
    dateField: filters.dateField,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    page: filters.page ?? 1,
    limit: filters.limit ?? 25,
  })
  const res = await apiJson<ApiEnvelope<IncidentListResponse>>(`/incidents${query}`, {
    method: 'GET',
    ...init,
  })
  return res.data
}

export async function fetchIncident(id: string, init?: RequestInit): Promise<IncidentDetail> {
  const res = await apiJson<ApiEnvelope<IncidentDetail>>(`/incidents/${id}`, { method: 'GET', ...init })
  return res.data
}

export async function createIncident(input: CreateIncidentInput): Promise<IncidentListItem> {
  const res = await apiJson<ApiEnvelope<IncidentListItem>>('/incidents', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function changeIncidentStatus(
  id: string,
  status: IncidentStatus,
  reason?: string,
  overrideMandatoryActions?: boolean,
  overrideOpenExternalBodies?: boolean,
): Promise<IncidentListItem> {
  const res = await apiJson<ApiEnvelope<IncidentListItem>>(`/incidents/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, reason, overrideMandatoryActions, overrideOpenExternalBodies }),
  })
  return res.data
}

/** Reported → Under Review; the manager becomes the owner. */
export async function startIncidentReview(id: string): Promise<IncidentListItem> {
  const res = await apiJson<ApiEnvelope<IncidentListItem>>(`/incidents/${id}/start-review`, { method: 'POST' })
  return res.data
}

/** Correct raised details (manager, with a reason; closed incidents must be reopened first). */
export async function correctIncident(id: string, input: CorrectIncidentInput): Promise<IncidentListItem> {
  const res = await apiJson<ApiEnvelope<IncidentListItem>>(`/incidents/${id}/corrections`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

/** Add a clarification note to the reporter's account (the original text is never changed). */
export async function addIncidentClarification(
  id: string,
  input: { field: IncidentClarificationField; note: string },
): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/incidents/${id}/clarifications`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function changeIncidentSeverity(
  id: string,
  severity: IncidentSeverity,
  reason?: string,
): Promise<IncidentListItem> {
  const res = await apiJson<ApiEnvelope<IncidentListItem>>(`/incidents/${id}/severity`, {
    method: 'POST',
    body: JSON.stringify({ severity, reason }),
  })
  return res.data
}

export async function fetchIncidentStats(
  locationId?: string,
  init?: RequestInit,
): Promise<IncidentStats> {
  const query = buildQuery({ locationId })
  const res = await apiJson<ApiEnvelope<IncidentStats>>(`/incidents/stats${query}`, {
    method: 'GET',
    ...init,
  })
  return res.data
}

export async function fetchIncidentAnalytics(
  filters: IncidentAnalyticsFilters,
  init?: RequestInit,
): Promise<IncidentAnalytics> {
  const query = buildQuery({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    categoryId: filters.categoryId,
    severity: filters.severity,
    status: filters.status,
    serviceUserId: filters.serviceUserId,
    locationId: filters.locationId,
  })
  const res = await apiJson<ApiEnvelope<IncidentAnalytics>>(`/incidents/analytics${query}`, {
    method: 'GET',
    ...init,
  })
  return res.data
}

export async function upsertIncidentReview(
  id: string,
  input: UpsertIncidentReviewInput,
): Promise<IncidentReview> {
  const res = await apiJson<ApiEnvelope<IncidentReview>>(`/incidents/${id}/review`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function upsertIncidentInvestigation(
  id: string,
  input: UpsertIncidentInvestigationInput,
): Promise<IncidentInvestigation> {
  const res = await apiJson<ApiEnvelope<IncidentInvestigation>>(`/incidents/${id}/investigation`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

/** Users who can lead this incident's investigation. */
export async function fetchIncidentInvestigators(
  id: string,
  opts?: { signal?: AbortSignal },
): Promise<IncidentInvestigatorOption[]> {
  const res = await apiJson<ApiEnvelope<IncidentInvestigatorOption[]>>(
    `/incidents/${id}/investigators`,
    { signal: opts?.signal },
  )
  return res.data
}

export async function pauseIncidentInvestigation(
  id: string,
  input: { reason: string; nextReviewDate: string },
): Promise<void> {
  await apiJson(`/incidents/${id}/investigation/pause`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function resumeIncidentInvestigation(id: string): Promise<void> {
  await apiJson(`/incidents/${id}/investigation/resume`, { method: 'POST' })
}

export async function addIncidentExternalBody(
  id: string,
  input: IncidentExternalBodyInput,
): Promise<IncidentExternalBody> {
  const res = await apiJson<ApiEnvelope<IncidentExternalBody>>(`/incidents/${id}/external-bodies`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function updateIncidentExternalBody(
  id: string,
  bodyId: string,
  input: Partial<IncidentExternalBodyInput>,
): Promise<IncidentExternalBody> {
  const res = await apiJson<ApiEnvelope<IncidentExternalBody>>(`/incidents/${id}/external-bodies/${bodyId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function deleteIncidentExternalBody(id: string, bodyId: string, reason: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/incidents/${id}/external-bodies/${bodyId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  })
}

export async function suspendIncidentCarer(
  id: string,
  input: { employeeId?: string; reason: string; suspendFrom: string; suspendTo: string },
): Promise<IncidentCarerSuspension> {
  const res = await apiJson<ApiEnvelope<IncidentCarerSuspension>>(`/incidents/${id}/suspend-carer`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function liftIncidentCarerSuspension(
  id: string,
  suspensionId: string,
  reason: string,
): Promise<IncidentCarerSuspension> {
  const res = await apiJson<ApiEnvelope<IncidentCarerSuspension>>(
    `/incidents/${id}/carer-suspensions/${suspensionId}/lift`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  )
  return res.data
}

export async function continueIncidentCarerSuspension(
  id: string,
  suspensionId: string,
  input: { suspendTo: string; reason: string },
): Promise<IncidentCarerSuspension> {
  const res = await apiJson<ApiEnvelope<IncidentCarerSuspension>>(
    `/incidents/${id}/carer-suspensions/${suspensionId}/continue`,
    { method: 'POST', body: JSON.stringify(input) },
  )
  return res.data
}

/** A carer's suspensions across incidents (employee record). */
export async function fetchEmployeeIncidentSuspensions(
  employeeId: string,
  opts?: { signal?: AbortSignal },
): Promise<EmployeeIncidentSuspension[]> {
  const res = await apiJson<ApiEnvelope<EmployeeIncidentSuspension[]>>(
    `/incidents/carer-suspensions/by-employee/${employeeId}`,
    { signal: opts?.signal },
  )
  return res.data
}

export async function extendIncidentCarerSuspension(
  id: string,
  suspensionId: string,
  input: { suspendTo: string; reason: string },
): Promise<IncidentCarerSuspension> {
  const res = await apiJson<ApiEnvelope<IncidentCarerSuspension>>(
    `/incidents/${id}/carer-suspensions/${suspensionId}/extend`,
    { method: 'POST', body: JSON.stringify(input) },
  )
  return res.data
}

export async function upsertIncidentOutcome(
  id: string,
  input: UpsertIncidentOutcomeInput,
): Promise<IncidentOutcome> {
  const res = await apiJson<ApiEnvelope<IncidentOutcome>>(`/incidents/${id}/outcome`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function fetchIncidentActions(id: string, init?: RequestInit): Promise<IncidentAction[]> {
  const res = await apiJson<ApiEnvelope<IncidentAction[]>>(`/incidents/${id}/actions`, {
    method: 'GET',
    ...init,
  })
  return res.data ?? []
}

export async function createIncidentAction(
  id: string,
  input: CreateIncidentActionInput,
): Promise<IncidentAction> {
  const res = await apiJson<ApiEnvelope<IncidentAction>>(`/incidents/${id}/actions`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function updateIncidentAction(
  actionId: string,
  input: UpdateIncidentActionInput,
): Promise<IncidentAction> {
  const res = await apiJson<ApiEnvelope<IncidentAction>>(`/incidents/actions/${actionId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function completeIncidentAction(
  actionId: string,
  completionNotes: string,
  completedRecords?: { id: string; label: string }[],
): Promise<IncidentAction> {
  const res = await apiJson<ApiEnvelope<IncidentAction>>(`/incidents/actions/${actionId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ completionNotes, ...(completedRecords ? { completedRecords } : {}) }),
  })
  return res.data
}

/** Remove a measure added by mistake (reason kept in the audit log). */
export async function removeIncidentAction(actionId: string, reason: string): Promise<void> {
  await apiJson(`/incidents/actions/${actionId}/remove`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function fetchMyIncidentActions(init?: RequestInit): Promise<MyActionItem[]> {
  const res = await apiJson<ApiEnvelope<MyActionItem[]>>('/incidents/my-actions', {
    method: 'GET',
    ...init,
  })
  return res.data ?? []
}
