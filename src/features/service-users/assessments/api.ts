import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import {
  AssessmentCompletionSource,
  type AssessmentCatalogue,
  type AssessmentCatalogueItem,
  type AssessmentCompletion,
  type AssessmentReviewQueueItem,
  type AssessmentReviewQueueMeta,
  type AssessmentReviewState,
  type CarePlanAssessmentLink,
  type ServiceUserAssessmentLine,
} from '@/features/service-users/assessments/types'

type BackendCompletion = {
  id: string
  assessmentKey: string
  assessmentTitle?: string | null
  source: AssessmentCompletionSource
  sourceHolisticTabId?: number | null
  completedAt?: string | null
  completedBy?: AssessmentCompletion['completedBy']
  summary?: string | null
  snapshot?: Record<string, unknown> | null
  carePlanLinks?: Array<{
    id: string
    carePlanFormId: string
    carePlanFormName?: string | null
    linkedAt?: string | null
    autoLinked?: boolean
  }>
}

type BackendAssessmentLine = {
  assessmentKey: string
  title: string
  latestCompletion?: BackendCompletion | null
  review?: AssessmentReviewState | null
}

type BackendCatalogue = {
  tools?: Array<{ assessmentKey: string; title: string; holisticTabId?: number }>
  carePathwayForms?: Array<{ id: string; name: string; description?: string | null }>
}

function mapCompletion(row: BackendCompletion): AssessmentCompletion {
  return {
    id: row.id,
    assessmentKey: row.assessmentKey,
    assessmentTitle: row.assessmentTitle,
    summary: row.summary,
    source: row.source,
    completedAt: row.completedAt,
    completedBy: row.completedBy,
    data: row.snapshot ?? null,
    sourceSectionId: row.sourceHolisticTabId ?? null,
    carePlanLinks: row.carePlanLinks?.map((link) => ({
      id: link.id,
      carePlanFormId: link.carePlanFormId,
      carePlanFormName: link.carePlanFormName ?? null,
      linkedAt: link.linkedAt ?? null,
      autoLinked: link.autoLinked ?? false,
    })),
  }
}

function mapAssessmentLine(row: BackendAssessmentLine): ServiceUserAssessmentLine {
  const latest = row.latestCompletion
  return {
    assessmentKey: row.assessmentKey,
    title: row.title,
    summary: latest?.summary ?? null,
    latestCompletionId: latest?.id ?? null,
    latestCompletedAt: latest?.completedAt ?? null,
    latestCompletedBy: latest?.completedBy ?? null,
    latestCompletionSource: latest?.source ?? null,
    review: row.review ?? null,
  }
}

export async function fetchServiceUserAssessments(
  serviceUserId: string,
  init?: RequestInit,
): Promise<ServiceUserAssessmentLine[]> {
  const res = await apiJson<ApiEnvelope<BackendAssessmentLine[]>>(
    `/service-users/${serviceUserId}/assessments`,
    { method: 'GET', ...init },
  )
  return (res.data ?? []).map(mapAssessmentLine)
}

export async function fetchAssessmentCompletions(
  serviceUserId: string,
  assessmentKey: string,
  init?: RequestInit,
): Promise<AssessmentCompletion[]> {
  const res = await apiJson<ApiEnvelope<BackendCompletion[]>>(
    `/service-users/${serviceUserId}/assessments/${assessmentKey}/completions`,
    { method: 'GET', ...init },
  )
  return (res.data ?? []).map(mapCompletion)
}

export async function fetchAssessmentCompletion(
  serviceUserId: string,
  completionId: string,
  init?: RequestInit,
): Promise<AssessmentCompletion> {
  const res = await apiJson<ApiEnvelope<BackendCompletion>>(
    `/service-users/${serviceUserId}/assessments/completions/${completionId}`,
    { method: 'GET', ...init },
  )
  return mapCompletion(res.data)
}

function mapCatalogueItem(
  assessmentKey: string,
  title: string,
  source: AssessmentCompletionSource,
  description?: string | null,
): AssessmentCatalogueItem {
  return { assessmentKey, title, description: description ?? null, source }
}

export async function fetchAssessmentCatalogue(
  serviceUserId: string,
  init?: RequestInit,
): Promise<AssessmentCatalogue> {
  const res = await apiJson<ApiEnvelope<BackendCatalogue>>(
    `/service-users/${serviceUserId}/assessments/catalogue`,
    { method: 'GET', ...init },
  )
  const payload = res.data ?? {}
  const tools: AssessmentCatalogueItem[] = (payload.tools ?? []).map((tool) =>
    mapCatalogueItem(tool.assessmentKey, tool.title, AssessmentCompletionSource.INITIAL_ASSESSMENT),
  )
  const carePathwayForms: AssessmentCatalogueItem[] = (payload.carePathwayForms ?? []).map((form) =>
    mapCatalogueItem(form.id, form.name, AssessmentCompletionSource.MANUAL, form.description ?? null),
  )
  return { tools, carePathwayForms }
}

export async function createAssessmentCompletion(
  serviceUserId: string,
  assessmentKey: string,
  body: {
    summary?: string | null
    snapshot?: Record<string, unknown> | null
    title?: string | null
    carePathwayFormId?: string | null
    repeatFromCompletionId?: string | null
  },
): Promise<AssessmentCompletion> {
  const res = await apiJson<ApiEnvelope<BackendCompletion>>(
    `/service-users/${serviceUserId}/assessments/${assessmentKey}/completions`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return mapCompletion(res.data)
}

export async function fetchCarePlanAssessmentLinks(
  serviceUserId: string,
  carePlanFormId: string,
  init?: RequestInit,
): Promise<CarePlanAssessmentLink[]> {
  const res = await apiJson<ApiEnvelope<CarePlanAssessmentLink[]>>(
    `/service-users/${serviceUserId}/care-plans/${carePlanFormId}/assessment-links`,
    { method: 'GET', ...init },
  )
  return res.data ?? []
}

export async function linkAssessmentToCarePlan(
  serviceUserId: string,
  carePlanFormId: string,
  completionId: string,
): Promise<CarePlanAssessmentLink> {
  const res = await apiJson<ApiEnvelope<CarePlanAssessmentLink>>(
    `/service-users/${serviceUserId}/care-plans/${carePlanFormId}/assessment-links`,
    { method: 'POST', body: JSON.stringify({ completionId }) },
  )
  return res.data
}

export async function unlinkAssessmentFromCarePlan(
  serviceUserId: string,
  carePlanFormId: string,
  linkId: string,
): Promise<void> {
  await apiJson(
    `/service-users/${serviceUserId}/care-plans/${carePlanFormId}/assessment-links/${linkId}`,
    { method: 'DELETE' },
  )
}

export async function fetchAssessmentReviewQueue(
  params?: { overdueOnly?: boolean; serviceUserId?: string; locationId?: string },
  init?: RequestInit,
): Promise<{ data: AssessmentReviewQueueItem[]; meta: AssessmentReviewQueueMeta }> {
  const qs = new URLSearchParams()
  if (params?.overdueOnly) qs.set('overdueOnly', 'true')
  if (params?.serviceUserId) qs.set('serviceUserId', params.serviceUserId)
  if (params?.locationId) qs.set('locationId', params.locationId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<
    ApiEnvelope<AssessmentReviewQueueItem[]> & { meta?: AssessmentReviewQueueMeta }
  >(`/service-user-assessments/review-queue${suffix}`, { method: 'GET', ...init })
  return {
    data: res.data ?? [],
    meta: res.meta ?? { total: 0, overdueCount: 0, dueSoonCount: 0 },
  }
}
