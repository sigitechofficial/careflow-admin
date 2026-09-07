import type { PatchServiceUserAddressPayload } from '@/features/service-users/api/service-users.api'
import { formatAddressLines, parsePhotonFeature } from '@/shared/lib/parse-osm-address'
import { searchPhotonAddresses } from '@/shared/lib/osm-photon'

function hasFiniteCoords(address: PatchServiceUserAddressPayload): boolean {
  return (
    address.latitude != null &&
    address.longitude != null &&
    Number.isFinite(address.latitude) &&
    Number.isFinite(address.longitude)
  )
}

/** Fill latitude/longitude from Photon when address lines exist but coordinates are missing. */
export async function ensureServiceUserAddressCoordinates(
  address: PatchServiceUserAddressPayload,
): Promise<PatchServiceUserAddressPayload> {
  if (hasFiniteCoords(address)) return address

  const query = formatAddressLines({
    ...address,
    // Prefer street (secondary) postcode for geocoding the home address.
    postcode: address.secondaryPostcode || address.postcode,
  })
  if (!query.trim()) return address

  try {
    const hits = await searchPhotonAddresses(query, { countryRestriction: 'gb', limit: 1 })
    const feature = hits[0]
    if (!feature) return address
    const parsed = parsePhotonFeature(feature)
    return {
      ...address,
      ...(parsed.latitude != null ? { latitude: parsed.latitude } : {}),
      ...(parsed.longitude != null ? { longitude: parsed.longitude } : {}),
    }
  } catch {
    return address
  }
}
