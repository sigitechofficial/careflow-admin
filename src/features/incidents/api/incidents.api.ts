import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CreateIncidentActionInput,
  CreateIncidentInput,
  IncidentAction,
  IncidentAnalytics,
  IncidentAnalyticsFilters,
  IncidentCategoryOption,
  IncidentCarerSuspension,
  IncidentCarerCourseRecommendation,
  IncidentDetail,
  IncidentInvestigation,
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
): Promise<IncidentListItem> {
  const res = await apiJson<ApiEnvelope<IncidentListItem>>(`/incidents/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status, reason, overrideMandatoryActions }),
  })
  return res.data
}

/** Reported → Under Review; the manager becomes the owner. */
export async function startIncidentReview(id: string): Promise<IncidentListItem> {
  const res = await apiJson<ApiEnvelope<IncidentListItem>>(`/incidents/${id}/start-review`, { method: 'POST' })
  return res.data
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

export async function removeIncidentCarerSuspension(
  id: string,
  suspensionId: string,
): Promise<{ id: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string }>>(
    `/incidents/${id}/carer-suspensions/${suspensionId}/remove`,
    { method: 'POST', body: JSON.stringify({}) },
  )
  return res.data
}

export async function recommendIncidentCarerCourse(
  id: string,
  input: {
    employeeId?: string
    courseId: string
    dueAt?: string
    reason?: string
    isMandatory?: boolean
  },
): Promise<IncidentCarerCourseRecommendation> {
  const res = await apiJson<ApiEnvelope<IncidentCarerCourseRecommendation>>(
    `/incidents/${id}/recommend-carer-course`,
    { method: 'POST', body: JSON.stringify(input) },
  )
  return res.data
}

export async function removeIncidentCarerCourseRecommendation(
  id: string,
  recommendationId: string,
): Promise<{ id: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string }>>(
    `/incidents/${id}/carer-course-recommendations/${recommendationId}/remove`,
    { method: 'POST', body: JSON.stringify({}) },
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
  completionNotes?: string,
): Promise<IncidentAction> {
  const res = await apiJson<ApiEnvelope<IncidentAction>>(`/incidents/actions/${actionId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ completionNotes }),
  })
  return res.data
}

export async function fetchMyIncidentActions(init?: RequestInit): Promise<MyActionItem[]> {
  const res = await apiJson<ApiEnvelope<MyActionItem[]>>('/incidents/my-actions', {
    method: 'GET',
    ...init,
  })
  return res.data ?? []
}
