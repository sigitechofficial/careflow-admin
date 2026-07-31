import { useUIStore } from '@/store/ui.store'

export type GlobalLocationScope = {
  /** Selected location id, or null when All locations. */
  locationId: string | null
  /** Ready for APIs that take `locationIds` — undefined when unscoped. */
  locationIds: string[] | undefined
  isScoped: boolean
  setSelectedLocationId: (locationId: string | null) => void
}

/** Global header location scope for Phase 1 list filtering. */
export function useGlobalLocationScope(): GlobalLocationScope {
  const locationId = useUIStore((s) => s.selectedLocationId)
  const setSelectedLocationId = useUIStore((s) => s.setSelectedLocationId)
  const isScoped = Boolean(locationId)
  return {
    locationId,
    locationIds: locationId ? [locationId] : undefined,
    isScoped,
    setSelectedLocationId,
  }
}
