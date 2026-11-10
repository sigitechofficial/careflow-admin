import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type MedicationSupportProfile = {
  id: string
  serviceUserId: string
  selfAdministersMedication: boolean
  requiresPrompting: boolean
  requiresSupervision: boolean
  requiresCarerAdministration: boolean
  familyMemberOrCarerSupportsMedication: boolean
  /** Where medicines are kept in the property (carer visit overview). */
  storageLocation: string | null
  notes: string | null
  isActive: boolean
  /** The level carers and the medication care plan use, from the assessment (§9). Null when not recorded. */
  assessmentSupportLevel?: { label: string; pendingReview: boolean } | null
}

export type UpdateMedicationSupportProfilePayload = {
  selfAdministersMedication?: boolean
  requiresPrompting?: boolean
  requiresSupervision?: boolean
  requiresCarerAdministration?: boolean
  familyMemberOrCarerSupportsMedication?: boolean
  storageLocation?: string | null
  notes?: string | null
}

function unwrap<T>(res: ApiEnvelope<T> | { data: T } | T): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return (res as { data: T }).data
  }
  return res as T
}

export async function getMedicationSupportProfile(
  serviceUserId: string,
  init?: RequestInit,
): Promise<MedicationSupportProfile> {
  const res = await apiJson<ApiEnvelope<MedicationSupportProfile> | { data: MedicationSupportProfile }>(
    `/service-users/${serviceUserId}/medication-support-profile`,
    { method: 'GET', ...init },
  )
  return unwrap(res)
}

export async function patchMedicationSupportProfile(
  serviceUserId: string,
  body: UpdateMedicationSupportProfilePayload,
): Promise<MedicationSupportProfile> {
  const res = await apiJson<ApiEnvelope<MedicationSupportProfile> | { data: MedicationSupportProfile }>(
    `/service-users/${serviceUserId}/medication-support-profile`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
  return unwrap(res)
}
