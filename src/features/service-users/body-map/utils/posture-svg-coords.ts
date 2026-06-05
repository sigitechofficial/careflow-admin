/** ViewBox-normalised coordinates (0–100) for leaning/sitting posture diagrams. */

const PINK_MARKER_FILL = '#ff0087'

export function isPostureReferenceMarker(el: Element): boolean {
  if (!(el instanceof SVGGraphicsElement)) return false
  const fill = el.getAttribute('fill')?.toLowerCase()
  if (fill === PINK_MARKER_FILL) return true
  return el.classList.contains('cls-7')
}

/** Centre of a pink reference marker in viewBox percentage (0–100). */
export function markerViewBoxCenterPercent(
  el: Element,
  svg: SVGSVGElement,
): { x: number; y: number } | null {
  if (!(el instanceof SVGGraphicsElement)) return null
  const bbox = el.getBBox()
  const cx = bbox.x + bbox.width / 2
  const cy = bbox.y + bbox.height / 2
  const vb = svg.viewBox.baseVal
  if (vb.width <= 0 || vb.height <= 0) return null
  return {
    x: ((cx - vb.x) / vb.width) * 100,
    y: ((cy - vb.y) / vb.height) * 100,
  }
}

export function getPostureSvg(host: HTMLElement | null): SVGSVGElement | null {
  return host?.querySelector('svg') ?? null
}

export function postureViewBoxAspect(svg: SVGSVGElement): number {
  const vb = svg.viewBox.baseVal
  if (vb.height <= 0) return 1
  return vb.width / vb.height
}

/** Map a screen click to viewBox percentage (handles SVG letterboxing). */
export function viewBoxPercentFromClient(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const local = pt.matrixTransform(ctm.inverse())
  const vb = svg.viewBox.baseVal
  if (vb.width <= 0 || vb.height <= 0) return null
  const x = ((local.x - vb.x) / vb.width) * 100
  const y = ((local.y - vb.y) / vb.height) * 100
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  }
}

/** Map stored viewBox % to overlay CSS % (same box as click targets). */
export function viewBoxPercentToOverlayPercent(
  svg: SVGSVGElement,
  host: HTMLElement,
  xPct: number,
  yPct: number,
): { left: string; top: string } {
  const vb = svg.viewBox.baseVal
  const pt = svg.createSVGPoint()
  pt.x = vb.x + (xPct / 100) * vb.width
  pt.y = vb.y + (yPct / 100) * vb.height
  const ctm = svg.getScreenCTM()
  if (!ctm) {
    return { left: `${xPct}%`, top: `${yPct}%` }
  }
  const screen = pt.matrixTransform(ctm)
  const hostRect = host.getBoundingClientRect()
  if (hostRect.width <= 0 || hostRect.height <= 0) {
    return { left: `${xPct}%`, top: `${yPct}%` }
  }
  const left = ((screen.x - hostRect.left) / hostRect.width) * 100
  const top = ((screen.y - hostRect.top) / hostRect.height) * 100
  return { left: `${left}%`, top: `${top}%` }
}
