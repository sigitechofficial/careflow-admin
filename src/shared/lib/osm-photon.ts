/** Photon geocoder (OpenStreetMap data) — free, no API key. https://photon.komoot.io */

export type PhotonFeature = {
  geometry: { coordinates: [number, number] }
  properties: {
    osm_type?: string
    osm_id?: number
    osm_key?: string
    osm_value?: string
    type?: string
    name?: string
    street?: string
    housenumber?: string
    locality?: string
    postcode?: string
    city?: string
    district?: string
    county?: string
    state?: string
    country?: string
    countrycode?: string
  }
}

export type PhotonSearchResponse = {
  features: PhotonFeature[]
}

export type PhotonSearchOptions = {
  limit?: number
  /** ISO 3166-1 alpha-2, e.g. `gb` */
  countryRestriction?: string | string[]
}

const PHOTON_BASE = 'https://photon.komoot.io/api/'

/** Great Britain + Northern Ireland (minLon, minLat, maxLon, maxLat). */
export const UK_PHOTON_BBOX = '-8.65,49.86,1.77,60.86'

const COUNTRY_BBOX: Record<string, string> = {
  gb: UK_PHOTON_BBOX,
  uk: UK_PHOTON_BBOX,
  ie: '-10.95,51.35,-5.35,55.45',
}

export type PhotonSearchRegion = 'gb' | 'ie' | 'all'

export const PHOTON_SEARCH_REGION_OPTIONS: { id: PhotonSearchRegion; label: string }[] = [
  { id: 'gb', label: 'United Kingdom' },
  { id: 'ie', label: 'Ireland' },
  { id: 'all', label: 'Worldwide' },
]

export function countryRestrictionForRegion(region: PhotonSearchRegion): string | undefined {
  return region === 'all' ? undefined : region
}

/** Photon layer filter — each value must be sent as its own `layer` query param. */
const ADDRESS_LAYERS = ['house', 'street', 'locality', 'district', 'city'] as const

function countryCodes(restriction: string | string[] | undefined): string[] | undefined {
  if (!restriction) return undefined
  const list = (Array.isArray(restriction) ? restriction : [restriction])
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
  return list.length ? list : undefined
}

function bboxForCountries(codes: string[] | undefined): string | undefined {
  if (!codes?.length) return undefined
  for (const code of codes) {
    const bbox = COUNTRY_BBOX[code]
    if (bbox) return bbox
  }
  return undefined
}

/** Drop large admin regions and non-address POIs when searching for service-user addresses. */
export function isPhotonAddressCandidate(feature: PhotonFeature): boolean {
  const p = feature.properties
  const layer = p.type?.toLowerCase()

  if (p.osm_key === 'boundary' && p.osm_value === 'administrative') return false
  if (p.osm_value === 'state' || layer === 'state' || layer === 'country') return false

  if (p.housenumber || p.street || p.postcode) return true
  if (layer === 'house' || layer === 'street' || layer === 'postcode') return true
  if (layer === 'locality' || layer === 'district' || layer === 'city') return true

  if (p.osm_key === 'building' || p.osm_key === 'place') {
    const v = p.osm_value
    if (
      v === 'house' ||
      v === 'street' ||
      v === 'hamlet' ||
      v === 'village' ||
      v === 'town' ||
      v === 'city' ||
      v === 'suburb' ||
      v === 'neighbourhood' ||
      v === 'postcode'
    ) {
      return true
    }
  }

  return false
}

function rankAddressCandidate(feature: PhotonFeature): number {
  const p = feature.properties
  let score = 0
  if (p.housenumber) score += 4
  if (p.street) score += 3
  if (p.postcode) score += 2
  if (p.type === 'house' || p.type === 'street') score += 2
  if (p.city || p.district) score += 1
  return score
}

function filterAndRankFeatures(
  features: PhotonFeature[],
  options?: PhotonSearchOptions,
): PhotonFeature[] {
  const allowed = countryCodes(options?.countryRestriction)
  const limit = options?.limit ?? 8

  let list = features.filter(isPhotonAddressCandidate)

  if (allowed?.length) {
    list = list.filter((f) => {
      const cc = f.properties.countrycode?.toLowerCase()
      return Boolean(cc && allowed.includes(cc))
    })
  }

  list.sort((a, b) => rankAddressCandidate(b) - rankAddressCandidate(a))

  const seen = new Set<string>()
  const deduped: PhotonFeature[] = []
  for (const f of list) {
    const key = [
      f.properties.osm_type,
      f.properties.osm_id,
      f.properties.name,
      f.properties.street,
      f.properties.housenumber,
      f.properties.postcode,
    ].join('|')
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(f)
    if (deduped.length >= limit) break
  }

  return deduped
}

/** Search addresses via Photon (debounced by caller). */
export async function searchPhotonAddresses(
  query: string,
  options?: PhotonSearchOptions,
): Promise<PhotonFeature[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const allowed = countryCodes(options?.countryRestriction)
  const fetchLimit = Math.max((options?.limit ?? 8) * 3, 15)

  const params = new URLSearchParams({
    q,
    limit: String(fetchLimit),
    lang: 'en',
  })
  for (const layer of ADDRESS_LAYERS) {
    params.append('layer', layer)
  }

  const bbox = bboxForCountries(allowed)
  if (bbox) params.set('bbox', bbox)

  const res = await fetch(`${PHOTON_BASE}?${params.toString()}`)
  if (!res.ok) {
    throw new Error('Address search is temporarily unavailable')
  }

  const data = (await res.json()) as PhotonSearchResponse
  return filterAndRankFeatures(data.features ?? [], options)
}

const PHOTON_REVERSE = 'https://photon.komoot.io/reverse'

function formatPhotonFeature(feature: PhotonFeature): string {
  const p = feature.properties
  const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ').trim()
  const name = p.name?.trim() || ''
  const place = name && name !== streetLine ? name : streetLine || name
  return [place, p.locality || p.district, p.city, p.county, p.postcode, p.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ')
}

/** Reverse-geocode coordinates to a street address via Photon (no API key). */
export async function reversePhotonAddress(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    lang: 'en',
  })
  const res = await fetch(`${PHOTON_REVERSE}?${params.toString()}`)
  if (!res.ok) return null
  const data = (await res.json()) as PhotonSearchResponse
  const feature = data.features?.[0]
  if (!feature) return null
  const formatted = formatPhotonFeature(feature)
  return formatted || null
}

export { formatPhotonFeature }
