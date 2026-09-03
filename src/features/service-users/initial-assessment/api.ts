import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  InitialAssessmentAnswer,
  InitialAssessmentAnswerInput,
  InitialAssessmentFlaggedItem,
  InitialAssessmentSubmission,
  InitialAssessmentTemplate,
  InitialAssessmentValidationResult,
  InitialAssessmentAgencySettings,
  InitialAssessmentSubmissionSummary,
  InitialAssessmentClinicalSnapshot,
  InitialAssessmentAction,
  InitialAssessmentActionPriority,
  InitialAssessmentActionStatus,
  InitialAssessmentActionType,
  InitialAssessmentAttachment,
  InitialAssessmentAttachmentCategory,
  InitialAssessmentRiskRecord,
  InitialAssessmentRiskLevel,
  InitialAssessmentRiskStatus,
  InitialAssessmentRiskType,
  InitialAssessmentReviewQueueItem,
} from '@/features/service-users/initial-assessment/types'
import type { VitalAcceptedRangeLookupRow } from '@/features/service-users/initial-assessment/utils/vital-accepted-ranges.lookup'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { ApiError } from '@/shared/api/api-client'

type ListMeta = { page: number; limit: number; total: number; totalPages: number }

export async function fetchDefaultInitialAssessmentTemplate(
  init?: RequestInit,
): Promise<InitialAssessmentTemplate> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentTemplate>>(
    '/initial-assessment-templates/default',
    { method: 'GET', ...init },
  )
  return res.data
}

export async function fetchInitialAssessmentTemplate(
  templateId: string,
  init?: RequestInit,
): Promise<InitialAssessmentTemplate> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentTemplate>>(
    `/initial-assessment-templates/${templateId}`,
    { method: 'GET', ...init },
  )
  return res.data
}

export async function listInitialAssessmentSubmissions(
  serviceUserId: string,
  init?: RequestInit,
): Promise<InitialAssessmentSubmission[]> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentSubmission[]>>(
    `/service-users/${serviceUserId}/initial-assessments?limit=50&sortOrder=desc`,
    { method: 'GET', ...init },
  )
  return res.data
}

export async function createInitialAssessmentSubmission(
  serviceUserId: string,
  body?: { templateId?: string; overallNotes?: string },
): Promise<InitialAssessmentSubmission> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentSubmission>>(
    `/service-users/${serviceUserId}/initial-assessments`,
    { method: 'POST', body: JSON.stringify(body ?? {}) },
  )
  return res.data
}

export async function fetchInitialAssessmentAnswers(
  serviceUserId: string,
  submissionId: string,
  init?: RequestInit,
): Promise<InitialAssessmentAnswer[]> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentAnswer[]>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/answers`,
    { method: 'GET', ...init },
  )
  return res.data
}

export async function revealInitialAssessmentSecureField(
  serviceUserId: string,
  submissionId: string,
  questionId: string,
): Promise<{ questionId: string; textValue: string | null }> {
  const res = await apiJson<ApiEnvelope<{ questionId: string; textValue: string | null }>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/answers/${questionId}/reveal-secure`,
    { method: 'POST' },
  )
  return res.data
}

export async function saveInitialAssessmentAnswers(
  serviceUserId: string,
  submissionId: string,
  answers: InitialAssessmentAnswerInput[],
  correctionReason?: string,
): Promise<void> {
  await apiJson<ApiEnvelope<{ submissionId: string; savedCount: number }>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/answers`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        answers,
        ...(correctionReason?.trim() ? { correctionReason: correctionReason.trim() } : {}),
      }),
    },
  )
}

export type SubmitInitialAssessmentOptions = {
  notes?: string
  skipIncompleteValidation?: boolean
}

export async function submitInitialAssessment(
  serviceUserId: string,
  submissionId: string,
  options?: SubmitInitialAssessmentOptions,
): Promise<InitialAssessmentSubmission> {
  const body: SubmitInitialAssessmentOptions = {}
  if (options?.notes?.trim()) body.notes = options.notes.trim()
  if (options?.skipIncompleteValidation) body.skipIncompleteValidation = true
  const res = await apiJson<ApiEnvelope<InitialAssessmentSubmission>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/submit`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateInitialAssessmentSubmission(
  serviceUserId: string,
  submissionId: string,
  body: { overallNotes?: string; metadata?: Record<string, unknown> },
): Promise<InitialAssessmentSubmission> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentSubmission>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function reviewInitialAssessment(
  serviceUserId: string,
  submissionId: string,
  body: {
    status: 'REVIEWED' | 'ARCHIVED'
    reviewNotes?: string
    approvedForCareStart?: boolean
    careStartConditions?: string
  },
): Promise<InitialAssessmentSubmission> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentSubmission>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/review`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function reopenInitialAssessment(
  serviceUserId: string,
  submissionId: string,
  reason: string,
): Promise<InitialAssessmentSubmission> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentSubmission>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status: 'IN_PROGRESS', reason }),
    },
  )
  return res.data
}

export async function validateInitialAssessment(
  serviceUserId: string,
  submissionId: string,
  init?: RequestInit,
): Promise<InitialAssessmentValidationResult> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentValidationResult>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/validate`,
    { method: 'POST', ...init },
  )
  return res.data
}

export async function fetchInitialAssessmentActions(
  serviceUserId: string,
  submissionId: string,
  init?: RequestInit,
): Promise<InitialAssessmentAction[]> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentAction[]>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/actions`,
    { method: 'GET', ...init },
  )
  return res.data
}

export async function createInitialAssessmentAction(
  serviceUserId: string,
  submissionId: string,
  body: {
    title: string
    actionType: InitialAssessmentActionType
    priority?: InitialAssessmentActionPriority
    dueDate?: string
    notes?: string
    assignedToId?: string
  },
): Promise<InitialAssessmentAction> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentAction>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/actions`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateInitialAssessmentAction(
  serviceUserId: string,
  submissionId: string,
  actionId: string,
  body: {
    title?: string
    priority?: InitialAssessmentActionPriority
    status?: InitialAssessmentActionStatus
    dueDate?: string | null
    notes?: string
    assignedToId?: string | null
  },
): Promise<InitialAssessmentAction> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentAction>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/actions/${actionId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function regenerateInitialAssessmentActions(
  serviceUserId: string,
  submissionId: string,
): Promise<InitialAssessmentAction[]> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentAction[]>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/actions/regenerate`,
    { method: 'POST' },
  )
  return res.data
}

export async function fetchInitialAssessmentAttachments(
  serviceUserId: string,
  submissionId: string,
  init?: RequestInit,
): Promise<InitialAssessmentAttachment[]> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentAttachment[]>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/attachments`,
    { method: 'GET', ...init },
  )
  return res.data
}

export async function uploadInitialAssessmentAttachment(
  serviceUserId: string,
  submissionId: string,
  file: File,
  body: {
    category: InitialAssessmentAttachmentCategory
    label?: string
    sectionNumber?: number
  },
): Promise<InitialAssessmentAttachment> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  }
  const url = `${base}/service-users/${serviceUserId}/initial-assessments/${submissionId}/attachments`
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const form = new FormData()
  form.append('file', file)
  form.append('category', body.category)
  if (body.label?.trim()) form.append('label', body.label.trim())
  if (body.sectionNumber != null) form.append('sectionNumber', String(body.sectionNumber))
  const res = await fetch(url, { method: 'POST', headers, body: form })
  const text = await res.text()
  let bodyJson: unknown = null
  try {
    bodyJson = text ? JSON.parse(text) : null
  } catch {
    bodyJson = text
  }
  if (!res.ok) {
    const msg =
      typeof bodyJson === 'object' && bodyJson !== null && 'message' in bodyJson
        ? String((bodyJson as { message: unknown }).message)
        : res.statusText
    throw new ApiError(msg || 'Upload failed', res.status, bodyJson)
  }
  return (bodyJson as ApiEnvelope<InitialAssessmentAttachment>).data
}

export async function deleteInitialAssessmentAttachment(
  serviceUserId: string,
  submissionId: string,
  attachmentId: string,
): Promise<void> {
  await apiJson<ApiEnvelope<{ message: string }>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/attachments/${attachmentId}`,
    { method: 'DELETE' },
  )
}

export async function fetchInitialAssessmentRiskRecords(
  serviceUserId: string,
  submissionId: string,
  init?: RequestInit,
): Promise<InitialAssessmentRiskRecord[]> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentRiskRecord[]>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/risk-records`,
    { method: 'GET', ...init },
  )
  return res.data
}

export async function createInitialAssessmentRiskRecord(
  serviceUserId: string,
  submissionId: string,
  body: {
    riskType: InitialAssessmentRiskType
    description: string
    likelihood: InitialAssessmentRiskLevel
    severity: InitialAssessmentRiskLevel
    controlMeasures?: string
    residualRisk?: InitialAssessmentRiskLevel
    reviewDate?: string
    responsiblePersonId?: string
  },
): Promise<InitialAssessmentRiskRecord> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentRiskRecord>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/risk-records`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data
}

export async function updateInitialAssessmentRiskRecord(
  serviceUserId: string,
  submissionId: string,
  riskRecordId: string,
  body: {
    riskType?: InitialAssessmentRiskType
    description?: string
    likelihood?: InitialAssessmentRiskLevel
    severity?: InitialAssessmentRiskLevel
    controlMeasures?: string
    residualRisk?: InitialAssessmentRiskLevel
    reviewDate?: string | null
    status?: InitialAssessmentRiskStatus
    responsiblePersonId?: string | null
  },
): Promise<InitialAssessmentRiskRecord> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentRiskRecord>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/risk-records/${riskRecordId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function regenerateInitialAssessmentRiskRecords(
  serviceUserId: string,
  submissionId: string,
): Promise<InitialAssessmentRiskRecord[]> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentRiskRecord[]>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/risk-records/regenerate`,
    { method: 'POST' },
  )
  return res.data
}

export async function fetchInitialAssessmentClinical(
  serviceUserId: string,
  submissionId: string,
  init?: RequestInit,
): Promise<InitialAssessmentClinicalSnapshot> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentClinicalSnapshot>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/clinical`,
    { method: 'GET', ...init },
  )
  return res.data
}

export async function fetchInitialAssessmentSummary(
  serviceUserId: string,
  submissionId: string,
  init?: RequestInit,
): Promise<InitialAssessmentSubmissionSummary> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentSubmissionSummary>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/summary`,
    { method: 'GET', ...init },
  )
  return res.data
}

export async function fetchInitialAssessmentAgencySettings(
  init?: RequestInit,
): Promise<InitialAssessmentAgencySettings> {
  const res = await apiJson<ApiEnvelope<InitialAssessmentAgencySettings>>(
    '/initial-assessment-templates/agency-settings',
    { method: 'GET', ...init },
  )
  return res.data
}

export async function fetchVitalAcceptedRangeLookup(signal?: AbortSignal) {
  const res = await apiJson<
    ApiEnvelope<
      Array<
        VitalAcceptedRangeLookupRow & {
          id: string
          isActive?: boolean
        }
      >
    >
  >('/lookups/vital-accepted-ranges', { method: 'GET', signal })
  return res.data.map(({ id: _id, isActive: _active, ...row }) => row)
}

export async function fetchInitialAssessmentRiskSummary(
  serviceUserId: string,
  submissionId: string,
  init?: RequestInit,
): Promise<{ items: InitialAssessmentFlaggedItem[]; count: number }> {
  const res = await apiJson<
    ApiEnvelope<{ items: InitialAssessmentFlaggedItem[]; count: number }>
  >(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/risk-summary`,
    { method: 'GET', ...init },
  )
  return res.data
}

export type { ListMeta }

export async function fetchInitialAssessmentCarePlanTriggers(
  serviceUserId: string,
  submissionId: string,
  init?: RequestInit,
): Promise<{ items: InitialAssessmentFlaggedItem[]; count: number }> {
  const res = await apiJson<
    ApiEnvelope<{ items: InitialAssessmentFlaggedItem[]; count: number }>
  >(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/care-plan-triggers`,
    { method: 'GET', ...init },
  )
  return res.data
}

export async function fetchInitialAssessmentHtml(
  serviceUserId: string,
  submissionId: string,
  options?: { includeSecureFields?: boolean },
  init?: RequestInit,
): Promise<{ html: string; filename: string }> {
  const base = getApiBaseUrl()
  const token = useAuthStore.getState().accessToken
  const qs = options?.includeSecureFields ? '?includeSecureFields=true' : ''
  const res = await fetch(
    `${base}/service-users/${serviceUserId}/initial-assessments/${submissionId}/html${qs}`,
    {
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    },
  )
  if (!res.ok) throw new ApiError('Could not load HTML preview', res.status)
  const html = await res.text()
  const disposition = res.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="([^"]+)"/)
  const filename = match?.[1] ?? `initial-assessment-${submissionId.slice(0, 8)}.html`
  return { html, filename }
}

export function downloadHtmlBlob(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadInitialAssessmentHtml(
  serviceUserId: string,
  submissionId: string,
  options?: { includeSecureFields?: boolean },
): Promise<void> {
  const { html, filename } = await fetchInitialAssessmentHtml(serviceUserId, submissionId, options)
  downloadHtmlBlob(html, filename)
}

export async function downloadInitialAssessmentPdf(
  serviceUserId: string,
  submissionId: string,
  options?: { includeSecureFields?: boolean },
): Promise<void> {
  const base = getApiBaseUrl()
  const token = useAuthStore.getState().accessToken
  const qs = options?.includeSecureFields ? '?includeSecureFields=true' : ''
  const res = await fetch(
    `${base}/service-users/${serviceUserId}/initial-assessments/${submissionId}/pdf${qs}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  )
  if (!res.ok) throw new ApiError('Could not download PDF', res.status)
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="([^"]+)"/)
  const filename = match?.[1] ?? `initial-assessment-${submissionId.slice(0, 8)}.pdf`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function fetchInitialAssessmentReviewQueue(
  options?: { overdueActionsOnly?: boolean; locationId?: string },
  init?: RequestInit,
): Promise<{ submissions: InitialAssessmentReviewQueueItem[]; total: number }> {
  const qs = new URLSearchParams()
  if (options?.overdueActionsOnly) qs.set('overdueActionsOnly', 'true')
  if (options?.locationId) qs.set('locationId', options.locationId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  const res = await apiJson<
    ApiEnvelope<{ submissions: InitialAssessmentReviewQueueItem[]; total: number }>
  >(`/initial-assessments/review-queue${suffix}`, { method: 'GET', ...init })
  return res.data
}

export type AcceptedCarePlanItem = {
  formId: string
  formName: string
  pictureUrl: string | null
  acceptedAt: string
  carePlanArea: string
}

export type UnresolvedAcceptedCarePlan = {
  recommendationId: string
  title: string
  carePlanArea: string
  acceptedAt: string
}

export type AcceptedCarePlansResponse = {
  items: AcceptedCarePlanItem[]
  acceptedRecommendationCount: number
  unresolved: UnresolvedAcceptedCarePlan[]
}

export async function fetchAcceptedCarePlans(
  serviceUserId: string,
  init?: RequestInit,
): Promise<AcceptedCarePlansResponse> {
  const res = await apiJson<ApiEnvelope<AcceptedCarePlansResponse>>(
    `/service-users/${serviceUserId}/initial-assessments/accepted-care-plans`,
    { method: 'GET', ...init },
  )
  return res.data
}

export async function decideInitialAssessmentCarePlanRecommendation(
  serviceUserId: string,
  submissionId: string,
  recommendationId: string,
  body: { decision: 'accepted' | 'declined'; reason?: string },
): Promise<void> {
  await apiJson(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/care-plan-recommendations/${recommendationId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}

export async function fetchInitialAssessmentCqcEvidence(
  serviceUserId: string,
  submissionId: string,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  const res = await apiJson<ApiEnvelope<Record<string, unknown>>>(
    `/service-users/${serviceUserId}/initial-assessments/${submissionId}/cqc-evidence`,
    { method: 'GET', ...init },
  )
  return res.data
}

export async function downloadInitialAssessmentCqcEvidence(
  serviceUserId: string,
  submissionId: string,
): Promise<void> {
  const data = await fetchInitialAssessmentCqcEvidence(serviceUserId, submissionId)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ia-cqc-evidence-${submissionId.slice(0, 8)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
