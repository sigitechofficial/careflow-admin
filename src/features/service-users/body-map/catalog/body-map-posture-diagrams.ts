import leaningSvg from '../../../../../assets/figma/body-map/leaning.svg?raw'
import sittingSvg from '../../../../../assets/figma/body-map/sitting.svg?raw'
import type { BodyMapPostureView } from '@/features/service-users/body-map/catalog/body-map-views'

const POSTURE_SVG_HTML: Record<BodyMapPostureView, string> = {
  leaning: leaningSvg,
  sitting: sittingSvg,
}

export function getPostureDiagramHtml(view: BodyMapPostureView): string {
  return POSTURE_SVG_HTML[view]
}

export function applyPostureDiagramToHost(host: HTMLElement, view: BodyMapPostureView): boolean {
  host.innerHTML = getPostureDiagramHtml(view)
  const svg = host.querySelector('svg')
  if (!svg) return false
  svg.style.width = '100%'
  svg.style.height = 'auto'
  svg.style.maxHeight = '72vh'
  svg.style.display = 'block'
  return true
}
