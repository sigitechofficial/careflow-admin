import { marChartRowMayNeedBodyMap } from '@/features/service-users/medication/medication-body-map-eligibility'

export function chartRowMissingBodyMapSite(
  row: { medicationId: string; type?: string | null; routeName?: string | null },
  siteByMedicationId: ReadonlyMap<string, unknown>,
): boolean {
  if (!marChartRowMayNeedBodyMap(row)) return false
  return !siteByMedicationId.has(row.medicationId)
}
