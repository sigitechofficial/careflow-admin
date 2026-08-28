import { apiJson, ApiError, type ApiEnvelope } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import type {
  IncidentAttachmentItem,
  IncidentInjury,
  IncidentPersonKind,
  IncidentInjurySeverity,
  IncidentRelatedCareRecord,
  IncidentRelatedLink,
  IncidentRelatedRecordStatus,
  IncidentRelatedRecordType,
  IncidentWitness,
  ServiceUserIncidentHistory,
} from '@/features/incidents/types'

// --- injuries ---
export async function addIncidentInjury(
  incidentId: string,
  input: {
    personKind: IncidentPersonKind
    personServiceUserId?: string
    personEmployeeId?: string
    personName?: string
    injurySeverity: IncidentInjurySeverity
    injuryType: string
    bodyRegion?: string
    side?: string
    notes?: string
    measurements?: string
    bodyMapRecordId?: string
  },
): Promise<IncidentInjury> {
  const res = await apiJson<ApiEnvelope<IncidentInjury>>(`/incidents/${incidentId}/injuries`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function deleteIncidentInjury(injuryId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/incidents/injuries/${injuryId}`, { method: 'DELETE' })
}

// --- witnesses ---
export async function addIncidentWitness(
  incidentId: string,
  input: {
    personKind: IncidentPersonKind
    personName?: string
    statement?: string
    statementDate?: string
  },
): Promise<IncidentWitness> {
  const res = await apiJson<ApiEnvelope<IncidentWitness>>(`/incidents/${incidentId}/witnesses`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function deleteIncidentWitness(witnessId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/incidents/witnesses/${witnessId}`, { method: 'DELETE' })
}

// --- related care records ---
export async function addRelatedCareRecord(
  incidentId: string,
  input: { recordType: IncidentRelatedRecordType; referenceLabel: string; note?: string },
): Promise<IncidentRelatedCareRecord> {
  const res = await apiJson<ApiEnvelope<IncidentRelatedCareRecord>>(`/incidents/${incidentId}/care-records`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function updateRelatedCareRecord(
  recordId: string,
  input: { status?: IncidentRelatedRecordStatus; updatedByLabel?: string; note?: string },
): Promise<IncidentRelatedCareRecord> {
  const res = await apiJson<ApiEnvelope<IncidentRelatedCareRecord>>(`/incidents/care-records/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function deleteRelatedCareRecord(recordId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/incidents/care-records/${recordId}`, { method: 'DELETE' })
}

// --- related incidents ---
export async function fetchRelatedIncidents(incidentId: string, init?: RequestInit): Promise<IncidentRelatedLink[]> {
  const res = await apiJson<ApiEnvelope<IncidentRelatedLink[]>>(`/incidents/${incidentId}/related-incidents`, {
    method: 'GET',
    ...init,
  })
  return res.data ?? []
}

export async function linkRelatedIncident(
  incidentId: string,
  relatedIncidentId: string,
  note?: string,
): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/incidents/${incidentId}/related-incidents`, {
    method: 'POST',
    body: JSON.stringify({ relatedIncidentId, note }),
  })
}

export async function unlinkRelatedIncident(linkId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/incidents/related-incidents/${linkId}`, { method: 'DELETE' })
}

// --- attachments ---
export async function fetchIncidentAttachments(
  incidentId: string,
  init?: RequestInit,
): Promise<IncidentAttachmentItem[]> {
  const res = await apiJson<ApiEnvelope<IncidentAttachmentItem[]>>(`/incidents/${incidentId}/attachments`, {
    method: 'GET',
    ...init,
  })
  return res.data ?? []
}

export async function uploadIncidentAttachment(
  incidentId: string,
  file: File,
  category: string,
): Promise<IncidentAttachmentItem> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const form = new FormData()
  form.append('file', file)
  form.append('category', category)
  const res = await fetch(`${base}/incidents/${incidentId}/attachments`, {
    method: 'POST',
    headers,
    body: form,
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg =
      body && typeof body === 'object' && 'message' in body ? String(body.message) : res.statusText
    throw new ApiError(msg || 'Upload failed', res.status, body)
  }
  return (body as ApiEnvelope<IncidentAttachmentItem>).data
}

export async function deleteIncidentAttachment(attachmentId: string): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/incidents/attachments/${attachmentId}`, { method: 'DELETE' })
}

/** Fetches the protected file with the bearer token and triggers a browser download. */
export async function downloadIncidentAttachment(attachment: IncidentAttachmentItem): Promise<void> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured.', 0)
  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`${base}${attachment.downloadUrl}`, { headers })
  if (!res.ok) throw new ApiError('Download failed', res.status)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = attachment.originalName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// --- service user history ---
export async function fetchServiceUserIncidentHistory(
  serviceUserId: string,
  init?: RequestInit,
): Promise<ServiceUserIncidentHistory> {
  const res = await apiJson<ApiEnvelope<ServiceUserIncidentHistory>>(
    `/incidents/service-user/${serviceUserId}/history`,
    { method: 'GET', ...init },
  )
  return res.data
}
