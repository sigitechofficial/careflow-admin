import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CarePlanComposeResult,
  CarePlanInstance,
  CarePlanPublishedVersionDetail,
  CarePlanPublishedVersionSummary,
  CarePlanReviewQueueItem,
  CarePlanReviewSummary,
  CarePlanRisks,
  CarePlanTaskReconciliation,
} from '@/features/service-users/care-plans/types'
import {
  clinicalValuesForCreatePlanDraft,
  mergeComposeProvenanceFromComposeResult,
  shouldReplaceDraftOnCreatePlan,
} from '@/features/service-users/care-plans/care-plan-suggestion-state'

export async function ensureCarePlanInstance(
  serviceUserId: string,
  formId: string,
): Promise<CarePlanInstance | null> {
  const res = await apiJson<ApiEnvelope<CarePlanInstance | null>>(
    `/service-users/${serviceUserId}/care-plans/${formId}/instance`,
    { method: 'POST' },
  )
  return res.data ?? null
}

export type CreateCarePlanDraftFromComposeResult = {
  instance: CarePlanInstance | null
  suggestionMode?: CarePlanComposeResult['suggestionMode']
}

export async function createCarePlanDraftFromCompose(
  serviceUserId: string,
  formId: string,
): Promise<CreateCarePlanDraftFromComposeResult> {
  const instance = await ensureCarePlanInstance(serviceUserId, formId)
  const compose = await fetchCarePlanCompose(serviceUserId, formId)
  const suggestionMode = compose.suggestionMode
  if (!shouldReplaceDraftOnCreatePlan(compose, Boolean(instance?.draft))) {
    return { instance, suggestionMode }
  }
  const saved = await saveCarePlanDraftApi(serviceUserId, formId, {
    values: clinicalValuesForCreatePlanDraft(compose),
    composedFrom: mergeComposeProvenanceFromComposeResult(compose),
    gaps: compose.gaps,
  })
  return { instance: saved, suggestionMode }
}

export async function fetchCarePlanCompose(
  serviceUserId: string,
  formId: string,
  options?: { signal?: AbortSignal },
): Promise<CarePlanComposeResult> {
  const res = await apiJson<ApiEnvelope<CarePlanComposeResult>>(
    `/service-users/${serviceUserId}/care-plans/${formId}/compose`,
    { signal: options?.signal },
  )
  if (!res.data) throw new Error('Compose result not available')
  return res.data
}

export async function fetchCarePlanInstances(
  serviceUserId: string,
  options?: { signal?: AbortSignal },
): Promise<{ instances: CarePlanInstance[]; reviewSummary: CarePlanReviewSummary | null }> {
  const res = await apiJson<ApiEnvelope<CarePlanInstance[]>>(
    `/service-users/${serviceUserId}/care-plans`,
    { signal: options?.signal },
  )
  const meta = (res.meta ?? null) as CarePlanReviewSummary | null
  return { instances: res.data ?? [], reviewSummary: meta }
}

export async function fetchCarePlanReviewQueue(params?: {
  status?: 'all' | 'overdue' | 'due_soon' | 'ok'
  serviceUserId?: string
  locationId?: string
  signal?: AbortSignal
}): Promise<{ items: CarePlanReviewQueueItem[]; meta: CarePlanReviewSummary & { total: number } }> {
  const qs = new URLSearchParams()
  if (params?.status && params.status !== 'all') qs.set('status', params.status)
  if (params?.serviceUserId) qs.set('serviceUserId', params.serviceUserId)
  if (params?.locationId) qs.set('locationId', params.locationId)
  const suffix = qs.toString() ? `?${qs}` : ''
  const res = await apiJson<
    ApiEnvelope<CarePlanReviewQueueItem[]> & {
      meta?: CarePlanReviewSummary & { total: number }
    }
  >(`/service-user-care-plans/review-queue${suffix}`, {
    method: 'GET',
    signal: params?.signal,
  })
  return {
    items: res.data ?? [],
    meta: res.meta ?? {
      total: res.data?.length ?? 0,
      carePlanReviewRequired: false,
      overdueCount: 0,
      dueSoonCount: 0,
      upToDateCount: 0,
    },
  }
}

export async function fetchCarePlanInstance(
  serviceUserId: string,
  formId: string,
  options?: { signal?: AbortSignal },
): Promise<CarePlanInstance | null> {
  const res = await apiJson<ApiEnvelope<CarePlanInstance | null>>(
    `/service-users/${serviceUserId}/care-plans/${formId}`,
    { signal: options?.signal },
  )
  return res.data ?? null
}

export async function saveCarePlanDraftApi(
  serviceUserId: string,
  formId: string,
  payload: {
    values: Record<string, string | boolean>
    composedFrom?: Record<string, unknown>
    gaps?: unknown[]
  },
): Promise<CarePlanInstance | null> {
  const res = await apiJson<ApiEnvelope<CarePlanInstance | null>>(
    `/service-users/${serviceUserId}/care-plans/${formId}/draft`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  )
  return res.data ?? null
}

export async function publishCarePlanApi(
  serviceUserId: string,
  formId: string,
  payload?: {
    summary?: string
    gapAcknowledged?: boolean
    signatures?: Record<string, unknown>
    /** Publishing for an incident "Care plan update" measure links the new version to it. */
    incidentActionId?: string
  },
): Promise<CarePlanInstance | null> {
  const res = await apiJson<ApiEnvelope<CarePlanInstance | null>>(
    `/service-users/${serviceUserId}/care-plans/${formId}/publish`,
    {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    },
  )
  return res.data ?? null
}

async function postCarePlanDraftAction(
  serviceUserId: string,
  formId: string,
  action: 'submit-for-approval' | 'approve' | 'request-changes',
  body: Record<string, unknown> = {},
): Promise<CarePlanInstance | null> {
  const res = await apiJson<ApiEnvelope<CarePlanInstance | null>>(
    `/service-users/${serviceUserId}/care-plans/${formId}/draft/${action}`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data ?? null
}

export const submitCarePlanForApprovalApi = (serviceUserId: string, formId: string) =>
  postCarePlanDraftAction(serviceUserId, formId, 'submit-for-approval')

/** `contentHash` is the submitted fingerprint the manager reviewed. */
export const approveCarePlanDraftApi = (serviceUserId: string, formId: string, contentHash: string) =>
  postCarePlanDraftAction(serviceUserId, formId, 'approve', { contentHash })

export const requestCarePlanChangesApi = (serviceUserId: string, formId: string, reason: string) =>
  postCarePlanDraftAction(serviceUserId, formId, 'request-changes', { reason })

/** Suspend / resume / archive a care plan (manager action; a reason is required). */
export async function changeCarePlanLifecycleApi(
  serviceUserId: string,
  formId: string,
  action: 'suspend' | 'resume' | 'archive',
  body: { reason: string; reviewConfirmed?: boolean },
): Promise<CarePlanInstance | null> {
  const res = await apiJson<ApiEnvelope<CarePlanInstance | null>>(
    `/service-users/${serviceUserId}/care-plans/${formId}/${action}`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  return res.data ?? null
}

export async function fetchCarePlanTaskReconciliation(
  serviceUserId: string,
  formId: string,
  options?: { signal?: AbortSignal },
): Promise<CarePlanTaskReconciliation | null> {
  const res = await apiJson<ApiEnvelope<CarePlanTaskReconciliation | null>>(
    `/service-users/${serviceUserId}/care-plans/${formId}/task-reconciliation`,
    { signal: options?.signal },
  )
  return res.data ?? null
}

/** Link / unlink / review / not-applicable (manager actions; visit tasks are never changed). */
export async function changeCarePlanTaskReconciliationApi(
  serviceUserId: string,
  formId: string,
  input:
    | { action: 'link'; visitTaskAssignmentId: string; requirementKey?: string }
    | { action: 'unlink'; linkId: string; reason?: string }
    | { action: 'review'; linkId: string }
    | { action: 'not_applicable'; requirementKey: string; reason: string },
): Promise<CarePlanTaskReconciliation | null> {
  const base = `/service-users/${serviceUserId}/care-plans/${formId}/task-reconciliation`
  const [path, body] =
    input.action === 'link'
      ? [`${base}/links`, { visitTaskAssignmentId: input.visitTaskAssignmentId, requirementKey: input.requirementKey }]
      : input.action === 'unlink'
        ? [`${base}/links/${input.linkId}/unlink`, { reason: input.reason }]
        : input.action === 'review'
          ? [`${base}/links/${input.linkId}/review`, {}]
          : [`${base}/not-applicable`, { requirementKey: input.requirementKey, reason: input.reason }]
  const res = await apiJson<ApiEnvelope<CarePlanTaskReconciliation | null>>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data ?? null
}

export async function fetchCarePlanRisks(
  serviceUserId: string,
  formId: string,
  options?: { signal?: AbortSignal },
): Promise<CarePlanRisks | null> {
  const res = await apiJson<ApiEnvelope<CarePlanRisks | null>>(
    `/service-users/${serviceUserId}/care-plans/${formId}/risks`,
    { signal: options?.signal },
  )
  return res.data ?? null
}

/** Link / unlink / review a risk, or resolve a reassessment flag (manager actions). */
export async function changeCarePlanRisksApi(
  serviceUserId: string,
  formId: string,
  input:
    | { action: 'link'; riskRecordId: string }
    | { action: 'unlink'; linkId: string }
    | { action: 'review'; linkId: string }
    | { action: 'resolve_flag'; flagId: string; note: string },
): Promise<CarePlanRisks | null> {
  const base = `/service-users/${serviceUserId}/care-plans/${formId}`
  const [path, body] =
    input.action === 'link'
      ? [`${base}/risks/links`, { riskRecordId: input.riskRecordId }]
      : input.action === 'unlink'
        ? [`${base}/risks/links/${input.linkId}/unlink`, {}]
        : input.action === 'review'
          ? [`${base}/risks/links/${input.linkId}/review`, {}]
          : [`${base}/reassessment-flags/${input.flagId}/resolve`, { note: input.note }]
  const res = await apiJson<ApiEnvelope<CarePlanRisks | null>>(path, { method: 'POST', body: JSON.stringify(body) })
  return res.data ?? null
}

export async function fetchCarePlanVersions(
  serviceUserId: string,
  formId: string,
  options?: { signal?: AbortSignal },
): Promise<CarePlanPublishedVersionSummary[]> {
  const res = await apiJson<ApiEnvelope<CarePlanPublishedVersionSummary[]>>(
    `/service-users/${serviceUserId}/care-plans/${formId}/versions`,
    { signal: options?.signal },
  )
  return res.data ?? []
}

export async function fetchCarePlanVersion(
  serviceUserId: string,
  formId: string,
  versionId: string,
  options?: { signal?: AbortSignal },
): Promise<CarePlanPublishedVersionDetail> {
  const res = await apiJson<ApiEnvelope<CarePlanPublishedVersionDetail>>(
    `/service-users/${serviceUserId}/care-plans/${formId}/versions/${versionId}`,
    { signal: options?.signal },
  )
  if (!res.data) throw new Error('Published version not found')
  return res.data
}
