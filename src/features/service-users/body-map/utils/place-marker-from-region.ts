import { loadBodyMapPrototype } from '@/features/service-users/body-map/prototype/load-body-map-prototype'
import type { PrototypeMarkerCoords } from '@/features/service-users/body-map/utils/body-map-coords'

export type BodyMapRegionCatalogItem = {
  id: string
  part: string
  side: string
  listLabel: string
  viewKey: string
}

export function placeMarkerPayloadFromRegion(
  regionId: string,
): PrototypeMarkerCoords | null {
  const A = window.BodyMapAnatomy
  const focus = A?.getRegionFocus?.(regionId)
  if (!focus || !A) return null

  const canvasView =
    focus.view === 'front' || focus.view === 'back' ? 'dual' : focus.view
  const recordView = A.recordViewFromRegion({ figure: focus.figure }, canvasView)

  return {
    recordView,
    canvasView,
    x: focus.x,
    y: focus.y,
    bodyPart: focus.part,
    side: focus.side,
    regionId: focus.id,
    summaryLabel: focus.listLabel,
  }
}

export async function loadBodyMapRegionCatalog(): Promise<BodyMapRegionCatalogItem[]> {
  await loadBodyMapPrototype()
  const list = window.BodyMapCatalog?.listAllCatalogRegions?.() ?? []
  return list.map(r => ({
    id: r.id,
    part: r.part,
    side: r.side,
    listLabel: r.listLabel,
    viewKey: r.viewKey,
  }))
}
