import { useAuthStore } from '@/features/auth/store'
import { useUIStore } from '@/store/ui.store'
import { resolveScopedLocationId } from '@/features/locations/sync-header-location-scope'

export type GlobalLocationScope = {
  /** Selected location id, or null when All locations. */
  locationId: string | null
  /** Ready for APIs that take `locationIds` — undefined when unscoped. */
  locationIds: string[] | undefined
  isScoped: boolean
  /** True when the user may not change the header branch (0–1 assigned). */
  isLocked: boolean
  setSelectedLocationId: (locationId: string | null) => void
}

/** Global header location scope for Phase 1 list filtering. */
export function useGlobalLocationScope(): GlobalLocationScope {
  const selectedLocationId = useUIStore((s) => s.selectedLocationId)
  const setSelectedLocationIdRaw = useUIStore((s) => s.setSelectedLocationId)
  const assignedLocationIds = useAuthStore((s) => s.user?.assignedLocationIds)

  const locationId = resolveScopedLocationId(assignedLocationIds, selectedLocationId)
  const isBranchAssigned = assignedLocationIds != null
  const isLocked = isBranchAssigned && assignedLocationIds.length <= 1

  const setSelectedLocationId = (next: string | null) => {
    if (assignedLocationIds == null) {
      setSelectedLocationIdRaw(next)
      return
    }
    if (assignedLocationIds.length === 0) {
      setSelectedLocationIdRaw(null)
      return
    }
    // Branch-assigned users cannot select All or out-of-scope branches.
    if (next == null || !assignedLocationIds.includes(next)) {
      setSelectedLocationIdRaw(assignedLocationIds[0]!)
      return
    }
    setSelectedLocationIdRaw(next)
  }

  return {
    locationId,
    locationIds: locationId ? [locationId] : undefined,
    isScoped: Boolean(locationId) || isBranchAssigned,
    isLocked,
    setSelectedLocationId,
  }
}
