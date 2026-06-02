export type BodyMapPrototypeCoords = {
  view: string
  canvasView: string
  x: number
  y: number
}

export type BodyMapPrototypeHit = {
  path: SVGPathElement
  id: string
  part: string
  side: string
  label: string
  figure: string
  group: string
  coords: BodyMapPrototypeCoords
}

declare global {
  interface Window {
    BODY_MAP_SVG_INLINE?: string
    BodyMapCatalog?: {
      BODY_PART_NAMES: string[]
      ANATOMY_GROUPS: Record<string, string[]>
      listAllCatalogRegions: () => {
        id: string
        part: string
        side: string
        listLabel: string
        viewKey: string
      }[]
      isZoomDiagramView: (viewKey: string) => boolean
      cacheRegionAnchors: (svg: SVGSVGElement) => void
    }
    BodyMapAnatomy?: {
      VIEWS: Record<string, { regions: unknown[]; label: string; usesSvg?: boolean }>
      viewKeys: string[]
      buildSvg: (viewKey: string, selectedId: string | null) => string
      loadInlineDiagram: (
        slotEl: HTMLElement,
        selectedId: string | null,
        done?: (svg: SVGSVGElement, count: number) => void,
      ) => number
      fitZoomDiagramRegions: (svg: SVGSVGElement, viewKey: string) => void
      cacheAnchorsFromSvg: (svg: SVGSVGElement) => void
      resolveRegionAtClick: (
        clientX: number,
        clientY: number,
        hostEl: HTMLElement,
        canvasView: string,
      ) => BodyMapPrototypeHit | null
      clientToMarkerLocal: (
        clientX: number,
        clientY: number,
        hostEl: HTMLElement,
        canvasView: string,
      ) => BodyMapPrototypeCoords | null
      recordViewFromRegion: (r: { figure?: string }, canvasView: string) => string
      markerPosition: (
        record: { view: string; x: number; y: number },
        canvasView: string,
      ) => { left: string; top: string } | null
      formatRegionLabel: (part: string, side: string) => string
      inferSideFromCoords: (coords: BodyMapPrototypeCoords, part: string) => string | null
      getRegionFocus: (regionId: string) => {
        id: string
        view: string
        x: number
        y: number
        part: string
        side: string
        figure: string
        listLabel: string
      } | null
      markerClassForRecordType: (typeKey: string) => string
      markerClassForSubtype?: (typeKey: string, subtype: string) => string
      totalRegions: () => number
    }
  }
}

export {}
