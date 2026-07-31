import type { LocationManagementTree } from '@/features/settings/location-management/location-management.types'

export type GlobalLocationOption = {
  id: string
  label: string
}

/** Unique Location entities from the location-management tree for the header selector. */
export function flattenLocationOptionsFromTree(
  tree: LocationManagementTree | null | undefined,
): GlobalLocationOption[] {
  if (!tree?.zones?.length) return []
  const byId = new Map<string, string>()

  for (const zone of tree.zones) {
    if (zone.locationId) {
      const label = zone.locationName?.trim() || zone.name
      if (!byId.has(zone.locationId)) byId.set(zone.locationId, label)
    }
    for (const branch of zone.branches ?? []) {
      const locId = branch.locationId
      if (!locId) continue
      const label =
        [zone.name, branch.locationName?.trim() || branch.name].filter(Boolean).join(' · ') ||
        branch.name
      if (!byId.has(locId)) byId.set(locId, label)
    }
  }

  return [...byId.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
