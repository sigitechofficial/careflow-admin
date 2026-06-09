import * as React from 'react'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { VIEW_LABELS, type BodyMapPostureView } from '@/features/service-users/body-map/catalog/body-map-views'
import { applyPostureDiagramToHost } from '@/features/service-users/body-map/catalog/body-map-posture-diagrams'
import type { PlaceMarkerPayload } from '@/features/service-users/body-map/components/BodyMapCanvas'
import { resolvePostureClickHotspot } from '@/features/service-users/body-map/utils/resolve-posture-click'
import { BodyMapMarkerLegend } from '@/features/service-users/body-map/components/BodyMapMarkerLegend'
import { useBodyMapLookups } from '@/features/service-users/body-map/hooks/useBodyMapLookups'
import {
  buildBodyMapMarkerColorCatalog,
  resolveBodyMapMarkerColor,
} from '@/features/service-users/body-map/utils/body-map-marker-colors'
import { medicationSiteMarkerLabel } from '@/features/service-users/body-map/components/BodyMapMedicationSiteDetail'
import { readMarkerPlacement } from '@/features/service-users/body-map/utils/body-map-coords'
import {
  getPostureSvg,
  viewBoxPercentToOverlayPercent,
} from '@/features/service-users/body-map/utils/posture-svg-coords'
import type { BodyMapRecordRow } from '@/features/service-users/body-map/types'

function isVisibleOnMap(
  record: BodyMapRecordRow,
  posture: BodyMapPostureView,
  showMeds: boolean,
  showCleared: boolean,
): boolean {
  const marker = record.markers[0]
  if (!marker) return false
  const { canvasView } = readMarkerPlacement(record, marker)
  if (canvasView !== posture) return false
  if (!showMeds && record.recordType === 'MEDICATION') return false
  if (!showCleared && (marker.status === 'CLOSED' || marker.status === 'RESOLVED')) return false
  return true
}

function overlayPosForViewBoxPercent(
  host: HTMLElement | null,
  xPct: number,
  yPct: number,
): { left: string; top: string } {
  if (!host) return { left: `${xPct}%`, top: `${yPct}%` }
  const svg = getPostureSvg(host)
  if (!svg) return { left: `${xPct}%`, top: `${yPct}%` }
  return viewBoxPercentToOverlayPercent(svg, host, xPct, yPct)
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

type Props = {
  posture: BodyMapPostureView
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
}

export function BodyMapPostureCanvas({
  posture,
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
}: Props) {
  const lookupsQuery = useBodyMapLookups()
  const markerColorCatalog = React.useMemo(
    () => buildBodyMapMarkerColorCatalog(lookupsQuery.data?.recordTypes),
    [lookupsQuery.data?.recordTypes],
  )

  const [ready, setReady] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [canvasScale, setCanvasScale] = React.useState(1)
  const [canvasPan, setCanvasPan] = React.useState({ x: 20, y: 20 })
  const [layoutRevision, setLayoutRevision] = React.useState(0)

  const svgWrapRef = React.useRef<HTMLDivElement>(null)
  const hostRef = React.useRef<HTMLDivElement>(null)
  const viewportRef = React.useRef<HTMLDivElement>(null)

  const mountDiagram = React.useCallback(() => {
    const wrap = svgWrapRef.current
    if (!wrap) return false
    try {
      const ok = applyPostureDiagramToHost(wrap, posture)
      if (!ok) {
        setLoadError(`Invalid ${VIEW_LABELS[posture] ?? posture} diagram`)
        setReady(false)
        return false
      }
      setLoadError(null)
      setReady(true)
      return true
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load diagram')
      setReady(false)
      return false
    }
  }, [posture])

  React.useEffect(() => {
    setReady(false)
    setLoadError(null)
    mountDiagram()
  }, [mountDiagram])

  React.useEffect(() => {
    const host = hostRef.current
    if (!host || !ready) return
    const bump = () => setLayoutRevision(v => v + 1)
    const ro = new ResizeObserver(bump)
    ro.observe(host)
    window.addEventListener('resize', bump)
    bump()
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', bump)
    }
  }, [ready, posture])

  React.useEffect(() => {
    const inner = viewportRef.current?.querySelector('#posture-canvas-inner') as HTMLElement | null
    if (inner) {
      inner.style.transform = `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasScale})`
    }
  }, [canvasPan, canvasScale, layoutRevision])

  const handleDiagramClick = (e: React.MouseEvent) => {
    if (!markMode || !ready) return
    const host = hostRef.current
    if (!host) return
    if ((e.target as HTMLElement).closest('[data-marker-pin]')) return

    const hit = resolvePostureClickHotspot(
      posture,
      host,
      e.clientX,
      e.clientY,
      e.target instanceof Element ? e.target : null,
    )
    if (!hit) return
    e.stopPropagation()

    onPlaceMarker({
      recordView: posture,
      canvasView: posture,
      x: hit.x,
      y: hit.y,
      bodyPart: hit.bodyPart,
      side: 'Centre',
      summaryLabel: hit.summaryLabel,
      freeClick: hit.freeClick,
    })
  }

  const host = hostRef.current

  const markerPins = React.useMemo(() => {
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
      .filter(r => isVisibleOnMap(r, posture, showMeds, showCleared))
      .sort(
        (a, b) =>
          new Date(a.firstNoticedAt ?? a.createdAt).getTime() -
          new Date(b.firstNoticedAt ?? b.createdAt).getTime(),
      )

    let displayIndex = 0
    for (const record of visible) {
      const marker = record.markers[0]!
      displayIndex++
      const pos = overlayPosForViewBoxPercent(host, marker.xCoordinate, marker.yCoordinate)
      pins.push({
        key: record.id,
        left: pos.left,
        top: pos.top,
        label: medicationSiteMarkerLabel(
          record,
          record.subType ?? record.recordType,
          marker.bodyPart,
        ),
        recordId: record.id,
        markerColor: resolveBodyMapMarkerColor(markerColorCatalog, record),
        pulse: record.safeguardingTriggered || record.recordType === 'SAFEGUARDING',
        faded: marker.status === 'CLOSED' || marker.status === 'RESOLVED',
        selected: selectedRecordId === record.id,
        number: displayIndex,
      })
    }
    return pins
  }, [records, posture, showCleared, showMeds, selectedRecordId, layoutRevision, host, markerColorCatalog])

  const pendingPinPos =
    pendingMarker && pendingMarker.canvasView === posture
      ? overlayPosForViewBoxPercent(host, pendingMarker.x, pendingMarker.y)
      : null

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden border border-border bg-card rounded-xl',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-2 py-1.5">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {VIEW_LABELS[posture]}
        </span>
        {markMode ? (
          <span className="hidden rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-900 sm:inline">
            Tap diagram to place marker
          </span>
        ) : null}
        <div className="flex flex-wrap items-center gap-1 sm:ml-1">
          <MapFilterChip checked={showCleared} onChange={onShowClearedChange} label="Resolved" />
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

      <div
        ref={viewportRef}
        className={cn(
          'relative min-h-[320px] flex-1 overflow-auto bg-white',
          markMode && ready && 'cursor-crosshair',
        )}
      >
        {!ready && !loadError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card text-sm text-muted-foreground">
            Loading {VIEW_LABELS[posture]?.toLowerCase() ?? posture} diagram…
          </div>
        ) : null}
        {loadError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card p-6 text-sm text-destructive">
            {loadError}
          </div>
        ) : null}

        <div
          id="posture-canvas-inner"
          className={cn(
            'relative inline-block min-w-full p-4 transition-transform',
            !ready && 'opacity-0',
          )}
          style={{ transformOrigin: 'top left' }}
        >
          <div
            ref={hostRef}
            className="relative mx-auto max-w-2xl"
            onClick={handleDiagramClick}
            role="presentation"
          >
            <div ref={svgWrapRef} className="body-svg-wrap [&_svg]:mx-auto" />
            <div className="pointer-events-none absolute inset-0">
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
                  className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-pulse items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-sm font-bold text-white shadow-lg ring-2 ring-indigo-400"
                  style={{ left: pendingPinPos.left, top: pendingPinPos.top }}
                >
                  +
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {pendingMarker && pendingMarker.canvasView === posture ? (
        <p className="border-t border-indigo-100 bg-indigo-50/80 px-3 py-2 text-xs text-indigo-900">
          Selected: <strong>{pendingMarker.summaryLabel ?? pendingMarker.bodyPart}</strong>
          {' · '}
          {VIEW_LABELS[posture]} ({pendingMarker.x.toFixed(1)}%, {pendingMarker.y.toFixed(1)}%)
        </p>
      ) : null}
    </div>
  )
}
