import { describe, expect, it } from 'vitest'
import { parsePhotonFeature } from '@/shared/lib/parse-osm-address'
import type { PhotonFeature } from '@/shared/lib/osm-photon'

describe('parsePhotonFeature', () => {
  it('maps Photon properties to address lines and coordinates', () => {
    const feature: PhotonFeature = {
      geometry: { coordinates: [-0.1276, 51.5034] },
      properties: {
        housenumber: '10',
        street: 'Downing Street',
        city: 'London',
        state: 'England',
        country: 'United Kingdom',
        countrycode: 'gb',
        postcode: 'SW1A 2AA',
      },
    }

    const parsed = parsePhotonFeature(feature)
    expect(parsed.addressLine1).toBe('10 Downing Street')
    expect(parsed.town).toBe('London')
    expect(parsed.postcode).toBe('SW1A 2AA')
    expect(parsed.country).toBe('United Kingdom')
    expect(parsed.latitude).toBeCloseTo(51.5034)
    expect(parsed.longitude).toBeCloseTo(-0.1276)
  })
})
