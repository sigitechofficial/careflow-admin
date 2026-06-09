import * as React from 'react'
import { ChevronDown, Minus, Plus, RotateCcw } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import {
  BODY_MAP_VIEW_TABS,
  VIEW_LABELS,
  type BodyMapCanvasView,
} from '@/features/service-users/body-map/catalog/body-map-views'
import { loadBodyMapPrototype } from '@/features/service-users/body-map/prototype/load-body-map-prototype'
import type { PrototypeMarkerCoords } from '@/features/service-users/body-map/utils/body-map-coords'
import { markerToPrototypeRecord } from '@/features/service-users/body-map/utils/body-map-coords'
import type { BodyMapMarkerRow } from '@/features/service-users/body-map/types'
import { medicationSiteMarkerLabel } from '@/features/service-users/body-map/components/BodyMapMedicationSiteDetail'
import { BodyMapMarkerLegend } from '@/features/service-users/body-map/components/BodyMapMarkerLegend'
import { BodyMapRegionPicker } from '@/features/service-users/body-map/components/BodyMapRegionPicker'
import { useBodyMapLookups } from '@/features/service-users/body-map/hooks/useBodyMapLookups'
import {
  buildBodyMapMarkerColorCatalog,
  resolveBodyMapMarkerColor,
} from '@/features/service-users/body-map/utils/body-map-marker-colors'
import { placeMarkerPayloadFromRegion } from '@/features/service-users/body-map/utils/place-marker-from-region'
import type { BodyMapRecordRow } from '@/features/service-users/body-map/types'

export type PlaceMarkerPayload = PrototypeMarkerCoords

const ZOOM_VIEW_TABS = BODY_MAP_VIEW_TABS.filter(t => t.zoom)

type Props = {
  records: BodyMapRecordRow[]
  pendingMarker: PlaceMarkerPayload | null
  selectedRecordId: string | null
  markMode: boolean
  showCleared: boolean
  showMeds?: boolean
  onShowClearedChange?: (value: boolean) => void
  onShowMedsChange?: (value: boolean) => void
  onPlaceMarker: (coords: PlaceMarkerPayload) => void
  onSelectRecord: (recordId: string) => void
  className?: string
  /** Compact embed (e.g. care plan accordion): dual view only, no toolbar. */
  embedded?: boolean
}

function isVisibleOnMap(
  record: BodyMapRecordRow,
  showMeds: boolean,
  showCleared: boolean,
): boolean {
  const marker = record.markers[0]
  if (!marker) return false
  if (!showMeds && record.recordType === 'MEDICATION') return false
  if (!showCleared && (marker.status === 'CLOSED' || marker.status === 'RESOLVED')) return false
  return true
}

function MapFilterChip({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange?: (v: boolean) => void
  label: string
}) {
  if (!onChange) return null
  return (
    <button
      type="button"
      className={cn(
        'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors',
        checked
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:bg-muted',
      )}
      onClick={() => onChange(!checked)}
    >
      {label}
    </button>
  )
}

export function BodyMapCanvas({
  records,
  pendingMarker,
  selectedRecordId,
  markMode,
  showCleared,
  showMeds = true,
  onShowClearedChange,
  onShowMedsChange,
  onPlaceMarker,
  onSelectRecord,
  className,
  embedded,
}: Props) {
  const lookupsQuery = useBodyMapLookups()
  const markerColorCatalog = React.useMemo(
    () => buildBodyMapMarkerColorCatalog(lookupsQuery.data?.recordTypes),
    [lookupsQuery.data?.recordTypes],
  )

  const [ready, setReady] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [currentView, setCurrentView] = React.useState<BodyMapCanvasView>('dual')
  const [selectedRegionId, setSelectedRegionId] = React.useState<string | null>(null)
  const [canvasScale, setCanvasScale] = React.useState(1)
  const [canvasPan, setCanvasPan] = React.useState({ x: 20, y: 20 })
  const [hoverLabel, setHoverLabel] = React.useState<string | null>(null)
  const [hoverPos, setHoverPos] = React.useState({ x: 0, y: 0 })
  const [regionCount, setRegionCount] = React.useState(0)

  const svgWrapRef = React.useRef<HTMLDivElement>(null)
  const hostRef = React.useRef<HTMLDivElement>(null)
  const viewportRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    let cancelled = false
    void loadBodyMapPrototype()
      .then(() => {
        if (!cancelled) {
          setReady(true)
          setRegionCount(window.BodyMapAnatomy?.totalRegions() ?? 0)
        }
      })
      .catch(e => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load body map engine')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const renderAnatomy = React.useCallback(() => {
    const A = window.BodyMapAnatomy
    const wrap = svgWrapRef.current
    if (!A || !wrap) return

    wrap.innerHTML = A.buildSvg(currentView, selectedRegionId)

    if (currentView === 'dual') {
      const slot = wrap.querySelector('.body-map-svg-slot') as HTMLElement | null
      if (slot) {
        A.loadInlineDiagram(slot, selectedRegionId, () => {
          bindRegionHover(wrap)
        })
      }
      return
    }

    const svgEl = wrap.querySelector('svg')
    if (svgEl) {
      if (window.BodyMapCatalog?.isZoomDiagramView(currentView)) {
        A.fitZoomDiagramRegions(svgEl, currentView)
      }
      A.cacheAnchorsFromSvg(svgEl)
      window.BodyMapCatalog?.cacheRegionAnchors(svgEl)
    }
    bindRegionHover(wrap)
  }, [currentView, selectedRegionId])

  const bindRegionHover = (wrap: HTMLDivElement) => {
    const A = window.BodyMapAnatomy
    const svg = wrap.querySelector('svg')
    const host = hostRef.current
    if (!A || !svg || !host || (svg as SVGSVGElement & { _hoverBound?: boolean })._hoverBound) return
    ;(svg as SVGSVGElement & { _hoverBound?: boolean })._hoverBound = true
    svg.addEventListener('mousemove', (e: MouseEvent) => {
      if (!markMode) {
        setHoverLabel(null)
        return
      }
      const hit = A.resolveRegionAtClick(e.clientX, e.clientY, host, currentView)
      if (hit) {
        setHoverLabel(`${hit.label || A.formatRegionLabel(hit.part, hit.side)} (tap to record)`)
        setHoverPos({ x: e.clientX + 14, y: e.clientY - 8 })
      } else {
        setHoverLabel(null)
      }
    })
    svg.addEventListener('mouseleave', () => setHoverLabel(null))
  }

  React.useEffect(() => {
    if (!ready) return
    renderAnatomy()
  }, [ready, renderAnatomy])

  React.useEffect(() => {
    const inner = viewportRef.current?.querySelector('#canvas-inner') as HTMLElement | null
    if (inner) {
      inner.style.transform = `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasScale})`
    }
  }, [canvasPan, canvasScale])

  const placeAt = (
    coords: { view: string; canvasView: string; x: number; y: number },
    meta: {
      bodyPart: string
      side: string
      regionId?: string | null
      summaryLabel?: string
      freeClick?: boolean
    },
  ) => {
    onPlaceMarker({
      recordView: coords.view,
      canvasView: coords.canvasView,
      x: coords.x,
      y: coords.y,
      bodyPart: meta.bodyPart,
      side: meta.side,
      regionId: meta.regionId,
      summaryLabel: meta.summaryLabel,
      freeClick: meta.freeClick,
    })
  }

  const handleDiagramClick = (e: React.MouseEvent) => {
    if (!markMode) return
    const A = window.BodyMapAnatomy
    const host = hostRef.current
    if (!A || !host) return
    if ((e.target as HTMLElement).closest('[data-marker-pin]')) return

    const hit = A.resolveRegionAtClick(e.clientX, e.clientY, host, currentView)
    if (hit) {
      e.stopPropagation()
      const recordView = A.recordViewFromRegion({ figure: hit.figure }, currentView)
      const id = hit.id
      setSelectedRegionId(id)
      const focus = A.getRegionFocus(id)
      const summaryLabel = focus?.listLabel
      placeAt(
        { view: recordView, canvasView: currentView, x: hit.coords.x, y: hit.coords.y },
        {
          bodyPart: hit.part,
          side: hit.side,
          regionId: id,
          summaryLabel,
        },
      )
      return
    }

    const coords = A.clientToMarkerLocal(e.clientX, e.clientY, host, currentView)
    if (!coords) return
    e.stopPropagation()
    const side =
      coords.view === 'back' || coords.view === 'front'
        ? A.inferSideFromCoords(coords, 'Head') || 'Centre'
        : 'Centre'
    setSelectedRegionId(null)
    placeAt(coords, { bodyPart: 'Marked location', side, freeClick: true })
  }

  const setBodyView = (view: BodyMapCanvasView, keepRegion = false) => {
    if (embedded) return
    setCurrentView(view)
    if (!keepRegion) setSelectedRegionId(null)
    setCanvasScale(1)
    setCanvasPan({ x: 20, y: 20 })
  }

  const markerPins = React.useMemo(() => {
    const A = window.BodyMapAnatomy
    if (!A) return []
    const pins: {
      key: string
      left: string
      top: string
      label: string
      recordId: string
      markerColor: string
      pulse: boolean
      faded: boolean
      selected: boolean
      number: number
    }[] = []

    const visible = records
      .filter(r => isVisibleOnMap(r, showMeds, showCleared))
      .sort(
        (a, b) =>
          new Date(a.firstNoticedAt ?? a.createdAt).getTime() -
          new Date(b.firstNoticedAt ?? b.createdAt).getTime(),
      )

    let displayIndex = 0
    for (const record of visible) {
      const marker = record.markers[0]!
      const proto = markerToPrototypeRecord(record, marker)
      const pos = A.markerPosition(proto, currentView === 'dual' ? 'dual' : currentView)
      const resolvedPos =
        pos ??
        (currentView === 'dual' && (proto.view === 'front' || proto.view === 'back')
          ? A.markerPosition(proto, 'dual')
          : null)
      if (!resolvedPos) continue

      displayIndex++
      pins.push({
        key: record.id,
        left: resolvedPos.left,
        top: resolvedPos.top,
        label: medicationSiteMarkerLabel(
          record,
          record.subType ?? record.recordType,
          marker.bodyPart,
        ),
        recordId: record.id,
        markerColor: resolveBodyMapMarkerColor(markerColorCatalog, record),
        pulse: record.safeguardingTriggered || record.recordType === 'SAFEGUARDING',
        faded: proto.status === 'resolved',
        selected: selectedRecordId === record.id,
        number: displayIndex,
      })
    }
    return pins
  }, [records, currentView, showCleared, showMeds, selectedRecordId, ready, markerColorCatalog])

  const pendingPinPos = React.useMemo(() => {
    const A = window.BodyMapAnatomy
    if (!A || !pendingMarker) return null
    return A.markerPosition(
      { view: pendingMarker.recordView, x: pendingMarker.x, y: pendingMarker.y },
      currentView === 'dual' ? 'dual' : currentView,
    )
  }, [pendingMarker, currentView, ready])

  if (loadError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {loadError}
      </div>
    )
  }

  if (!ready) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground',
          embedded ? 'min-h-[280px]' : 'min-h-[320px]',
        )}
      >
        Loading body map ({regionCount > 0 ? `${regionCount} regions` : '…'})…
      </div>
    )
  }

  const zoomLabel =
    currentView === 'dual'
      ? 'Zoom view'
      : (VIEW_LABELS[currentView] ?? currentView)

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden border border-border bg-card',
        embedded ? 'rounded-sm' : 'rounded-xl',
        className,
      )}
    >
      {!embedded ? (
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-2 py-1.5">
        <Button
          type="button"
          size="sm"
          variant={currentView === 'dual' ? 'default' : 'outline'}
          className="h-7 px-2.5 text-xs"
          onClick={() => setBodyView('dual')}
        >
          Front & back
        </Button>
        <BodyMapRegionPicker
          onSelectRegion={item => {
            const payload = placeMarkerPayloadFromRegion(item.id)
            if (!payload) return
            const view =
              payload.canvasView === 'front' || payload.canvasView === 'back'
                ? 'dual'
                : (payload.canvasView as BodyMapCanvasView)
            setBodyView(view)
            setSelectedRegionId(payload.regionId ?? null)
            onPlaceMarker(payload)
          }}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant={currentView !== 'dual' ? 'default' : 'outline'}
              className="h-7 gap-1 px-2.5 text-xs"
            >
              {zoomLabel}
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            {ZOOM_VIEW_TABS.map(tab => (
              <DropdownMenuItem key={tab.id} onClick={() => setBodyView(tab.id)}>
                {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {markMode ? (
          <span className="hidden rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-900 sm:inline">
            Marking
          </span>
        ) : null}

        <div className="flex flex-wrap items-center gap-1 sm:ml-1">
          <MapFilterChip
            checked={showCleared}
            onChange={onShowClearedChange}
            label="Resolved"
          />
          <MapFilterChip checked={showMeds} onChange={onShowMedsChange} label="Med sites" />
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <BodyMapMarkerLegend />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setCanvasScale(s => Math.max(0.5, s - 0.15))}
          >
            <Minus className="size-3.5" />
          </Button>
          <span className="min-w-9 text-center text-[10px] tabular-nums text-muted-foreground">
            {Math.round(canvasScale * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setCanvasScale(s => Math.min(2.5, s + 0.15))}
          >
            <Plus className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => {
              setCanvasScale(1)
              setCanvasPan({ x: 20, y: 20 })
            }}
          >
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
      </div>
      ) : null}

      <div
        ref={viewportRef}
        className={cn(
          'relative min-h-0 flex-1 overflow-auto bg-white',
          markMode && 'cursor-crosshair',
          embedded && 'min-h-[280px]',
        )}
      >
        <div
          id="canvas-inner"
          className="relative inline-block min-w-full p-4 transition-transform"
          style={{ transformOrigin: 'top left' }}
        >
          <div
            ref={hostRef}
            id="body-diagram-host"
            className={cn('relative mx-auto max-w-3xl', currentView !== 'dual' && 'zoom-active')}
            onClick={handleDiagramClick}
            role="presentation"
          >
            <div ref={svgWrapRef} id="body-svg-wrap" className="body-svg-wrap" />
            <div id="markers-layer" className="pointer-events-none absolute inset-0">
              {markerPins.map(pin => (
                <button
                  key={pin.key}
                  type="button"
                  data-marker-pin
                  title={pin.label}
                  style={{ left: pin.left, top: pin.top, backgroundColor: pin.markerColor }}
                  className={cn(
                    'pointer-events-auto absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-md transition-transform hover:scale-110',
                    pin.pulse && 'animate-pulse',
                    pin.selected && 'ring-2 ring-indigo-500 ring-offset-2',
                    pin.faded && 'opacity-45',
                  )}
                  onClick={ev => {
                    ev.stopPropagation()
                    onSelectRecord(pin.recordId)
                  }}
                >
                  {pin.number}
                </button>
              ))}
              {pendingPinPos ? (
                <div
                  className="pointer-events-none absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-pulse items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-sm font-bold text-white shadow-lg ring-2 ring-indigo-400"
                  style={{ left: pendingPinPos.left, top: pendingPinPos.top }}
                >
                  +
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {hoverLabel ? (
        <div
          className="pointer-events-none fixed z-50 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-medium text-white shadow-lg"
          style={{ left: hoverPos.x, top: hoverPos.y }}
        >
          {hoverLabel}
        </div>
      ) : null}

      {pendingMarker && !embedded ? (
        <p className="border-t border-indigo-100 bg-indigo-50/80 px-3 py-2 text-xs text-indigo-900">
          Selected: <strong>{pendingMarker.summaryLabel ?? `${pendingMarker.side} ${pendingMarker.bodyPart}`}</strong>
          {' · '}
          {VIEW_LABELS[pendingMarker.recordView] ?? pendingMarker.recordView} (
          {pendingMarker.x.toFixed(1)}%, {pendingMarker.y.toFixed(1)}%)
        </p>
      ) : null}
    </div>
  )
}
