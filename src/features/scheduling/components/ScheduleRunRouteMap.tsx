import * as React from 'react'
import { ExternalLink, MapPin } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  buildGoogleMapsDirectionsEmbedUrl,
  buildGoogleMapsDirectionsExternalUrl,
  buildMultiStopMapBboxUrl,
  buildScheduleRunMapStops,
  type ScheduleRunMapStop,
} from '@/features/scheduling/utils/schedule-run-map.util'

type Props = {
  jobs: TimelineJob[]
  className?: string
  height?: number
}

export function ScheduleRunRouteMap({ jobs, className, height = 380 }: Props) {
  const stops = React.useMemo(() => buildScheduleRunMapStops(jobs), [jobs])
  const [selectedJobId, setSelectedJobId] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    setSelectedJobId(stops[0]?.jobId)
  }, [stops])

  const directionsEmbedUrl = React.useMemo(() => buildGoogleMapsDirectionsEmbedUrl(stops), [stops])
  const fallbackMapUrl = React.useMemo(() => buildMultiStopMapBboxUrl(stops), [stops])
  const externalUrl = React.useMemo(() => buildGoogleMapsDirectionsExternalUrl(stops), [stops])
  const mapUrl = directionsEmbedUrl ?? fallbackMapUrl
  const mapHeightPx = `${height}px`

  if (stops.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground',
          className,
        )}
        style={{ height: mapHeightPx }}
      >
        Add visits with coordinates to view the route map.
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-background', className)}>
      <div className="flex flex-col md:flex-row">
        <div
          className="relative min-h-0 flex-1 shrink-0 overflow-hidden"
          style={{ height: mapHeightPx, minHeight: mapHeightPx }}
        >
          {mapUrl ? (
            <iframe
              src={mapUrl}
              className="absolute inset-0 h-full w-full border-0"
              title="Run route map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : null}
          {externalUrl ? (
            <div className="absolute right-2 top-2">
              <a href={externalUrl} target="_blank" rel="noreferrer">
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
      className="w-full shrink-0 border-t border-border md:w-52 md:border-l md:border-t-0"
      style={{ maxHeight }}
    >
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
