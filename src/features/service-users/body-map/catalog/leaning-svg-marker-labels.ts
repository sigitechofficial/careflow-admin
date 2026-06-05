import type { LeaningDiagramBand } from '@/features/service-users/body-map/catalog/body-map-posture-hotspots'

/** Label for one pink marker in leaning.svg, keyed by path M/circle centre in viewBox units. */
export type LeaningSvgMarkerLabel = {
  bodyPart: string
  leaningBand: LeaningDiagramBand
}

/**
 * Authoritative body-part labels for each #ff0087 marker in leaning.svg.
 * Derived from diagram callout lines — not nearest-neighbour guessing.
 */
export const LEANING_SVG_MARKER_LABELS: Record<string, LeaningSvgMarkerLabel> = {
  // Top reference row (on back / on front columns share y)
  '48.16,64.059': { bodyPart: 'Back of the head', leaningBand: 'on_back' },
  '102.504,64.059': { bodyPart: 'Shoulder', leaningBand: 'on_back' },
  '138.915,64.059': { bodyPart: 'Elbow', leaningBand: 'on_back' },
  '172.063,64.059': { bodyPart: 'Buttocks', leaningBand: 'on_back' },
  '312.814,64.059': { bodyPart: 'Heel', leaningBand: 'on_back' },
  // Side-lean figure (middle band)
  '50.102,195.245': { bodyPart: 'Ear', leaningBand: 'on_side' },
  '77.02,207.514': { bodyPart: 'Shoulder', leaningBand: 'on_side' },
  '92.885,218.988': { bodyPart: 'Elbow', leaningBand: 'on_side' },
  '162.337,220.514': { bodyPart: 'Hip', leaningBand: 'on_side' },
  '204.944,218.514': { bodyPart: 'Thigh', leaningBand: 'on_side' },
  '242.554,193.159': { bodyPart: 'Inner side of the knee', leaningBand: 'on_side' },
  '270.478,218.514': { bodyPart: 'Leg', leaningBand: 'on_side' },
  '317.397,218.514': { bodyPart: 'Heel', leaningBand: 'on_side' },
  // Prone / on-front figure (bottom band)
  '64.098,330.584': { bodyPart: 'Elbow', leaningBand: 'on_front' },
  '126.05,330.584': { bodyPart: 'Rib cage', leaningBand: 'on_front' },
  '191.263,330.584': { bodyPart: 'Thigh', leaningBand: 'on_front' },
  '244.518,330.584': { bodyPart: 'Knees', leaningBand: 'on_front' },
  '337.227,330.584': { bodyPart: 'Toes', leaningBand: 'on_front' },
}

export function leaningMarkerKeyFromElement(el: Element): string | null {
  if (el.tagName === 'circle') {
    const cx = el.getAttribute('cx')
    const cy = el.getAttribute('cy')
    if (cx && cy) return `${cx},${cy}`
    return null
  }
  const d = el.getAttribute('d')
  const match = d?.match(/^M([0-9.]+),([0-9.]+)/)
  if (!match) return null
  return `${match[1]},${match[2]}`
}

export function leaningMarkerLabelForElement(el: Element): LeaningSvgMarkerLabel | null {
  const key = leaningMarkerKeyFromElement(el)
  if (!key) return null
  return LEANING_SVG_MARKER_LABELS[key] ?? null
}
