import { ApiError, apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type ObservationValueKind = 'NUMERIC' | 'WELLBEING' | 'COMPOSITE'

export type ObservationTypeRow = {
  id: string
  code: string
  name: string
  sortOrder: number
  valueKind: ObservationValueKind
  usesNews2: boolean
  unitLabel: string | null
}

export type ObservationShareTargetRow = {
  id: string
  code: string
  name: string
  sortOrder: number
}

export type WellbeingScaleDimension = {
  id: string
  code: string
  name: string
  sortOrder: number
  levels: { level: number; label: string }[]
}

export type ServiceUserObservationRow = {
  id: string
  serviceUserId: string
  observationType: {
    id: string
    code: string
    name: string
    valueKind: ObservationValueKind
    usesNews2: boolean
    unitLabel: string | null
  }
  recordedAt: string
  notes: string | null
  numericValue: number | null
  unit: string | null
  payload: Record<string, unknown> | null
  shareTargets: { code: string; name: string }[]
  wellbeingScores: { dimensionCode: string; dimensionName: string; level: number }[]
  carerName: string | null
  createdAt: string
  updatedAt: string
}

export type CreateServiceUserObservationPayload = {
  observationTypeCode: string
  recordedAt: string
  notes?: string
  numericValue?: number
  unit?: string
  payload?: Record<string, unknown>
  shareTargetCodes?: string[]
  wellbeingScores?: { dimensionCode: string; level: number }[]
}

export async function fetchObservationTypes(): Promise<ObservationTypeRow[]> {
  const res = await apiJson<ApiEnvelope<ObservationTypeRow[]>>('/observation-lookups/types', {
    method: 'GET',
  })
  return res.data
}

export async function fetchObservationShareTargets(): Promise<ObservationShareTargetRow[]> {
  const res = await apiJson<ApiEnvelope<ObservationShareTargetRow[]>>('/observation-lookups/share-targets', {
    method: 'GET',
  })
  return res.data
}

export async function fetchWellbeingScale(): Promise<WellbeingScaleDimension[]> {
  const res = await apiJson<ApiEnvelope<WellbeingScaleDimension[]>>('/observation-lookups/wellbeing-scale', {
    method: 'GET',
  })
  return res.data
}

export async function listServiceUserObservations(
  serviceUserId: string,
  params?: { typeCode?: string },
): Promise<ServiceUserObservationRow[]> {
  const q = new URLSearchParams()
  if (params?.typeCode) q.set('typeCode', params.typeCode)
  const qs = q.toString()
  const res = await apiJson<ApiEnvelope<ServiceUserObservationRow[]>>(
    `/service-users/${serviceUserId}/observations${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
  )
  return res.data
}

export async function createServiceUserObservation(
  serviceUserId: string,
  payload: CreateServiceUserObservationPayload,
): Promise<ServiceUserObservationRow> {
  const res = await apiJson<ApiEnvelope<ServiceUserObservationRow>>(
    `/service-users/${serviceUserId}/observations`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
  if (!res.data) throw new ApiError('No data returned', 500)
  return res.data
}
