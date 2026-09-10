import {
  isGoogleMapsConfigured,
  loadGoogleMapsPlaces,
} from '@/shared/lib/google-maps'
import { reversePhotonAddress } from '@/shared/lib/osm-photon'

const cache = new Map<string, string>()

export function coordCacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(5)},${longitude.toFixed(5)}`
}

function reverseGoogleLatLng(latitude: number, longitude: number): Promise<string | null> {
  return loadGoogleMapsPlaces().then(
    (google) =>
      new Promise((resolve) => {
        if (!google.maps.Geocoder) {
          resolve(null)
          return
        }
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
          if (status !== 'OK' || !results?.length) {
            resolve(null)
            return
          }
          const formatted = results[0]?.formatted_address?.trim()
          resolve(formatted || null)
        })
      }),
  )
}

/** Street address for a GPS point. Google first when configured, else OpenStreetMap. */
export async function reverseGeocodeLatLng(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const key = coordCacheKey(latitude, longitude)
  const cached = cache.get(key)
  if (cached) return cached

  if (isGoogleMapsConfigured()) {
    try {
      const googleAddress = await reverseGoogleLatLng(latitude, longitude)
      if (googleAddress) {
        cache.set(key, googleAddress)
        return googleAddress
      }
    } catch {
      // Photon fallback below.
    }
  }

  try {
    const photonAddress = await reversePhotonAddress(latitude, longitude)
    if (photonAddress) {
      cache.set(key, photonAddress)
      return photonAddress
    }
  } catch {
    return null
  }
  return null
}
