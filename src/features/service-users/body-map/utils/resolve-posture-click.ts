import type { BodyMapPostureView } from '@/features/service-users/body-map/catalog/body-map-views'
import { VIEW_LABELS } from '@/features/service-users/body-map/catalog/body-map-views'
import { leaningMarkerLabelForElement } from '@/features/service-users/body-map/catalog/leaning-svg-marker-labels'
import {
  resolvePostureHotspot,
  resolvePostureHotspotAtMarkerCenter,
} from '@/features/service-users/body-map/catalog/body-map-posture-hotspots'
import {
  getPostureSvg,
  isPostureReferenceMarker,
  markerViewBoxCenterPercent,
  postureViewBoxAspect,
  viewBoxPercentFromClient,
} from '@/features/service-users/body-map/utils/posture-svg-coords'

export type PostureClickHotspot = {
  bodyPart: string
  x: number
  y: number
  summaryLabel: string
  freeClick: boolean
}

export function resolvePostureClickHotspot(
  posture: BodyMapPostureView,
  host: HTMLElement,
  clientX: number,
  clientY: number,
  clickTarget: Element | null,
): PostureClickHotspot | null {
  const svg = getPostureSvg(host)
  if (!svg) return null

  const pt = viewBoxPercentFromClient(svg, clientX, clientY)
  if (!pt) return null

  const aspect = postureViewBoxAspect(svg)
  let hotspot: { bodyPart: string; x: number; y: number } | null = null

  if (clickTarget instanceof Element) {
    const markerEl = clickTarget.closest('circle,path')
    if (markerEl && isPostureReferenceMarker(markerEl)) {
      const annotatedPart = markerEl.getAttribute('data-body-part')
      const center = markerViewBoxCenterPercent(markerEl, svg)
      const leaningLabel =
        posture === 'leaning' ? leaningMarkerLabelForElement(markerEl) : null

      if (center && leaningLabel) {
        hotspot = {
          bodyPart: leaningLabel.bodyPart,
          x: center.x,
          y: center.y,
        }
      } else if (annotatedPart && center) {
        hotspot = {
          bodyPart: annotatedPart,
          x: center.x,
          y: center.y,
        }
      } else if (center) {
        const hit = resolvePostureHotspotAtMarkerCenter(posture, center.x, center.y, aspect)
        if (hit) {
          hotspot = { bodyPart: hit.bodyPart, x: hit.x, y: hit.y }
        }
      }
    }
  }

  if (!hotspot) {
    const hit = resolvePostureHotspot(posture, pt.x, pt.y, aspect)
    if (hit) {
      hotspot = { bodyPart: hit.bodyPart, x: hit.x, y: hit.y }
    }
  }

  const bodyPart = hotspot?.bodyPart ?? 'Marked location'
  const x = hotspot?.x ?? pt.x
  const y = hotspot?.y ?? pt.y

  return {
    bodyPart,
    x,
    y,
    summaryLabel: hotspot
      ? bodyPart
      : `${VIEW_LABELS[posture]} — marked location`,
    freeClick: !hotspot,
  }
}
