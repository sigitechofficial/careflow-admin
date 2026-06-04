import type { BodyMapPostureView } from '@/features/service-users/body-map/catalog/body-map-views'

/** Click target on leaning/sitting SVG (% of diagram box) — aligned to reference diagrams */
export type PostureHotspot = {
  bodyPart: string
  x: number
  y: number
  /** Hit radius in % of diagram width */
  radius?: number
}

/**
 * Leaning diagram (side-lean figure) — lateral pressure points from reference.
 * Dropdown also lists supine/prone sites for documentation when not on this SVG.
 */
export const LEANING_POSTURE_HOTSPOTS: PostureHotspot[] = [
  { bodyPart: 'Ear', x: 22, y: 14, radius: 7 },
  { bodyPart: 'Shoulder', x: 28, y: 26, radius: 8 },
  { bodyPart: 'Elbow', x: 48, y: 52, radius: 8 },
  { bodyPart: 'Hip', x: 34, y: 46, radius: 8 },
  { bodyPart: 'Thigh', x: 38, y: 58, radius: 8 },
  { bodyPart: 'Inner side of the knee', x: 52, y: 70, radius: 7 },
  { bodyPart: 'Leg', x: 42, y: 76, radius: 8 },
  { bodyPart: 'Heel', x: 46, y: 90, radius: 7 },
]

/** Sitting in chair — six labelled pressure points from reference */
export const SITTING_POSTURE_HOTSPOTS: PostureHotspot[] = [
  { bodyPart: 'Middle of spine', x: 40, y: 30, radius: 8 },
  { bodyPart: 'Base of spine', x: 42, y: 44, radius: 8 },
  { bodyPart: 'Buttocks', x: 44, y: 54, radius: 9 },
  { bodyPart: 'Back of knees', x: 50, y: 66, radius: 7 },
  { bodyPart: 'Heels', x: 54, y: 86, radius: 7 },
  { bodyPart: 'Balls of feet', x: 60, y: 90, radius: 7 },
]

const HOTSPOTS_BY_POSTURE: Record<BodyMapPostureView, PostureHotspot[]> = {
  leaning: LEANING_POSTURE_HOTSPOTS,
  sitting: SITTING_POSTURE_HOTSPOTS,
}

export function postureHotspotsFor(view: BodyMapPostureView): PostureHotspot[] {
  return HOTSPOTS_BY_POSTURE[view]
}

export function resolvePostureHotspot(
  view: BodyMapPostureView,
  x: number,
  y: number,
): PostureHotspot | null {
  const spots = postureHotspotsFor(view)
  let best: PostureHotspot | null = null
  let bestDist = Infinity
  for (const spot of spots) {
    const r = spot.radius ?? 8
    const dx = x - spot.x
    const dy = y - spot.y
    const dist = Math.hypot(dx, dy)
    if (dist <= r && dist < bestDist) {
      best = spot
      bestDist = dist
    }
  }
  return best
}
