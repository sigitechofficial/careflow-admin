import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { ApiError, apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type ServiceUserDocumentAccessLevel =
  | 'MANAGER_ONLY'
  | 'COORDINATOR_MANAGER'
  | 'CARER_SUMMARY'
  | 'ALL_USERS'

export type ServiceUserDocumentRecordStatus =
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'EXPIRED'
  | 'REQUESTED'
  | 'NOT_APPLICABLE'

export type ServiceUserDocumentTypeRow = {
  id: string
  code: string
  name: string
  physicalLocationInHomeRequired: boolean
  expiryTrackingRequired: boolean
  defaultAccessLevel: ServiceUserDocumentAccessLevel
  requiredBeforeFirstVisit: boolean
  blocksCarePlanApprovalIfMissing: boolean
  expiryAlertDays: number | null
  cqcLegalStandard: string | null
  sortOrder: number
}

export type ServiceUserDocumentRecordRow = {
  id: string
  serviceUserId: string
  documentTypeId: string
  title: string
  documentDate: string
  uploadedAt: string
  uploadedById: string | null
  uploadedByName: string | null
  supersedesDocumentId: string | null
  expiryDate: string | null
  physicalLocationInHome: string | null
  accessLevel: ServiceUserDocumentAccessLevel
  status: ServiceUserDocumentRecordStatus
  linkedRecordType: string | null
  linkedRecordId: string | null
  notes: string | null
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
  createdAt: string
  updatedAt: string
  documentType: ServiceUserDocumentTypeRow
}

export type DocumentComplianceTone = 'green' | 'red' | 'amber'

export type DocumentComplianceItem = {
  key: string
  label: string
  tone: DocumentComplianceTone
  statusLabel: string
  blocksCarePlanApproval: boolean
  detail?: string
}

export type ServiceUserDocumentStoreResponse = {
  documentTypes: ServiceUserDocumentTypeRow[]
  documents: ServiceUserDocumentRecordRow[]
  compliance: DocumentComplianceItem[]
  carePlanApprovalBlocked: boolean
  medicationSupportRequired: boolean
}

export async function fetchServiceUserDocumentTypes(init?: RequestInit): Promise<ServiceUserDocumentTypeRow[]> {
  const res = await apiJson<ApiEnvelope<ServiceUserDocumentTypeRow[]>>('/service-user-document-types', {
    method: 'GET',
    ...init,
  })
  return res.data
}

export async function fetchServiceUserDocumentStore(
  serviceUserId: string,
  init?: RequestInit,
): Promise<ServiceUserDocumentStoreResponse> {
  const res = await apiJson<ApiEnvelope<ServiceUserDocumentStoreResponse>>(
    `/service-users/${serviceUserId}/document-store`,
    { method: 'GET', ...init },
  )
  return res.data
}

export type CreateServiceUserDocumentRecordPayload = {
  file: File
  documentTypeId: string
  title: string
  documentDate: string
  expiryDate?: string
  physicalLocationInHome?: string
  accessLevel?: ServiceUserDocumentAccessLevel
  status?: ServiceUserDocumentRecordStatus
  supersedesDocumentId?: string
  linkedRecordType?: string
  linkedRecordId?: string
  notes?: string
}

export async function uploadServiceUserDocumentRecord(
  serviceUserId: string,
  payload: CreateServiceUserDocumentRecordPayload,
): Promise<ServiceUserDocumentRecordRow> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)

  const form = new FormData()
  form.append('file', payload.file)
  form.append('documentTypeId', payload.documentTypeId)
  form.append('title', payload.title.trim())
  form.append('documentDate', payload.documentDate)
  if (payload.expiryDate) form.append('expiryDate', payload.expiryDate)
  if (payload.physicalLocationInHome?.trim()) {
    form.append('physicalLocationInHome', payload.physicalLocationInHome.trim())
  }
  if (payload.accessLevel) form.append('accessLevel', payload.accessLevel)
  if (payload.status) form.append('status', payload.status)
  if (payload.supersedesDocumentId) form.append('supersedesDocumentId', payload.supersedesDocumentId)
  if (payload.linkedRecordType?.trim()) form.append('linkedRecordType', payload.linkedRecordType.trim())
  if (payload.linkedRecordId) form.append('linkedRecordId', payload.linkedRecordId)
  if (payload.notes?.trim()) form.append('notes', payload.notes.trim())

  const token = useAuthStore.getState().accessToken
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${base}/service-users/${serviceUserId}/document-store`, {
    method: 'POST',
    headers,
    body: form,
  })
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
  const envelope = bodyJson as ApiEnvelope<ServiceUserDocumentRecordRow>
  if (!envelope.data) throw new ApiError('Upload succeeded but response was unexpected.', res.status, bodyJson)
  return envelope.data
}

export type UpdateServiceUserDocumentRecordPayload = Partial<{
  title: string
  documentDate: string
  expiryDate: string | null
  physicalLocationInHome: string | null
  accessLevel: ServiceUserDocumentAccessLevel
  status: ServiceUserDocumentRecordStatus
  supersedesDocumentId: string | null
  linkedRecordType: string | null
  linkedRecordId: string | null
  notes: string | null
}>

export async function updateServiceUserDocumentRecord(
  serviceUserId: string,
  documentId: string,
  body: UpdateServiceUserDocumentRecordPayload,
): Promise<ServiceUserDocumentRecordRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserDocumentRecordRow>>(
    `/service-users/${serviceUserId}/document-store/${documentId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res.data
}

export async function deleteServiceUserDocumentRecord(
  serviceUserId: string,
  documentId: string,
): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/document-store/${documentId}`, {
    method: 'DELETE',
  })
}

export async function downloadServiceUserDocumentRecord(
  serviceUserId: string,
  documentId: string,
  fallbackName?: string,
): Promise<void> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)

  const token = useAuthStore.getState().accessToken
  const res = await fetch(`${base}/service-users/${serviceUserId}/document-store/${documentId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    let message = res.statusText || 'Download failed'
    try {
      const body = (await res.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // ignore non-json error bodies
    }
    throw new ApiError(message, res.status)
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="([^"]+)"/)
  const filename = match?.[1]
    ? decodeURIComponent(match[1])
    : fallbackName?.trim() || 'document'

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const ACCESS_LEVEL_LABELS: Record<ServiceUserDocumentAccessLevel, string> = {
  MANAGER_ONLY: 'Manager only',
  COORDINATOR_MANAGER: 'Coordinator + manager',
  CARER_SUMMARY: 'Carer-visible (summary)',
  ALL_USERS: 'All users',
}

export const DOCUMENT_STATUS_LABELS: Record<ServiceUserDocumentRecordStatus, string> = {
  ACTIVE: 'Active',
  SUPERSEDED: 'Superseded',
  EXPIRED: 'Expired',
  REQUESTED: 'Requested',
  NOT_APPLICABLE: 'Not applicable',
}
