import type { BodyMapPostureView } from '@/features/service-users/body-map/catalog/body-map-views'

/** Horizontal band on the leaning diagram (on back / on side / on front). */
export type LeaningDiagramBand = 'on_back' | 'on_side' | 'on_front'

/** Click target on leaning/sitting SVG (% of viewBox) — aligned to pink markers on reference SVGs */
export type PostureHotspot = {
  bodyPart: string
  x: number
  y: number
  /** Hit radius in viewBox-x units (% width); y is scaled by aspect ratio for round hits on screen */
  radius?: number
  /** Leaning only — limits hotspot to one horizontal band (omit = all bands). */
  leaningBand?: LeaningDiagramBand | 'all'
}

/** Which leaning band a click falls in (matches the three figure rows in leaning.svg). */
export function leaningDiagramBandForY(y: number): LeaningDiagramBand {
  if (y < 34) return 'on_back'
  if (y < 60) return 'on_side'
  return 'on_front'
}

function leaningHotspotsForBand(band: LeaningDiagramBand): PostureHotspot[] {
  return LEANING_POSTURE_HOTSPOTS.filter(
    h => !h.leaningBand || h.leaningBand === 'all' || h.leaningBand === band,
  )
}

/**
 * Leaning diagram — centres from assets/figma/body-map/leaning.svg (#ff0087 markers).
 * Band-specific rows share x positions at the top reference strip; e.g. 27.3% is Shoulder
 * on back, not Ear (Ear is on the side-lean figure lower down).
 */
export const LEANING_POSTURE_HOTSPOTS: PostureHotspot[] = [
  // Top reference row — on back band (leaning.svg #ff0087 at y≈15.4%)
  { bodyPart: 'Back of the head', x: 12.8, y: 15.4, radius: 6, leaningBand: 'on_back' },
  { bodyPart: 'Shoulder', x: 27.3, y: 15.4, radius: 6, leaningBand: 'on_back' },
  { bodyPart: 'Elbow', x: 37.0, y: 15.4, radius: 6, leaningBand: 'on_back' },
  { bodyPart: 'Buttocks', x: 45.9, y: 15.4, radius: 6, leaningBand: 'on_back' },
  { bodyPart: 'Heel', x: 83.4, y: 15.4, radius: 6, leaningBand: 'on_back' },
  // Top reference row — on front band (rib cage / knees column)
  { bodyPart: 'Rib cage', x: 45.9, y: 15.4, radius: 6, leaningBand: 'on_front' },
  { bodyPart: 'Knees', x: 83.4, y: 15.4, radius: 6, leaningBand: 'on_front' },
  // Side-lean figure (middle band) — aligned to leaning.svg marker callouts
  { bodyPart: 'Ear', x: 14.7, y: 48.0, radius: 7, leaningBand: 'on_side' },
  { bodyPart: 'Shoulder', x: 21.9, y: 49.8, radius: 7, leaningBand: 'on_side' },
  { bodyPart: 'Elbow', x: 26.1, y: 53.6, radius: 7, leaningBand: 'on_side' },
  { bodyPart: 'Hip', x: 44.5, y: 54.0, radius: 7, leaningBand: 'on_side' },
  { bodyPart: 'Thigh', x: 55.9, y: 53.6, radius: 7, leaningBand: 'on_side' },
  { bodyPart: 'Inner side of the knee', x: 65.9, y: 47.5, radius: 7, leaningBand: 'on_side' },
  { bodyPart: 'Leg', x: 73.5, y: 52.4, radius: 7, leaningBand: 'on_side' },
  { bodyPart: 'Heel', x: 86.0, y: 53.6, radius: 6, leaningBand: 'on_side' },
  // Prone / on-front figure (bottom band) — leaning.svg pink markers at y≈79.3%
  { bodyPart: 'Elbow', x: 17.1, y: 79.3, radius: 6, leaningBand: 'on_front' },
  { bodyPart: 'Rib cage', x: 33.6, y: 79.3, radius: 6, leaningBand: 'on_front' },
  { bodyPart: 'Thigh', x: 51.0, y: 79.3, radius: 6, leaningBand: 'on_front' },
  { bodyPart: 'Knees', x: 65.2, y: 79.3, radius: 6, leaningBand: 'on_front' },
  { bodyPart: 'Toes', x: 89.9, y: 79.3, radius: 6, leaningBand: 'on_front' },
]

/** Sitting diagram — centres from assets/figma/body-map/sitting.svg (cls-7 markers) */
export const SITTING_POSTURE_HOTSPOTS: PostureHotspot[] = [
  { bodyPart: 'Middle of spine', x: 41.4, y: 39.2, radius: 7 },
  { bodyPart: 'Buttocks', x: 41.8, y: 52.6, radius: 7 },
  { bodyPart: 'Base of spine', x: 42.6, y: 59.0, radius: 7 },
  { bodyPart: 'Back of knees', x: 62.1, y: 59.5, radius: 7 },
  { bodyPart: 'Balls of feet', x: 63.6, y: 82.3, radius: 6 },
  { bodyPart: 'Heels', x: 70.5, y: 82.4, radius: 6 },
]

const HOTSPOTS_BY_POSTURE: Record<BodyMapPostureView, PostureHotspot[]> = {
  leaning: LEANING_POSTURE_HOTSPOTS,
  sitting: SITTING_POSTURE_HOTSPOTS,
}

export const POSTURE_VIEWBOX_ASPECT: Record<BodyMapPostureView, number> = {
  leaning: 375 / 416.875,
  sitting: 374.625 / 270,
}

/** Extra snap assist added to each hotspot radius (kept small to avoid cross-region steals). */
export const POSTURE_HOTSPOT_SNAP_RADIUS = 6

export function postureHotspotsFor(view: BodyMapPostureView): PostureHotspot[] {
  return HOTSPOTS_BY_POSTURE[view]
}

/** Guide pins / legend — one pin per unique body part per band (leaning) or per part (sitting). */
export function postureGuideHotspotsFor(view: BodyMapPostureView): PostureHotspot[] {
  if (view === 'sitting') return SITTING_POSTURE_HOTSPOTS
  const seen = new Set<string>()
  const pins: PostureHotspot[] = []
  for (const spot of LEANING_POSTURE_HOTSPOTS) {
    const band = spot.leaningBand ?? 'all'
    const key = `${band}:${spot.bodyPart}`
    if (seen.has(key)) continue
    seen.add(key)
    pins.push(spot)
  }
  return pins
}

function spotsForClick(view: BodyMapPostureView, clickY: number): PostureHotspot[] {
  if (view === 'leaning') {
    return leaningHotspotsForBand(leaningDiagramBandForY(clickY))
  }
  return postureHotspotsFor(view)
}

function nearestHotspot(
  spots: PostureHotspot[],
  x: number,
  y: number,
  aspectRatio: number,
  maxDistance: number,
): PostureHotspot | null {
  let nearest: PostureHotspot | null = null
  let nearestDist = Infinity

  for (const spot of spots) {
    const dx = (x - spot.x) * aspectRatio
    const dy = y - spot.y
    const dist = Math.hypot(dx, dy)
    if (dist <= maxDistance && dist < nearestDist) {
      nearest = spot
      nearestDist = dist
    }
  }

  return nearest
}

function nearestHotspotInBand(
  view: BodyMapPostureView,
  x: number,
  y: number,
  aspectRatio: number,
  maxDistance: number,
): PostureHotspot | null {
  return nearestHotspot(spotsForClick(view, y), x, y, aspectRatio, maxDistance)
}

/** Resolve when the user clicked a pink reference marker in the SVG (tight match to catalog). */
export function resolvePostureHotspotAtMarkerCenter(
  view: BodyMapPostureView,
  x: number,
  y: number,
  aspectRatio = POSTURE_VIEWBOX_ASPECT[view],
): PostureHotspot | null {
  return nearestHotspotInBand(view, x, y, aspectRatio, 5)
}

/** Always map a pink SVG marker to its nearest catalog hotspot (used when annotating the diagram). */
export function resolvePostureHotspotForMarker(
  view: BodyMapPostureView,
  x: number,
  y: number,
  aspectRatio = POSTURE_VIEWBOX_ASPECT[view],
): PostureHotspot | null {
  const spots = spotsForClick(view, y)
  let nearest: PostureHotspot | null = null
  let nearestDist = Infinity

  for (const spot of spots) {
    const dx = (x - spot.x) * aspectRatio
    const dy = y - spot.y
    const dist = Math.hypot(dx, dy)
    if (dist < nearestDist) {
      nearest = spot
      nearestDist = dist
    }
  }

  return nearest
}

export function resolvePostureHotspot(
  view: BodyMapPostureView,
  x: number,
  y: number,
  aspectRatio = POSTURE_VIEWBOX_ASPECT[view],
  snapRadius = POSTURE_HOTSPOT_SNAP_RADIUS,
): PostureHotspot | null {
  const spots = spotsForClick(view, y)
  let nearest: PostureHotspot | null = null
  let nearestDist = Infinity

  for (const spot of spots) {
    const dx = (x - spot.x) * aspectRatio
    const dy = y - spot.y
    const dist = Math.hypot(dx, dy)
    const threshold = (spot.radius ?? 7) + snapRadius
    if (dist <= threshold && dist < nearestDist) {
      nearest = spot
      nearestDist = dist
    }
  }

  return nearest
}
