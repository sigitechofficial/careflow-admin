import * as React from 'react'
import { ExternalLink, MapPin } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  buildGoogleMapsDirectionsEmbedUrl,
  buildGoogleMapsDirectionsExternalUrl,
  buildGoogleMapsSingleEmbedUrl,
  buildMultiStopMapBboxUrl,
  buildScheduleRunMapStops,
  computeMapBbox,
  latLngToBboxPercent,
  type ScheduleRunMapStop,
} from '@/features/scheduling/utils/schedule-run-map.util'
import { sortJobsByStartTime } from '@/features/scheduling/utils/schedule-job-travel-distance.util'

type Props = {
  jobs: TimelineJob[]
  className?: string
  height?: number
  stopNameForJob?: (job: TimelineJob) => string
}

export function ScheduleRunRouteMap({ jobs, className, height = 420, stopNameForJob }: Props) {
  const sortedJobs = React.useMemo(() => sortJobsByStartTime(jobs), [jobs])
  const stops = React.useMemo(
    () => buildScheduleRunMapStops(sortedJobs, stopNameForJob),
    [sortedJobs, stopNameForJob],
  )
  const missingCoordsCount = sortedJobs.length - stops.length
  const [selectedJobId, setSelectedJobId] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    setSelectedJobId(stops[0]?.jobId)
  }, [stops])

  const directionsEmbedUrl = React.useMemo(() => buildGoogleMapsDirectionsEmbedUrl(stops), [stops])
  const externalUrl = React.useMemo(() => buildGoogleMapsDirectionsExternalUrl(stops), [stops])
  const bbox = React.useMemo(() => computeMapBbox(stops), [stops])
  const osmBboxUrl = React.useMemo(() => buildMultiStopMapBboxUrl(stops), [stops])
  const selectedStop = stops.find((s) => s.jobId === selectedJobId) ?? stops[0]

  const useDirectionsMap = stops.length >= 2 && directionsEmbedUrl
  const singleEmbedUrl =
    stops.length === 1 && stops[0]
      ? buildGoogleMapsSingleEmbedUrl(stops[0].lat, stops[0].lng)
      : null

  const mapHeightPx = `${height}px`

  if (stops.length === 0) {
    return (
      <div className={cn('space-y-2', className)}>
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground"
          style={{ height: mapHeightPx }}
        >
          <MapPin className="h-8 w-8 opacity-40" aria-hidden />
          <p>No map locations for this run.</p>
          <p className="text-xs">
            Service users need latitude and longitude on their address to appear on the map.
          </p>
          {missingCoordsCount > 0 ? (
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
              {missingCoordsCount} visit{missingCoordsCount === 1 ? '' : 's'} missing coordinates.
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  const markerPositions = bbox
    ? stops.map((stop) => ({
        stop,
        ...latLngToBboxPercent(stop.lat, stop.lng, bbox),
      }))
    : []

  return (
    <div className={cn('space-y-2', className)}>
      {missingCoordsCount > 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {missingCoordsCount} visit{missingCoordsCount === 1 ? '' : 's'} not shown — missing address
          coordinates. Update the service user address to include them on the map.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex flex-col lg:flex-row">
          <div
            className="relative min-h-0 flex-1 shrink-0 overflow-hidden bg-muted/20"
            style={{ height: mapHeightPx, minHeight: mapHeightPx }}
          >
            {useDirectionsMap ? (
              <iframe
                src={directionsEmbedUrl}
                className="absolute inset-0 h-full w-full border-0"
                title="Run route map"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : singleEmbedUrl ? (
              <iframe
                src={singleEmbedUrl}
                className="absolute inset-0 h-full w-full border-0"
                title="Run location map"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : osmBboxUrl ? (
              <>
                <iframe
                  src={osmBboxUrl}
                  className="absolute inset-0 h-full w-full border-0 pointer-events-none"
                  title="Run map background"
                  loading="lazy"
                />
                <RouteMarkerOverlay
                  markers={markerPositions}
                  selectedJobId={selectedJobId}
                  onSelect={setSelectedJobId}
                />
              </>
            ) : null}

            {externalUrl ? (
              <div className="absolute right-2 top-2 z-10">
                <a href={externalUrl} target="_blank" rel="noreferrer">
                  <Button type="button" size="sm" variant="secondary" className="h-8 shadow-sm">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Open in Maps
                  </Button>
                </a>
              </div>
            ) : selectedStop ? (
              <div className="absolute right-2 top-2 z-10">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedStop.lat},${selectedStop.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button type="button" size="sm" variant="secondary" className="h-8 shadow-sm">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Open in Maps
                  </Button>
                </a>
              </div>
            ) : null}
          </div>

          <StopList
            stops={stops}
            selectedJobId={selectedJobId}
            onSelect={setSelectedJobId}
            maxHeight={mapHeightPx}
          />
        </div>
      </div>
    </div>
  )
}

function RouteMarkerOverlay({
  markers,
  selectedJobId,
  onSelect,
}: {
  markers: Array<{ stop: ScheduleRunMapStop; left: number; top: number }>
  selectedJobId?: string
  onSelect: (jobId: string) => void
}) {
  if (markers.length === 0) return null

  const points = markers.map((m) => `${m.left},${m.top}`).join(' ')

  return (
    <div className="pointer-events-none absolute inset-0 z-[1]">
      {markers.length >= 2 ? (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke="rgb(37 99 235)"
            strokeWidth="0.6"
            strokeOpacity="0.85"
          />
        </svg>
      ) : null}
      {markers.map(({ stop, left, top }) => {
        const selected = stop.jobId === (selectedJobId ?? markers[0]?.stop.jobId)
        return (
          <button
            key={stop.jobId}
            type="button"
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${left}%`, top: `${top}%` }}
            title={`${stop.letter}. ${stop.name}`}
            onClick={() => onSelect(stop.jobId)}
          >
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md',
                selected ? 'bg-primary ring-2 ring-primary/40' : 'bg-red-600',
              )}
            >
              {stop.letter}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function StopList({
  stops,
  selectedJobId,
  onSelect,
  maxHeight,
}: {
  stops: ScheduleRunMapStop[]
  selectedJobId?: string
  onSelect: (jobId: string) => void
  maxHeight: string
}) {
  return (
    <div
      className="w-full shrink-0 border-t border-border lg:w-56 lg:border-l lg:border-t-0"
      style={{ maxHeight }}
    >
      <p className="border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Stops
      </p>
      {stops.map((stop) => {
        const selected = stop.jobId === (selectedJobId ?? stops[0]?.jobId)
        return (
          <button
            key={stop.jobId}
            type="button"
            onClick={() => onSelect(stop.jobId)}
            className={cn(
              'flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0',
              selected ? 'border-l-2 border-l-primary bg-primary/5' : 'hover:bg-accent/50',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                selected ? 'bg-primary' : 'bg-red-600',
              )}
              aria-hidden
            >
              {stop.letter}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">{stop.name}</p>
              <p className="mt-0.5 flex items-start gap-1 text-[10px] text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                <span className="line-clamp-2">{stop.address}</span>
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
