import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

/**
 * Medicine allergies: the medicine-type entries in the person's one allergy list (ServiceUserAllergy).
 * The API keeps this endpoint for the Meds tab; it reads and writes the same list as Profile → Allergies.
 */
export type MedicationAllergyRow = {
  id: string
  serviceUserId: string
  allergyName: string
  reaction: string | null
  severity: string | null
  notes: string | null
  recordedAt?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

function unwrapList<T>(res: ApiEnvelope<T[]> | { data: T[] } | T[]): T[] {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object' && 'data' in res && Array.isArray((res as { data: T[] }).data)) {
    return (res as { data: T[] }).data
  }
  return []
}

/** Normalize Nest/Prisma row shapes (allergyName vs swagger `allergen`). */
function normalizeRow(raw: Record<string, unknown>): MedicationAllergyRow | null {
  const id = typeof raw.id === 'string' ? raw.id : null
  const serviceUserId = typeof raw.serviceUserId === 'string' ? raw.serviceUserId : null
  const allergyName =
    (typeof raw.allergyName === 'string' && raw.allergyName) ||
    (typeof raw.allergen === 'string' && raw.allergen) ||
    null
  if (!id || !serviceUserId || !allergyName) return null
  return {
    id,
    serviceUserId,
    allergyName,
    reaction: typeof raw.reaction === 'string' ? raw.reaction : raw.reaction == null ? null : String(raw.reaction),
    severity: typeof raw.severity === 'string' ? raw.severity : raw.severity == null ? null : String(raw.severity),
    notes: typeof raw.notes === 'string' ? raw.notes : raw.notes == null ? null : String(raw.notes),
    recordedAt: typeof raw.recordedAt === 'string' ? raw.recordedAt : undefined,
    isActive: typeof raw.isActive === 'boolean' ? raw.isActive : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  }
}

export async function listMedicationAllergies(
  serviceUserId: string,
  init?: RequestInit,
): Promise<MedicationAllergyRow[]> {
  const res = await apiJson<
    ApiEnvelope<Record<string, unknown>[]> | { data: Record<string, unknown>[] } | Record<string, unknown>[]
  >(`/service-users/${serviceUserId}/medication-allergies`, { method: 'GET', ...init })
  return unwrapList(res)
    .map((row) => normalizeRow(row))
    .filter((row): row is MedicationAllergyRow => row != null)
}

export type CreateMedicationAllergyInput = {
  allergyName: string
  reaction?: string
  severity?: string
  notes?: string
}

export async function createMedicationAllergy(
  serviceUserId: string,
  body: CreateMedicationAllergyInput,
): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(`/service-users/${serviceUserId}/medication-allergies`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteMedicationAllergy(
  serviceUserId: string,
  allergyId: string,
): Promise<void> {
  await apiJson<ApiEnvelope<unknown>>(
    `/service-users/${serviceUserId}/medication-allergies/${allergyId}`,
    { method: 'DELETE' },
  )
}
