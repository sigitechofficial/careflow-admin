import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CarePlanComposeResult,
  CarePlanInstance,
  CarePlanPublishedVersionDetail,
  CarePlanPublishedVersionSummary,
} from '@/features/service-users/care-plans/types'

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

export async function createCarePlanDraftFromCompose(
  serviceUserId: string,
  formId: string,
): Promise<CarePlanInstance | null> {
  await ensureCarePlanInstance(serviceUserId, formId)
  const compose = await fetchCarePlanCompose(serviceUserId, formId)
  return saveCarePlanDraftApi(serviceUserId, formId, {
    values: compose.values,
    composedFrom: compose.composedFrom,
    gaps: compose.gaps,
  })
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
): Promise<CarePlanInstance[]> {
  const res = await apiJson<ApiEnvelope<CarePlanInstance[]>>(
    `/service-users/${serviceUserId}/care-plans`,
    { signal: options?.signal },
  )
  return res.data ?? []
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
  payload?: { summary?: string; gapAcknowledged?: boolean; signatures?: Record<string, unknown> },
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
