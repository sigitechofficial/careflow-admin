import { describe, expect, it } from 'vitest'
import {
  POSTURE_VIEWBOX_ASPECT,
  resolvePostureHotspot,
  resolvePostureHotspotAtMarkerCenter,
} from '@/features/service-users/body-map/catalog/body-map-posture-hotspots'

describe('resolvePostureHotspot (leaning)', () => {
  const aspect = POSTURE_VIEWBOX_ASPECT.leaning

  it('maps on-back top row shoulder click to Shoulder, not Ear', () => {
    const hit = resolvePostureHotspot('leaning', 27.3, 15.4, aspect)
    expect(hit?.bodyPart).toBe('Shoulder')
  })

  it('maps side-lean figure ear click to Ear', () => {
    const hit = resolvePostureHotspot('leaning', 14.7, 48.0, aspect)
    expect(hit?.bodyPart).toBe('Ear')
  })

  it('maps side-lean elbow marker to Elbow, not Leg', () => {
    const hit = resolvePostureHotspotAtMarkerCenter('leaning', 26.1, 53.6, aspect)
    expect(hit?.bodyPart).toBe('Elbow')
  })

  it('maps side-lean shoulder marker to Shoulder, not Inner side of the knee', () => {
    const hit = resolvePostureHotspotAtMarkerCenter('leaning', 21.9, 49.8, aspect)
    expect(hit?.bodyPart).toBe('Shoulder')
  })

  it('maps inner knee marker to Inner side of the knee, not Leg', () => {
    const hit = resolvePostureHotspotAtMarkerCenter('leaning', 65.9, 47.5, aspect)
    expect(hit?.bodyPart).toBe('Inner side of the knee')
  })

  it('maps side-lean mat leg marker to Leg', () => {
    const hit = resolvePostureHotspotAtMarkerCenter('leaning', 73.5, 52.4, aspect)
    expect(hit?.bodyPart).toBe('Leg')
  })

  it('maps on-side mat thigh marker to Thigh', () => {
    const hit = resolvePostureHotspotAtMarkerCenter('leaning', 55.9, 53.6, aspect)
    expect(hit?.bodyPart).toBe('Thigh')
  })
})

describe('resolvePostureHotspot (sitting)', () => {
  const aspect = POSTURE_VIEWBOX_ASPECT.sitting

  it('maps back of knees marker correctly', () => {
    const hit = resolvePostureHotspotAtMarkerCenter('sitting', 62.1, 59.5, aspect)
    expect(hit?.bodyPart).toBe('Back of knees')
  })
})
