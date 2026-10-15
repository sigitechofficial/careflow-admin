import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type NfcTagStatus = 'ACTIVE' | 'LOST' | 'RETIRED'

/** `GET /service-users/:id/nfc-tags` row. */
export type ServiceUserNfcTag = {
  id: string
  serviceUserId: string
  /** Normalised upper-case hex, e.g. 04A23B1C5D8000. */
  uid: string
  /** Colon-separated for display, e.g. 04:A2:3B:1C:5D:80:00. */
  uidDisplay: string
  label: string
  locationNote: string | null
  status: NfcTagStatus
  statusReason: string | null
  statusChangedAt: string | null
  lastScannedAt: string | null
  registeredAt: string
  registeredByName: string | null
  updatedAt: string
}

export type CreateNfcTagPayload = { uid: string; label: string; locationNote?: string }

export type UpdateNfcTagPayload = {
  label?: string
  locationNote?: string | null
  status?: NfcTagStatus
  statusReason?: string
}

export async function fetchServiceUserNfcTags(serviceUserId: string, signal?: AbortSignal) {
  const res = await apiJson<ApiEnvelope<ServiceUserNfcTag[]>>(`/service-users/${serviceUserId}/nfc-tags`, {
    signal,
  })
  return res.data ?? []
}

export async function createServiceUserNfcTag(serviceUserId: string, body: CreateNfcTagPayload) {
  const res = await apiJson<ApiEnvelope<ServiceUserNfcTag>>(`/service-users/${serviceUserId}/nfc-tags`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function updateServiceUserNfcTag(serviceUserId: string, tagId: string, body: UpdateNfcTagPayload) {
  const res = await apiJson<ApiEnvelope<ServiceUserNfcTag>>(`/service-users/${serviceUserId}/nfc-tags/${tagId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}

export async function deleteServiceUserNfcTag(serviceUserId: string, tagId: string) {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/nfc-tags/${tagId}`, { method: 'DELETE' })
}

export type NfcTagScanResult = 'ACCEPTED' | 'WRONG_CLIENT' | 'INACTIVE'

/** `GET /service-users/:id/nfc-tags/:tagId/scans` row (newest first). */
export type ServiceUserNfcTagScan = {
  id: string
  scannedAt: string
  result: NfcTagScanResult
  /** CHECK_IN (server) | APP_REPORT (caught by the app, possibly offline). */
  source: string
  carerName: string | null
  scheduledJobId: string
  visitName: string | null
  visitStart: string | null
  /** Set when the tag was scanned at another client's visit. */
  otherClientName: string | null
}

export async function fetchServiceUserNfcTagScans(
  serviceUserId: string,
  tagId: string,
  signal?: AbortSignal,
) {
  const res = await apiJson<ApiEnvelope<ServiceUserNfcTagScan[]>>(
    `/service-users/${serviceUserId}/nfc-tags/${tagId}/scans`,
    { signal },
  )
  return res.data ?? []
}
