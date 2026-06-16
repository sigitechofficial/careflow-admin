import { formatAddressLines, parsePhotonFeature } from '@/shared/lib/parse-osm-address'
import { searchPhotonAddresses } from '@/shared/lib/osm-photon'

export type EmployeeAddressPayload = {
  addressLine1?: string
  addressLine2?: string
  town?: string
  county?: string
  country?: string
  postcode?: string
  latitude?: number
  longitude?: number
}

function hasFiniteCoords(address: EmployeeAddressPayload): boolean {
  return (
    address.latitude != null &&
    address.longitude != null &&
    Number.isFinite(address.latitude) &&
    Number.isFinite(address.longitude)
  )
}

/** Fill latitude/longitude from Photon when address lines exist but coordinates are missing. */
export async function ensureEmployeeAddressCoordinates(
  address: EmployeeAddressPayload,
): Promise<EmployeeAddressPayload> {
  if (hasFiniteCoords(address)) return address

  const query = formatAddressLines(address)
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

export function employeeAddressPayloadFromForm(fields: {
  addressLine1?: string
  addressLine2?: string
  town?: string
  county?: string
  country?: string
  postcode?: string
  latitude?: string
  longitude?: string
}): EmployeeAddressPayload {
  const lat = fields.latitude?.trim() ? Number(fields.latitude) : undefined
  const lng = fields.longitude?.trim() ? Number(fields.longitude) : undefined
  return {
    addressLine1: fields.addressLine1?.trim() || undefined,
    addressLine2: fields.addressLine2?.trim() || undefined,
    town: fields.town?.trim() || undefined,
    county: fields.county?.trim() || undefined,
    country: fields.country?.trim() || undefined,
    postcode: fields.postcode?.trim() || undefined,
    latitude: lat != null && Number.isFinite(lat) ? lat : undefined,
    longitude: lng != null && Number.isFinite(lng) ? lng : undefined,
  }
}
