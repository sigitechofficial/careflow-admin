import * as React from 'react'
import type { BodyMapRecordTypeCode } from '@/features/service-users/body-map/catalog/record-types'
import { applyPostureDiagramToHost } from '@/features/service-users/body-map/catalog/body-map-posture-diagrams'
import {
  VIEW_LABELS,
  type BodyMapCanvasView,
  type BodyMapPostureView,
} from '@/features/service-users/body-map/catalog/body-map-views'
import { loadBodyMapPrototype } from '@/features/service-users/body-map/prototype/load-body-map-prototype'
import type { PrototypeMarkerCoords } from '@/features/service-users/body-map/utils/body-map-coords'
import { cn } from '@/shared/lib/utils'

const MARKER_CLASS_MAP: Record<string, string> = {
  'm-injury': 'bg-red-600',
  'm-wound': 'bg-violet-600',
  'm-pressure': 'bg-orange-600',
  'm-med': 'bg-blue-600',
  'm-patch': 'bg-blue-500',
  'm-injection': 'bg-teal-600 ring-2 ring-teal-200',
  'm-spray': 'bg-cyan-600 ring-2 ring-cyan-200',
  'm-pain': 'bg-pink-600',
  'm-skin': 'bg-yellow-600',
  'm-safeguard': 'bg-red-900',
}

function tailwindForMarkerClass(protoClass: string): string {
  for (const [key, tw] of Object.entries(MARKER_CLASS_MAP)) {
    if (protoClass.includes(key)) return tw
  }
  return 'bg-indigo-600'
}

function resolveCanvasView(marker: PrototypeMarkerCoords): BodyMapCanvasView {
  const cv = marker.canvasView
  if (cv && cv !== 'front' && cv !== 'back') {
    return cv as BodyMapCanvasView
  }
  if (marker.recordView === 'front' || marker.recordView === 'back') return 'dual'
  return (marker.recordView || 'dual') as BodyMapCanvasView
}

type Props = {
  marker: PrototypeMarkerCoords
  recordType?: BodyMapRecordTypeCode
  subType?: string
  /** When false, skips loading anatomy (e.g. dialog closed). */
  active?: boolean
  /** `panel` fills the parent column (wizard left rail). */
  variant?: 'compact' | 'panel'
  className?: string
}

export function BodyMapMarkerPreview({
  marker,
  recordType = 'INJURY',
  subType = '',
  active = true,
  variant = 'compact',
  className,
}: Props) {
  const isPanel = variant === 'panel'
  const [ready, setReady] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const svgWrapRef = React.useRef<HTMLDivElement>(null)
  const hostRef = React.useRef<HTMLDivElement>(null)

  const postureView: BodyMapPostureView | null =
    marker.canvasView === 'leaning' || marker.canvasView === 'sitting' ? marker.canvasView : null
  const canvasView = postureView ? null : resolveCanvasView(marker)
  const regionId = marker.regionId ?? null

  React.useEffect(() => {
    if (!active) return
    let cancelled = false
    setReady(false)
    setLoadError(null)

    if (postureView) {
      const apply = () => {
        const wrap = svgWrapRef.current
        if (!wrap || cancelled) return false
        try {
          if (!applyPostureDiagramToHost(wrap, postureView)) {
            throw new Error('Could not load posture diagram')
          }
          setReady(true)
          return true
        } catch (e) {
          setLoadError(e instanceof Error ? e.message : 'Failed to load body map')
          return false
        }
      }
      if (!apply()) {
        const id = window.requestAnimationFrame(() => {
          if (!cancelled) apply()
        })
        return () => {
          cancelled = true
          window.cancelAnimationFrame(id)
        }
      }
      return () => {
        cancelled = true
      }
    }

    void loadBodyMapPrototype()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch(e => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Failed to load body map')
        }
      })
    return () => {
      cancelled = true
    }
  }, [active, postureView])

  React.useEffect(() => {
    if (!ready || !active || postureView || canvasView == null) return
    const A = window.BodyMapAnatomy
    const wrap = svgWrapRef.current
    if (!A || !wrap) return

    wrap.innerHTML = A.buildSvg(canvasView, regionId)

    if (canvasView === 'dual') {
      const slot = wrap.querySelector('.body-map-svg-slot') as HTMLElement | null
      if (slot) {
        A.loadInlineDiagram(slot, regionId, () => {})
      }
      return
    }

    const svgEl = wrap.querySelector('svg')
    if (svgEl) {
      if (window.BodyMapCatalog?.isZoomDiagramView(canvasView)) {
        A.fitZoomDiagramRegions(svgEl, canvasView)
      }
      A.cacheAnchorsFromSvg(svgEl)
      window.BodyMapCatalog?.cacheRegionAnchors(svgEl)
    }
  }, [ready, active, canvasView, regionId, postureView])

  const pinPos = React.useMemo(() => {
    if (!ready) return null
    if (postureView) {
      return { left: `${marker.x}%`, top: `${marker.y}%` }
    }
    const A = window.BodyMapAnatomy
    if (!A || canvasView == null) return null
    return A.markerPosition(
      { view: marker.recordView, x: marker.x, y: marker.y },
      canvasView === 'dual' ? 'dual' : canvasView,
    )
  }, [marker.recordView, marker.x, marker.y, canvasView, ready, postureView])

  const pinClass = React.useMemo(() => {
    const A = window.BodyMapAnatomy
    if (!A) return 'bg-indigo-600'
    const typeKey = recordType.toLowerCase()
    const proto =
      A.markerClassForSubtype?.(typeKey, subType) ??
      A.markerClassForRecordType(typeKey)
    return tailwindForMarkerClass(proto)
  }, [recordType, subType, ready])

  const locationLabel =
    marker.summaryLabel ??
    (`${marker.side} ${marker.bodyPart}`.trim() || 'Selected location')

  if (!active) return null

  if (loadError) {
    return (
      <p
        className={cn(
          'p-4 text-xs text-destructive',
          isPanel && 'flex min-h-[min(40vh,400px)] flex-1 items-center justify-center',
          className,
        )}
      >
        Could not load map preview: {loadError}
      </p>
    )
  }

  if (!ready && !postureView) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-xs text-muted-foreground',
          isPanel
            ? 'min-h-[min(60vh,520px)] flex-1 bg-white'
            : 'h-48 rounded-lg border border-border bg-muted/30',
          className,
        )}
      >
        Loading body map…
      </div>
    )
  }

  const mapHost = (
    <div
      ref={hostRef}
      className={cn(
        'relative w-full',
        isPanel ? 'max-w-2xl' : 'mx-auto max-w-md',
        postureView && !ready && 'min-h-[200px]',
      )}
    >
      {postureView && !ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-xs text-muted-foreground">
          Loading body map…
        </div>
      ) : null}
      <div
        ref={svgWrapRef}
        className={cn('body-svg-wrap pointer-events-none select-none', postureView && !ready && 'opacity-0')}
      />
      <div className="pointer-events-none absolute inset-0">
        {pinPos ? (
          <div
            className={cn(
              'absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-lg ring-2 ring-indigo-400/80',
              pinClass,
            )}
            style={{ left: pinPos.left, top: pinPos.top }}
            aria-hidden
          >
            +
          </div>
        ) : null}
      </div>
    </div>
  )

  const caption = (
    <p className="shrink-0 border-t border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{locationLabel}</span>
      {' · '}
      {VIEW_LABELS[marker.recordView] ?? marker.recordView} ({marker.x.toFixed(1)}%,{' '}
      {marker.y.toFixed(1)}%)
      {regionId ? (
        <>
          {' '}
          · <span className="font-mono text-[10px]">{regionId}</span>
        </>
      ) : null}
    </p>
  )

  if (isPanel) {
    return (
      <div className={cn('flex h-full min-h-0 flex-col', className)}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
          <div className="flex min-h-[min(60vh,560px)] flex-1 items-center justify-center overflow-auto p-4 lg:min-h-0">
            {mapHost}
          </div>
          {caption}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">Marker placement</p>
        <p className="text-[11px] text-muted-foreground">
          {VIEW_LABELS[marker.recordView] ?? marker.recordView} · {marker.x.toFixed(1)}%,{' '}
          {marker.y.toFixed(1)}%
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="max-h-52 overflow-auto bg-slate-50/50 p-3">{mapHost}</div>
        {caption}
      </div>
    </div>
  )
}
