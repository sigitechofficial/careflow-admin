import type {
  LocationManagementTree,
  LocationTreeZone,
} from '@/features/settings/location-management/location-management.types'

export type HierarchyFilterValues = {
  zoneId: string
  branchLocationId: string
  areaId: string
}

export function findZoneBranchForLocationId(
  tree: LocationManagementTree | null | undefined,
  locationId: string | null | undefined,
): { zoneId: string; zoneName: string; branchLocationId: string } | null {
  if (!tree?.zones?.length || !locationId) return null
  for (const zone of tree.zones) {
    for (const branch of zone.branches ?? []) {
      if (branch.locationId === locationId) {
        return {
          zoneId: zone.id,
          zoneName: zone.name,
          branchLocationId: locationId,
        }
      }
    }
    if (zone.locationId === locationId) {
      return {
        zoneId: zone.id,
        zoneName: zone.name,
        branchLocationId: locationId,
      }
    }
  }
  return null
}

export function filterZonesByHierarchy(
  zones: LocationTreeZone[],
  filters: HierarchyFilterValues,
): LocationTreeZone[] {
  const zoneId = filters.zoneId.trim()
  const branchLocationId = filters.branchLocationId.trim()
  const areaId = filters.areaId.trim()
  if (!zoneId && !branchLocationId && !areaId) return zones

  return zones
    .filter(zone => {
      if (zoneId && zone.id !== zoneId) return false
      if (!branchLocationId && !areaId) return true
      return (zone.branches ?? []).some(branch => {
        if (branchLocationId && branch.locationId !== branchLocationId) return false
        if (!areaId) return true
        return (branch.areas ?? []).some(area => area.id === areaId)
      })
    })
    .map(zone => {
      if (!branchLocationId && !areaId) return zone
      const branches = (zone.branches ?? [])
        .filter(branch => !branchLocationId || branch.locationId === branchLocationId)
        .map(branch =>
          areaId
            ? { ...branch, areas: (branch.areas ?? []).filter(area => area.id === areaId) }
            : branch,
        )
      return { ...zone, branches }
    })
}
