import * as React from 'react'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useLocationManagementTree } from '@/features/settings/hooks/useLocationManagement'
import { findZoneBranchForLocationId } from '@/features/settings/location-management/location-management-hierarchy.util'
import type { LocationTreeZone } from '@/features/settings/location-management/location-management.types'

export type LocationManagementHierarchyState = {
  headerLocationId: string | null
  isHeaderScoped: boolean
  headerLocked: boolean
  listLocationId: string | null
  zoneId: string
  zoneName: string
  branchLocationId: string
  areaId: string
  setZoneId: (zoneId: string) => void
  setBranchLocationId: (locationId: string) => void
  setAreaId: (areaId: string) => void
  zones: LocationTreeZone[]
  zoneOptions: Array<{ id: string; name: string }>
  branchOptions: Array<{ id: string; locationId: string; name: string }>
  areaOptions: Array<{ id: string; name: string }>
}

export function useLocationManagementHierarchyFilters(): LocationManagementHierarchyState {
  const { locationId: headerLocationId } = useGlobalLocationScope()
  const treeQuery = useLocationManagementTree()
  const zones = treeQuery.data?.zones ?? []

  const headerMatch = React.useMemo(
    () => findZoneBranchForLocationId(treeQuery.data, headerLocationId),
    [treeQuery.data, headerLocationId],
  )

  const [localZoneId, setLocalZoneId] = React.useState('')
  const [localBranchLocationId, setLocalBranchLocationId] = React.useState('')
  const [localAreaId, setLocalAreaId] = React.useState('')

  const headerLocked = Boolean(headerLocationId)
  const zoneId = headerLocked ? (headerMatch?.zoneId ?? '') : localZoneId
  const branchLocationId = headerLocked
    ? (headerMatch?.branchLocationId ?? headerLocationId ?? '')
    : localBranchLocationId
  const areaId = localAreaId

  React.useEffect(() => {
    setLocalAreaId('')
  }, [headerLocationId, zoneId, branchLocationId])

  const selectedZone = zones.find(z => z.id === zoneId) ?? null
  const selectedBranch =
    selectedZone?.branches.find(b => b.locationId === branchLocationId) ??
    zones.flatMap(z => z.branches ?? []).find(b => b.locationId === branchLocationId) ??
    null

  const zoneOptions = zones.map(z => ({ id: z.id, name: z.name }))
  const branchOptions = (selectedZone?.branches ?? zones.flatMap(z => z.branches ?? []))
    .filter((b): b is typeof b & { locationId: string } => Boolean(b.locationId))
    .map(b => ({ id: b.id, locationId: b.locationId, name: b.name }))
  const areaOptions = (selectedBranch?.areas ?? []).map(a => ({ id: a.id, name: a.name }))

  const listLocationId = headerLocationId ?? (branchLocationId || null)

  const setZoneId = React.useCallback((next: string) => {
    setLocalZoneId(next)
    setLocalBranchLocationId('')
    setLocalAreaId('')
  }, [])

  const setBranchLocationId = React.useCallback(
    (next: string) => {
      setLocalBranchLocationId(next)
      setLocalAreaId('')
      if (next && !localZoneId) {
        const owner = zones.find(z => (z.branches ?? []).some(b => b.locationId === next))
        if (owner) setLocalZoneId(owner.id)
      }
    },
    [localZoneId, zones],
  )

  return {
    headerLocationId,
    isHeaderScoped: Boolean(headerLocationId),
    headerLocked,
    listLocationId,
    zoneId,
    zoneName: headerMatch?.zoneName ?? selectedZone?.name ?? '',
    branchLocationId,
    areaId,
    setZoneId,
    setBranchLocationId,
    setAreaId: setLocalAreaId,
    zones,
    zoneOptions,
    branchOptions,
    areaOptions,
  }
}
