import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { MedicationStatusCodeRow } from '@/features/service-users/api/medication-mar.api'

export type UpdateMedicationStatusCodePayload = {
  label?: string
  color?: string
  textColor?: string
  reasonRequirement?: string
  managerReviewRequirement?: string
  sortOrder?: number
  isActive?: boolean
}

export async function listMedicationStatusCodesAdmin(
  init?: RequestInit,
): Promise<{ data: MedicationStatusCodeRow[]; meta: { total: number } }> {
  const res = await apiJson<
    ApiEnvelope<MedicationStatusCodeRow[]> | { data: MedicationStatusCodeRow[]; meta?: { total?: number } }
  >('/medication-status-codes?limit=100&sortBy=sortOrder&sortOrder=asc', { method: 'GET', ...init })
  const payload =
    res && typeof res === 'object' && 'success' in res
      ? { data: (res as ApiEnvelope<MedicationStatusCodeRow[]>).data, meta: (res as ApiEnvelope<MedicationStatusCodeRow[]>).meta }
      : (res as { data: MedicationStatusCodeRow[]; meta?: { total?: number } })
  const meta = payload.meta as { total?: number } | undefined
  return {
    data: payload.data ?? [],
    meta: { total: meta?.total ?? payload.data?.length ?? 0 },
  }
}

export async function patchMedicationStatusCode(
  id: string,
  body: UpdateMedicationStatusCodePayload,
): Promise<MedicationStatusCodeRow> {
  const res = await apiJson<ApiEnvelope<MedicationStatusCodeRow> | MedicationStatusCodeRow>(
    `/medication-status-codes/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res && typeof res === 'object' && 'data' in res
    ? (res as ApiEnvelope<MedicationStatusCodeRow>).data
    : (res as MedicationStatusCodeRow)
}

export type MedicationRoundRow = {
  id: string
  name: string
  code: string
  time: string
  windowStart: string | null
  windowEnd: string | null
  sortOrder: number
  isActive: boolean
}

export type UpdateMedicationRoundPayload = {
  name?: string
  time?: string
  windowStart?: string
  windowEnd?: string
  sortOrder?: number
  isActive?: boolean
}

export async function listMedicationRoundsAdmin(
  init?: RequestInit,
): Promise<MedicationRoundRow[]> {
  const res = await apiJson<ApiEnvelope<MedicationRoundRow[]> | { data: MedicationRoundRow[] }>(
    '/medication-administration-rounds',
    { method: 'GET', ...init },
  )
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as { data: MedicationRoundRow[] }).data ?? []
  }
  return []
}

/** Active rounds for MAR / add-medication (lookups bundle). */
export async function listMedicationRounds(init?: RequestInit): Promise<MedicationRoundRow[]> {
  const res = await apiJson<ApiEnvelope<MedicationRoundRow[]> | MedicationRoundRow[]>(
    '/medication-lookups/rounds',
    { method: 'GET', ...init },
  )
  if (Array.isArray(res)) return res
  return (res as ApiEnvelope<MedicationRoundRow[]>).data ?? []
}

export async function patchMedicationRound(
  id: string,
  body: UpdateMedicationRoundPayload,
): Promise<MedicationRoundRow> {
  const res = await apiJson<ApiEnvelope<MedicationRoundRow> | { data: MedicationRoundRow }>(
    `/medication-administration-rounds/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return res && typeof res === 'object' && 'data' in res
    ? (res as { data: MedicationRoundRow }).data
    : (res as MedicationRoundRow)
}
