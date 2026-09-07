import { ApiError, apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import type {
  BodyMapAlertRow,
  BodyMapGovernanceAlertRow,
  BodyMapLink,
  BodyMapLinkedModule,
  BodyMapRecordRow,
  BodyMapReviewQueueRecord,
  BodyMapSummary,
  BodyMapMedicationSitePayload,
  BodyMapPressureAssessmentPayload,
  BodyMapWoundAssessmentPayload,
  BodyMapWoundReviewPayload,
  CloseBodyMapRecordPayload,
  CreateBodyMapRecordPayload,
  MedicationBodyMapSiteLookup,
} from '@/features/service-users/body-map/types'

export async function fetchServiceUserBodyMap(
  serviceUserId: string,
  opts?: { includeResolved?: boolean; signal?: AbortSignal },
): Promise<{ records: BodyMapRecordRow[] }> {
  const q = opts?.includeResolved ? '?includeResolved=true' : ''
  const res = await apiJson<ApiEnvelope<{ records: BodyMapRecordRow[] }>>(
    `/service-users/${serviceUserId}/body-map${q}`,
    { method: 'GET', signal: opts?.signal },
  )
  return res.data
}

export async function fetchBodyMapSummary(
  serviceUserId: string,
  signal?: AbortSignal,
): Promise<BodyMapSummary> {
  const res = await apiJson<ApiEnvelope<BodyMapSummary>>(
    `/service-users/${serviceUserId}/body-map/summary`,
    { method: 'GET', signal },
  )
  return res.data
}

export async function fetchPatchRotationCheck(
  serviceUserId: string,
  opts: {
    bodyView: string
    x: number
    y: number
    excludeRecordId?: string
    signal?: AbortSignal
  },
): Promise<{ warnings: string[] }> {
  const q = new URLSearchParams({
    bodyView: opts.bodyView,
    x: String(opts.x),
    y: String(opts.y),
  })
  if (opts.excludeRecordId) q.set('excludeRecordId', opts.excludeRecordId)
  const res = await apiJson<ApiEnvelope<{ warnings: string[] }>>(
    `/service-users/${serviceUserId}/body-map/patch-rotation-check?${q}`,
    { method: 'GET', signal: opts.signal },
  )
  return res.data ?? { warnings: [] }
}

export async function createBodyMapRecord(
  payload: CreateBodyMapRecordPayload,
): Promise<BodyMapRecordRow & { warnings?: string[] }> {
  const res = await apiJson<ApiEnvelope<BodyMapRecordRow & { warnings?: string[] }>>(
    '/body-map/records',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
  if (!res.data) throw new ApiError('No data returned', 500)
  return res.data
}

export async function closeBodyMapRecord(
  recordId: string,
  payload: CloseBodyMapRecordPayload,
): Promise<BodyMapRecordRow> {
  const res = await apiJson<ApiEnvelope<BodyMapRecordRow>>(`/body-map/records/${recordId}/close`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.data) throw new ApiError('No data returned', 500)
  return res.data
}

export async function addBodyMapReview(
  recordId: string,
  payload: BodyMapWoundReviewPayload | { conditionStatus: string; reviewNote?: string; nextReviewAt?: string },
): Promise<BodyMapRecordRow> {
  const res = await apiJson<ApiEnvelope<BodyMapRecordRow>>(`/body-map/records/${recordId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.data) throw new ApiError('No data returned', 500)
  return res.data
}

export async function fetchBodyMapAlerts(
  serviceUserId: string,
  signal?: AbortSignal,
): Promise<BodyMapAlertRow[]> {
  const res = await apiJson<ApiEnvelope<BodyMapAlertRow[]>>(
    `/service-users/${serviceUserId}/body-map/alerts`,
    { method: 'GET', signal },
  )
  return res.data ?? []
}

export async function dismissBodyMapAlert(
  serviceUserId: string,
  alertId: string,
): Promise<{ id: string; dismissedAt: string }> {
  const res = await apiJson<ApiEnvelope<{ id: string; dismissedAt: string }>>(
    `/service-users/${serviceUserId}/body-map/alerts/${alertId}/dismiss`,
    { method: 'PATCH' },
  )
  if (!res.data) throw new ApiError('No data returned', 500)
  return res.data
}

export async function fetchBodyMapGovernanceAlerts(
  signal?: AbortSignal,
): Promise<{ total: number; alerts: BodyMapGovernanceAlertRow[] }> {
  const res = await apiJson<
    ApiEnvelope<{ total: number; alerts: BodyMapGovernanceAlertRow[] }>
  >('/body-map/governance-alerts', { method: 'GET', signal })
  return res.data ?? { total: 0, alerts: [] }
}

export async function fetchBodyMapReviewQueue(opts?: {
  overdueOnly?: boolean
  serviceUserId?: string
  locationId?: string
  signal?: AbortSignal
}): Promise<{ records: BodyMapReviewQueueRecord[]; total: number }> {
  const params = new URLSearchParams()
  if (opts?.overdueOnly) params.set('overdueOnly', 'true')
  if (opts?.serviceUserId) params.set('serviceUserId', opts.serviceUserId)
  if (opts?.locationId) params.set('locationId', opts.locationId)
  const q = params.toString() ? `?${params}` : ''
  const res = await apiJson<ApiEnvelope<{ records: BodyMapReviewQueueRecord[]; total: number }>>(
    `/body-map/review-queue${q}`,
    { method: 'GET', signal: opts?.signal },
  )
  return res.data
}

export async function uploadBodyMapPhoto(
  recordId: string,
  file: File,
  consentStatus: 'GRANTED' | 'DENIED' | 'PENDING',
  caption?: string,
): Promise<{ id: string; fileUrl: string }> {
  const base = getApiBaseUrl()
  const token = useAuthStore.getState().accessToken
  const form = new FormData()
  form.append('file', file)
  form.append('consentStatus', consentStatus)
  if (caption) form.append('caption', caption)
  const res = await fetch(`${base}/body-map/records/${recordId}/photos`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const json = (await res.json()) as ApiEnvelope<{ id: string; fileUrl: string }>
  if (!res.ok) throw new ApiError(json.message ?? 'Upload failed', res.status, json)
  if (!json.data) throw new ApiError('No data returned', 500)
  return json.data
}

export async function saveBodyMapWoundAssessment(
  recordId: string,
  payload: BodyMapWoundAssessmentPayload,
): Promise<BodyMapRecordRow> {
  const res = await apiJson<ApiEnvelope<BodyMapRecordRow>>(
    `/body-map/records/${recordId}/wound-assessment`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
  if (!res.data) throw new ApiError('No data returned', 500)
  return res.data
}

export async function saveBodyMapPressureAssessment(
  recordId: string,
  payload: BodyMapPressureAssessmentPayload,
): Promise<BodyMapRecordRow> {
  const res = await apiJson<ApiEnvelope<BodyMapRecordRow>>(
    `/body-map/records/${recordId}/pressure-assessment`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
  if (!res.data) throw new ApiError('No data returned', 500)
  return res.data
}

export async function saveBodyMapMedicationSite(
  recordId: string,
  payload: BodyMapMedicationSitePayload,
): Promise<BodyMapRecordRow> {
  const res = await apiJson<ApiEnvelope<BodyMapRecordRow>>(
    `/body-map/records/${recordId}/medication-site`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
  if (!res.data) throw new ApiError('No data returned', 500)
  return res.data
}

export async function patchBodyMapMedicationSiteAdministration(
  recordId: string,
  lastAdministrationEventId: string | null,
): Promise<BodyMapRecordRow> {
  const res = await apiJson<ApiEnvelope<BodyMapRecordRow>>(
    `/body-map/records/${recordId}/medication-site/administration`,
    {
      method: 'PATCH',
      body: JSON.stringify({ lastAdministrationEventId }),
    },
  )
  if (!res.data) throw new ApiError('No data returned', 500)
  return res.data
}

export async function fetchMedicationBodyMapSite(
  serviceUserId: string,
  medicationId: string,
  signal?: AbortSignal,
): Promise<MedicationBodyMapSiteLookup> {
  const res = await apiJson<ApiEnvelope<MedicationBodyMapSiteLookup>>(
    `/service-users/${serviceUserId}/medications/${medicationId}/body-map-site`,
    { method: 'GET', signal },
  )
  return res.data
}

export async function addBodyMapLink(
  recordId: string,
  payload: { linkedModule: BodyMapLinkedModule; linkedRecordId: string; label?: string },
): Promise<BodyMapLink> {
  const res = await apiJson<ApiEnvelope<BodyMapLink>>(`/body-map/records/${recordId}/link`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.data) throw new ApiError('No data returned', 500)
  return res.data
}

export type BodyMapHandoverPreview = {
  serviceUserId: string
  generatedAt: string
  activeCount: number
  highRiskCount: number
  safeguardingCount: number
  reviewDueCount: number
  concerns: {
    recordId: string
    recordType: string
    subType: string | null
    riskLevel: string
    status: string
    bodyPart: string | null
    specificLocation: string | null
    bodyView: string | null
    nextReviewAt: string | null
    reviewOverdue: boolean
    safeguardingTriggered: boolean
    descriptionPreview: string | null
  }[]
  patchSites: {
    recordId: string
    medicineName: string | null
    bodyPart: string | null
    nextChangeDue: string | null
    marMedicationId: string
  }[]
}

export async function fetchBodyMapHandover(
  serviceUserId: string,
  signal?: AbortSignal,
): Promise<BodyMapHandoverPreview> {
  const res = await apiJson<ApiEnvelope<BodyMapHandoverPreview>>(
    `/service-users/${serviceUserId}/body-map/handover`,
    { method: 'GET', signal },
  )
  return res.data
}

export async function fetchBodyMapExport(serviceUserId: string): Promise<Record<string, unknown>> {
  const res = await apiJson<ApiEnvelope<Record<string, unknown>>>(
    `/service-users/${serviceUserId}/body-map/export`,
    { method: 'GET' },
  )
  return res.data
}

export type BodyMapCqcRecordEvidence = {
  format: string
  generatedAt: string
  serviceUser: {
    id: string
    name: string
    dateOfBirth: string | null
    serviceUserNumber: string | null
  } | null
  record: BodyMapRecordRow
  auditTrail: { id: string; action: string; actorName: string | null; createdAt: string }[]
  outstandingGaps: { recordId: string; code: string; message: string }[]
}

export async function fetchBodyMapRecordCqcEvidence(
  recordId: string,
): Promise<BodyMapCqcRecordEvidence> {
  const res = await apiJson<ApiEnvelope<BodyMapCqcRecordEvidence>>(
    `/body-map/records/${recordId}/cqc-evidence`,
    { method: 'GET' },
  )
  return res.data
}

export type BodyMapAnalytics = {
  generatedAt: string
  totals: {
    activeCount: number
    reviewDueCount: number
    highRiskCount: number
    safeguardingCount: number
    reviewQueueCount: number
    outstandingGapCount: number
  }
  byRecordType: { recordType: string; count: number }[]
  gapCodes: Record<string, number>
}

export async function fetchBodyMapAnalytics(signal?: AbortSignal): Promise<BodyMapAnalytics> {
  const res = await apiJson<ApiEnvelope<BodyMapAnalytics>>(`/body-map/analytics`, {
    method: 'GET',
    signal,
  })
  return res.data
}

export async function downloadBodyMapCqcPdf(serviceUserId: string): Promise<void> {
  const base = getApiBaseUrl()
  const token = useAuthStore.getState().accessToken
  const res = await fetch(`${base}/service-users/${serviceUserId}/body-map/export/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Could not download PDF')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `body-map-cqc-${serviceUserId.slice(0, 8)}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export async function fetchBodyMapAudit(recordId: string): Promise<{
  entries: { id: string; action: string; actorName: string | null; createdAt: string }[]
}> {
  const res = await apiJson<
    ApiEnvelope<{ entries: { id: string; action: string; actorName: string | null; createdAt: string }[] }>
  >(`/body-map/audit/${recordId}`, { method: 'GET' })
  return res.data
}

export type BodyMapLookups = {
  recordTypes: {
    code: string
    label: string
    markerColorHex?: string | null
    subTypes: { name: string; code: string; markerColorHex?: string | null }[]
  }[]
  woundTypes: { value: string; label: string }[]
  bodyParts: string[]
  bodyViews: string[]
  riskLevels: string[]
  medicationSubTypeByMarTypeCode: Record<string, string>
}

export async function fetchBodyMapLookups(signal?: AbortSignal): Promise<BodyMapLookups> {
  const res = await apiJson<ApiEnvelope<BodyMapLookups>>('/body-map/lookups', {
    method: 'GET',
    signal,
  })
  return res.data
}
