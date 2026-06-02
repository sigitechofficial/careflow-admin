import type { MedicationLookupsBundle } from '@/features/service-users/api/service-users.api'
import {
  isBodyMapSiteMedication,
  type BodyMapSiteMedicationInput,
} from '@/features/service-users/utils/body-map-medication-eligibility'

const SELECT_NONE = '__none__'

export function medicationRequiresBodyMapFromLookupIds(
  lookups: MedicationLookupsBundle | undefined,
  medicationTypeId: string,
  routeId: string,
): boolean {
  if (!lookups) return false
  const type =
    medicationTypeId && medicationTypeId !== SELECT_NONE
      ? lookups.types.find(t => t.id === medicationTypeId)
      : null
  const route =
    routeId && routeId !== SELECT_NONE ? lookups.routes.find(r => r.id === routeId) : null
  return isBodyMapSiteMedication({ medicationType: type, route })
}

export function medicationRequiresBodyMapFromRow(med: {
  medicationType?: { code?: string; requiresBodyMapSite?: boolean } | null
  route?: { code?: string; requiresBodyMapSite?: boolean } | null
}): boolean {
  return isBodyMapSiteMedication({
    medicationType: med.medicationType as BodyMapSiteMedicationInput['medicationType'],
    route: med.route as BodyMapSiteMedicationInput['route'],
  })
}

/** MAR chart row uses display names — match patch/topical/injection keywords. */
export function marChartRowMayNeedBodyMap(row: {
  type?: string | null
  routeName?: string | null
}): boolean {
  const t = (row.type ?? '').toLowerCase()
  const r = (row.routeName ?? '').toLowerCase()
  if (/cream|ointment|lotion|patch|spray|injection/.test(t)) return true
  if (/topical|transdermal|injection/.test(r)) return true
  return false
}

export function marChartRowIsPatch(row: { type?: string | null }): boolean {
  return /\bpatch\b/i.test(row.type ?? '')
}
