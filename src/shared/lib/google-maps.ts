/** Google Maps JS API key from Vite env (Places Autocomplete). */
export function getGoogleMapsApiKey(): string | undefined {
  const raw = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (raw == null) return undefined
  const key = String(raw).trim()
  if (!key || key === 'undefined' || key === 'null') return undefined
  return key
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(getGoogleMapsApiKey())
}

export type GoogleAddressComponent = {
  long_name: string
  short_name: string
  types: string[]
}

export type GooglePlaceResult = {
  place_id?: string
  name?: string
  address_components?: GoogleAddressComponent[]
  formatted_address?: string
  geometry?: { location: { lat: () => number; lng: () => number } }
}

export type GoogleAutocompletePrediction = {
  place_id: string
  description: string
  structured_formatting?: {
    main_text: string
    secondary_text: string
  }
}

export type GooglePlacesApi = {
  AutocompleteService: new () => {
    getPlacePredictions: (
      request: {
        input: string
        types?: string[]
        componentRestrictions?: { country: string | string[] }
      },
      callback: (
        predictions: GoogleAutocompletePrediction[] | null,
        status: string,
      ) => void,
    ) => void
  }
  PlacesService: new (attrContainer: HTMLElement) => {
    getDetails: (
      request: { placeId: string; fields: string[] },
      callback: (place: GooglePlaceResult | null, status: string) => void,
    ) => void
  }
}

export type GoogleGeocodeResult = {
  formatted_address?: string
  address_components?: GoogleAddressComponent[]
  types?: string[]
  geometry?: { location: { lat: () => number; lng: () => number } }
  name?: string
}

export type GoogleGeocoderApi = {
  geocode: (
    request: {
      address?: string
      location?: { lat: number; lng: number }
      componentRestrictions?: { country: string | string[] }
    },
    callback: (results: GoogleGeocodeResult[] | null, status: string) => void,
  ) => void
}

type GoogleMapsWindow = Window & {
  google?: {
    maps: {
      places: GooglePlacesApi
      Geocoder: new () => GoogleGeocoderApi
    }
  }
  __careGoogleMapsPromise?: Promise<NonNullable<GoogleMapsWindow['google']>>
}

function mapsWindow(): GoogleMapsWindow {
  return window as GoogleMapsWindow
}

/** Load Maps JS + Places library once. */
export function loadGoogleMapsPlaces(): Promise<NonNullable<GoogleMapsWindow['google']>> {
  const w = mapsWindow()
  if (w.google?.maps?.places?.AutocompleteService) {
    return Promise.resolve(w.google)
  }
  if (w.__careGoogleMapsPromise) return w.__careGoogleMapsPromise

  const key = getGoogleMapsApiKey()
  if (!key) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'))
  }

  w.__careGoogleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-care-google-maps]')
    if (existing) {
      existing.addEventListener('load', () => {
        const g = mapsWindow().google
        if (g?.maps?.places?.AutocompleteService) resolve(g)
        else reject(new Error('Google Maps failed to load'))
      })
      existing.addEventListener('error', () => reject(new Error('Google Maps script error')))
      return
    }

    const script = document.createElement('script')
    script.dataset.careGoogleMaps = '1'
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`
    script.onload = () => {
      const g = mapsWindow().google
      if (g?.maps?.places?.AutocompleteService) resolve(g)
      else reject(new Error('Google Maps Places library unavailable'))
    }
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  })

  return w.__careGoogleMapsPromise
}

/** Extract a UK/IE-style postcode from free text (e.g. formatted_address). */
export function extractPostcodeFromText(text: string): string {
  const raw = text.trim()
  if (!raw) return ''
  // UK: outward + inward (e.g. SW1A 1AA, CR0 1XP, EC1A 1BB)
  const uk =
    raw.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i) ??
    // Ireland Eircode-ish: A65 F4E2
    raw.match(/\b([A-Z]\d{2}\s*[A-Z0-9]{4})\b/i)
  if (!uk?.[1]) return ''
  return uk[1].replace(/\s+/g, ' ').toUpperCase()
}

export function parseGooglePlaceFormatted(place: GooglePlaceResult): {
  formattedAddress: string
  addressLine1: string
  addressLine2: string
  city: string
  county: string
  country: string
  postcode: string
  lat: number | null
  lng: number | null
} {
  const components = place.address_components ?? []
  const find = (...types: string[]) =>
    components.find(c => types.every(t => c.types.includes(t)))?.long_name ??
    components.find(c => types.some(t => c.types.includes(t)))?.long_name ??
    ''
  const findShort = (...types: string[]) =>
    components.find(c => types.every(t => c.types.includes(t)))?.short_name ??
    components.find(c => types.some(t => c.types.includes(t)))?.short_name ??
    ''

  const streetNumber = find('street_number')
  const route = find('route')
  const premise = find('premise')
  const subpremise = find('subpremise')
  const streetLine = [streetNumber, route].filter(Boolean).join(' ').trim()
  const addressLine1 = streetLine || premise || place.name?.trim() || ''
  const addressLine2 =
    subpremise ||
    find('neighborhood') ||
    (streetLine && premise && premise !== streetLine ? premise : '') ||
    ''

  const city =
    find('postal_town') ||
    find('locality') ||
    find('administrative_area_level_2') ||
    ''
  const county =
    find('administrative_area_level_2') ||
    find('administrative_area_level_1') ||
    ''
  const country = find('country')
  const postalCode = find('postal_code') || findShort('postal_code')
  const postalSuffix = find('postal_code_suffix') || findShort('postal_code_suffix')
  const componentPostcode = [postalCode, postalSuffix].filter(Boolean).join(' ').trim()
  const formattedAddress = place.formatted_address?.trim() || place.name?.trim() || ''
  const postcode =
    componentPostcode ||
    extractPostcodeFromText(formattedAddress) ||
    extractPostcodeFromText(place.name ?? '')
  const lat = place.geometry?.location ? place.geometry.location.lat() : null
  const lng = place.geometry?.location ? place.geometry.location.lng() : null

  return {
    formattedAddress,
    addressLine1,
    addressLine2,
    city,
    county: county === city ? find('administrative_area_level_1') || county : county,
    country,
    postcode,
    lat,
    lng,
  }
}

/** Collapse spaces and uppercase for postcode comparison (UK/IE style). */
export function normalizePostcode(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

export type PostcodeVerification = {
  input: string
  valid: boolean
  matched: string | null
}

const postcodeVerifyCache = new Map<string, PostcodeVerification>()

function postcodeMatchesInput(inputNorm: string, candidate: string): boolean {
  const cand = normalizePostcode(candidate)
  if (!cand || !inputNorm) return false
  return cand === inputNorm || cand.startsWith(inputNorm) || inputNorm.startsWith(cand)
}

function predictionsMatchPostcode(
  inputNorm: string,
  predictions: GoogleAutocompletePrediction[] | null,
): string | null {
  if (!predictions?.length) return null
  for (const p of predictions) {
    const main = p.structured_formatting?.main_text ?? ''
    if (postcodeMatchesInput(inputNorm, main) || postcodeMatchesInput(inputNorm, p.description)) {
      return main || p.description
    }
  }
  return null
}

function getPlacePredictions(
  autocomplete: {
    getPlacePredictions: (
      request: {
        input: string
        types?: string[]
        componentRestrictions?: { country: string | string[] }
      },
      callback: (
        predictions: GoogleAutocompletePrediction[] | null,
        status: string,
      ) => void,
    ) => void
  },
  request: {
    input: string
    types?: string[]
    componentRestrictions?: { country: string | string[] }
  },
): Promise<{ predictions: GoogleAutocompletePrediction[] | null; status: string }> {
  return new Promise(resolve => {
    autocomplete.getPlacePredictions(request, (predictions, status) => {
      resolve({ predictions, status })
    })
  })
}

/**
 * Verify a postcode exists via Google Places Autocomplete (postal_code / geocode).
 * Accepts full postcodes and common outward codes when Google returns a match.
 */
export async function verifyPostcodeExists(
  postcode: string,
  countryCode = 'gb',
): Promise<PostcodeVerification> {
  const input = postcode.trim()
  const inputNorm = normalizePostcode(input)
  const country = countryCode.trim().toLowerCase() || 'gb'
  const cacheKey = `${country}:${inputNorm}`
  const cached = postcodeVerifyCache.get(cacheKey)
  if (cached) return cached

  if (!inputNorm) {
    return { input, valid: false, matched: null }
  }

  const google = await loadGoogleMapsPlaces()
  const autocomplete = new google.maps.places.AutocompleteService()

  const postal = await getPlacePredictions(autocomplete, {
    input,
    types: ['postal_code'],
    componentRestrictions: { country },
  })
  let matched =
    postal.status === 'OK' ? predictionsMatchPostcode(inputNorm, postal.predictions) : null

  if (!matched) {
    const geo = await getPlacePredictions(autocomplete, {
      input,
      types: ['geocode'],
      componentRestrictions: { country },
    })
    matched = geo.status === 'OK' ? predictionsMatchPostcode(inputNorm, geo.predictions) : null
  }

  // Last resort: Geocoder (needs Geocoding API on the key).
  if (!matched && google.maps.Geocoder) {
    const geocoder = new google.maps.Geocoder()
    matched = await new Promise<string | null>(resolve => {
      geocoder.geocode(
        {
          address: input,
          componentRestrictions: { country },
        },
        (results, status) => {
          if (status !== 'OK' || !results?.length) {
            resolve(null)
            return
          }
          for (const hit of results) {
            for (const comp of hit.address_components ?? []) {
              if (
                comp.types.includes('postal_code') ||
                comp.types.includes('postal_code_prefix')
              ) {
                const label = comp.long_name || comp.short_name
                if (postcodeMatchesInput(inputNorm, label)) {
                  resolve(label)
                  return
                }
              }
            }
            if (
              hit.formatted_address &&
              postcodeMatchesInput(inputNorm, hit.formatted_address)
            ) {
              resolve(input)
              return
            }
          }
          resolve(null)
        },
      )
    })
  }

  const result: PostcodeVerification = {
    input,
    valid: Boolean(matched),
    matched,
  }
  postcodeVerifyCache.set(cacheKey, result)
  return result
}

/** Verify many postcodes sequentially (keeps Places quota polite). */
export async function verifyPostcodesExist(
  postcodes: string[],
  countryCode = 'gb',
): Promise<PostcodeVerification[]> {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const raw of postcodes) {
    const key = normalizePostcode(raw)
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(raw.trim())
  }

  const out: PostcodeVerification[] = []
  for (const pc of unique) {
    out.push(await verifyPostcodeExists(pc, countryCode))
  }
  return out
}
