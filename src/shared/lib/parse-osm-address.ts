import type { PhotonFeature } from '@/shared/lib/osm-photon'

export type ParsedPostalAddress = {
  addressLine1: string
  addressLine2: string
  town: string
  county: string
  country: string
  postcode: string
  latitude: number | null
  longitude: number | null
  formattedAddress: string
}

/** Map a Photon (OSM) result to CareAdmin address fields. */
export function parsePhotonFeature(feature: PhotonFeature): ParsedPostalAddress {
  const p = feature.properties
  const [lng, lat] = feature.geometry.coordinates

  const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ').trim()
  const addressLine1 = streetLine || p.name?.trim() || ''
  const addressLine2 = streetLine && p.name && p.name !== streetLine ? p.name : ''

  const town = p.city?.trim() || p.district?.trim() || p.locality?.trim() || ''
  const county = p.county?.trim() || p.state?.trim() || ''
  const country = p.country?.trim() || ''
  const postcode = p.postcode?.trim() || ''

  const formattedAddress = [addressLine1, addressLine2, town, county, postcode, country]
    .filter(Boolean)
    .join(', ')

  return {
    addressLine1,
    addressLine2,
    town,
    county,
    country,
    postcode,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    formattedAddress: formattedAddress || addressLine1,
  }
}

export function formatAddressLines(value: {
  addressLine1?: string
  addressLine2?: string
  town?: string
  county?: string
  country?: string
  postcode?: string
}): string {
  return [
    value.addressLine1,
    value.addressLine2,
    value.town,
    value.county,
    value.postcode,
    value.country,
  ]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(', ')
}
