import { apiJson, ApiError, type ApiEnvelope } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import type {
  CreatePathwayCaseInput,
  ListPathwayCasesParams,
  PathwayCarePlan,
  PathwayCase,
  PathwayDocument,
  ProfessionalInput,
  PathwayPlanContent,
  PathwaySummary,
  PlanDecision,
  ReviewInput,
  RiskInput,
  RiskStatus,
  UpdatePathwayCaseInput,
} from '@/features/specialist-pathways/types/specialist-pathway.types'

function buildQuery(params?: Record<string, string | undefined>): string {
  if (!params) return ''
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v)
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

async function data<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiJson<ApiEnvelope<T>>(path, init)
  return res.data
}

const post = <T,>(path: string, body: unknown) =>
  data<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) })
const patch = <T,>(path: string, body: unknown) =>
  data<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) })

export async function listPathwayCases(params?: ListPathwayCasesParams): Promise<PathwayCase[]> {
  return data<PathwayCase[]>(`/specialist-pathways${buildQuery(params)}`, { method: 'GET' })
}

export async function getPathwaySummary(locationId?: string): Promise<PathwaySummary> {
  return data<PathwaySummary>(`/specialist-pathways/summary${buildQuery({ locationId })}`, { method: 'GET' })
}

export async function getPathwayCase(id: string): Promise<PathwayCase> {
  return data<PathwayCase>(`/specialist-pathways/${id}`, { method: 'GET' })
}

export async function createPathwayCase(body: CreatePathwayCaseInput): Promise<PathwayCase> {
  return post<PathwayCase>('/specialist-pathways', body)
}

export async function updatePathwayCase(id: string, body: UpdatePathwayCaseInput): Promise<PathwayCase> {
  return patch<PathwayCase>(`/specialist-pathways/${id}`, body)
}

export async function closePathwayCase(id: string, reason: string): Promise<PathwayCase> {
  return post<PathwayCase>(`/specialist-pathways/${id}/close`, { reason })
}

export async function reopenPathwayCase(id: string): Promise<PathwayCase> {
  return post<PathwayCase>(`/specialist-pathways/${id}/reopen`, {})
}

export async function addPathwayRisk(id: string, body: RiskInput): Promise<PathwayCase> {
  return post<PathwayCase>(`/specialist-pathways/${id}/risks`, body)
}

export async function updatePathwayRisk(
  id: string,
  riskId: string,
  body: Partial<RiskInput> & { status?: RiskStatus },
): Promise<PathwayCase> {
  return patch<PathwayCase>(`/specialist-pathways/${id}/risks/${riskId}`, body)
}

export async function addPathwayReview(id: string, body: ReviewInput): Promise<PathwayCase> {
  return post<PathwayCase>(`/specialist-pathways/${id}/reviews`, body)
}

export async function addPathwayProfessional(id: string, body: ProfessionalInput): Promise<PathwayCase> {
  return post<PathwayCase>(`/specialist-pathways/${id}/professionals`, body)
}

export async function updatePathwayProfessional(
  id: string,
  professionalId: string,
  body: Partial<ProfessionalInput>,
): Promise<PathwayCase> {
  return patch<PathwayCase>(`/specialist-pathways/${id}/professionals/${professionalId}`, body)
}

export async function removePathwayProfessional(id: string, professionalId: string): Promise<PathwayCase> {
  return data<PathwayCase>(`/specialist-pathways/${id}/professionals/${professionalId}`, { method: 'DELETE' })
}

export async function uploadPathwayDocument(
  id: string,
  body: { file: File; title: string; category?: string },
): Promise<PathwayCase> {
  const form = new FormData()
  form.append('file', body.file)
  form.append('title', body.title)
  if (body.category) form.append('category', body.category)
  return data<PathwayCase>(`/specialist-pathways/${id}/documents`, { method: 'POST', body: form })
}

export async function removePathwayDocument(id: string, documentId: string): Promise<PathwayCase> {
  return data<PathwayCase>(`/specialist-pathways/${id}/documents/${documentId}`, { method: 'DELETE' })
}

/** Fetches the protected file with the bearer token and triggers a browser download. */
export async function downloadPathwayDocument(caseId: string, doc: PathwayDocument): Promise<void> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured.', 0)
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${base}/specialist-pathways/${caseId}/documents/${doc.id}/download`, { headers })
  if (!res.ok) throw new ApiError('Download failed', res.status)
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = doc.originalName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Omit `content` to start the new version from the latest plan. */
export async function createPathwayPlan(caseId: string, content?: PathwayPlanContent): Promise<PathwayCarePlan> {
  return post<PathwayCarePlan>(`/specialist-pathways/${caseId}/plans`, content ? { content } : {})
}

export async function updatePathwayPlan(
  caseId: string,
  planId: string,
  body: { content?: PathwayPlanContent; submit?: boolean },
): Promise<PathwayCarePlan> {
  return patch<PathwayCarePlan>(`/specialist-pathways/${caseId}/plans/${planId}`, body)
}

export async function decidePathwayPlan(
  caseId: string,
  planId: string,
  decision: PlanDecision,
  comment?: string,
): Promise<PathwayCarePlan> {
  return post<PathwayCarePlan>(`/specialist-pathways/${caseId}/plans/${planId}/decision`, { decision, comment })
}
