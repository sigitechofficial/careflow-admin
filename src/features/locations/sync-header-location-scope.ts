import { useUIStore } from '@/store/ui.store'

/**
 * Resolve which header location should be active for the signed-in user.
 * - null assigned = company-wide → keep caller choice (usually reset to All on login)
 * - [] = no branches → null
 * - [id,…] = must stay inside that set; default first
 */
export function resolveScopedLocationId(
  assignedLocationIds: string[] | null | undefined,
  currentLocationId: string | null,
): string | null {
  if (assignedLocationIds == null) return currentLocationId
  if (assignedLocationIds.length === 0) return null
  if (currentLocationId && assignedLocationIds.includes(currentLocationId)) {
    return currentLocationId
  }
  return assignedLocationIds[0] ?? null
}

/** Apply auth branch ACL to the persisted header location selection. */
export function syncHeaderLocationToAuth(assignedLocationIds: string[] | null | undefined): void {
  const { selectedLocationId, setSelectedLocationId } = useUIStore.getState()
  if (assignedLocationIds == null) {
    // Company / platform users start on All locations (avoid carrying another user's branch).
    setSelectedLocationId(null)
    return
  }
  setSelectedLocationId(resolveScopedLocationId(assignedLocationIds, selectedLocationId))
}

export function clearHeaderLocationScope(): void {
  useUIStore.getState().setSelectedLocationId(null)
}
