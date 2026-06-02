import type { MedicationLookupRow } from '@/features/service-users/api/service-users.api'

/** Fallback when API rows pre-date requiresBodyMapSite (seed M0). */
export const BODY_MAP_SITE_MEDICATION_TYPE_CODES = new Set([
  'CREAM',
  'OINTMENT',
  'LOTION',
  'PATCH',
  'INJECTION',
  'SPRAY',
])

export const BODY_MAP_SITE_ROUTE_CODES = new Set(['TOPICAL', 'TRANSDERMAL', 'ROUTE_INJECTION'])

export type BodyMapSiteMedicationInput = {
  medicationType?: Pick<MedicationLookupRow, 'code' | 'requiresBodyMapSite'> | null
  route?: Pick<MedicationLookupRow, 'code' | 'requiresBodyMapSite'> | null
}

export function lookupRequiresBodyMapSite(row?: Pick<MedicationLookupRow, 'requiresBodyMapSite' | 'code'> | null): boolean {
  if (!row) return false
  if (row.requiresBodyMapSite === true) return true
  return false
}

/** True when type or route is flagged for external / site-specific administration (MAR ↔ body map). */
export function isBodyMapSiteMedication(input: BodyMapSiteMedicationInput): boolean {
  const type = input.medicationType
  const route = input.route
  if (lookupRequiresBodyMapSite(type) || lookupRequiresBodyMapSite(route)) return true
  if (type?.code && BODY_MAP_SITE_MEDICATION_TYPE_CODES.has(type.code)) return true
  if (route?.code && BODY_MAP_SITE_ROUTE_CODES.has(route.code)) return true
  return false
}

export function resolveBodyMapMedicationSubType(
  medicationTypeCode: string | undefined,
  mapping: Record<string, string> | undefined,
): string | undefined {
  if (!medicationTypeCode || !mapping) return undefined
  return mapping[medicationTypeCode]
}
