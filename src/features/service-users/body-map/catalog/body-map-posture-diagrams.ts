import leaningSvg from '../../../../../assets/figma/body-map/leaning.svg?raw'
import sittingSvg from '../../../../../assets/figma/body-map/sitting.svg?raw'
import type { BodyMapPostureView } from '@/features/service-users/body-map/catalog/body-map-views'
import {
  resolvePostureHotspotForMarker,
} from '@/features/service-users/body-map/catalog/body-map-posture-hotspots'
import {
  leaningMarkerLabelForElement,
} from '@/features/service-users/body-map/catalog/leaning-svg-marker-labels'
import {
  isPostureReferenceMarker,
  markerViewBoxCenterPercent,
  postureViewBoxAspect,
} from '@/features/service-users/body-map/utils/posture-svg-coords'

const POSTURE_SVG_HTML: Record<BodyMapPostureView, string> = {
  leaning: leaningSvg,
  sitting: sittingSvg,
}

export function getPostureDiagramHtml(view: BodyMapPostureView): string {
  return POSTURE_SVG_HTML[view]
}

function annotatePostureReferenceMarkers(svg: SVGSVGElement, view: BodyMapPostureView): void {
  const aspect = postureViewBoxAspect(svg)
  for (const el of svg.querySelectorAll('circle,path')) {
    if (!isPostureReferenceMarker(el)) continue
    const center = markerViewBoxCenterPercent(el, svg)
    if (!center) continue

    const leaningLabel = view === 'leaning' ? leaningMarkerLabelForElement(el) : null
    const hit = leaningLabel
      ? {
          bodyPart: leaningLabel.bodyPart,
          x: center.x,
          y: center.y,
          leaningBand: leaningLabel.leaningBand,
        }
      : resolvePostureHotspotForMarker(view, center.x, center.y, aspect)

    if (!hit) continue
    el.setAttribute('data-body-part', hit.bodyPart)
    el.setAttribute('data-posture-hotspot', 'true')
    if (view === 'leaning' && hit.leaningBand && hit.leaningBand !== 'all') {
      el.setAttribute('data-leaning-band', hit.leaningBand)
    }
  }
}

export function applyPostureDiagramToHost(host: HTMLElement, view: BodyMapPostureView): boolean {
  host.innerHTML = getPostureDiagramHtml(view)
  const svg = host.querySelector('svg')
  if (!svg || !(svg instanceof SVGSVGElement)) return false
  svg.style.width = '100%'
  svg.style.height = 'auto'
  svg.style.maxHeight = '72vh'
  svg.style.display = 'block'
  for (const el of svg.querySelectorAll('circle,path')) {
    if (!isPostureReferenceMarker(el)) continue
    el.setAttribute('data-posture-hotspot', 'true')
    if (el instanceof SVGElement) {
      el.style.cursor = 'pointer'
    }
  }
  annotatePostureReferenceMarkers(svg, view)
  return true
}
