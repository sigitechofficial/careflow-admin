import { describe, expect, it } from 'vitest'
import {
  formatPhotonFeature,
  isPhotonAddressCandidate,
  reversePhotonAddress,
  searchPhotonAddresses,
  type PhotonFeature,
} from '@/shared/lib/osm-photon'

const albaniaAdmin: PhotonFeature = {
  geometry: { coordinates: [20.1, 40.9] },
  properties: {
    osm_key: 'boundary',
    osm_value: 'administrative',
    type: 'city',
    name: 'Sult',
    country: 'Albania',
    countrycode: 'AL',
  },
}

const ukStreet: PhotonFeature = {
  geometry: { coordinates: [-0.1, 51.5] },
  properties: {
    osm_key: 'highway',
    osm_value: 'residential',
    type: 'street',
    name: 'Sultan Street',
    street: 'Sultan Street',
    city: 'London',
    country: 'United Kingdom',
    countrycode: 'gb',
    postcode: 'E17 8LG',
  },
}

describe('isPhotonAddressCandidate', () => {
  it('rejects administrative country/city boundaries', () => {
    expect(isPhotonAddressCandidate(albaniaAdmin)).toBe(false)
  })

  it('accepts streets with postcodes', () => {
    expect(isPhotonAddressCandidate(ukStreet)).toBe(true)
  })
})

describe('searchPhotonAddresses', () => {
  it('requests UK bbox and address layers', async () => {
    const originalFetch = globalThis.fetch
    let capturedUrl = ''
    globalThis.fetch = async (input) => {
      capturedUrl = String(input)
      return new Response(JSON.stringify({ features: [ukStreet] }), { status: 200 })
    }
    try {
      const hits = await searchPhotonAddresses('sultan street london', { countryRestriction: 'gb', limit: 5 })
      expect(capturedUrl).toContain('bbox=')
      expect(capturedUrl).toContain('layer=house')
      expect(capturedUrl).toContain('layer=street')
      expect(capturedUrl).not.toContain('postcode')
      expect(hits).toHaveLength(1)
      expect(hits[0]?.properties.countrycode).toBe('gb')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe('formatPhotonFeature', () => {
  it('builds a street address without raw coordinates', () => {
    expect(formatPhotonFeature(ukStreet)).toBe(
      'Sultan Street, London, E17 8LG, United Kingdom',
    )
  })
})

describe('reversePhotonAddress', () => {
  it('calls Photon reverse and returns the formatted street', async () => {
    const originalFetch = globalThis.fetch
    let capturedUrl = ''
    globalThis.fetch = async (input) => {
      capturedUrl = String(input)
      return new Response(JSON.stringify({ features: [ukStreet] }), { status: 200 })
    }
    try {
      const address = await reversePhotonAddress(51.5, -0.1)
      expect(capturedUrl).toContain('reverse')
      expect(capturedUrl).toContain('lat=51.5')
      expect(capturedUrl).toContain('lon=-0.1')
      expect(address).toBe('Sultan Street, London, E17 8LG, United Kingdom')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
