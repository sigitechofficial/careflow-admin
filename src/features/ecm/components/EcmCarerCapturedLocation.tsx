import * as React from 'react'
import { ExternalLink, Loader2, MapPin } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { MapView } from '@/shared/ui/map'
import { reverseGeocodeLatLng } from '@/shared/lib/reverse-geocode'

export type CapturedGpsPoint = {
  id: string
  label: string
  latitude: number
  longitude: number
  distanceMeters?: number | null
  carerName?: string | null
  /** Extra line under the distance, e.g. "Clock-in: NFC tag · Main tag". */
  note?: string | null
}

function useReverseGeocodedAddress(latitude: number, longitude: number) {
  const [address, setAddress] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    void reverseGeocodeLatLng(latitude, longitude)
      .then((value) => {
        if (!cancelled) setAddress(value)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [latitude, longitude])

  return { address, loading }
}

function mapsSearchHref(latitude: number, longitude: number, address: string | null): string {
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}

function distanceLabel(distanceMeters: number | null | undefined): string | null {
  if (distanceMeters == null || !Number.isFinite(distanceMeters)) return null
  return `${Math.round(distanceMeters)} m from visit address`
}

function OpenInMapsLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
    >
      Open in Maps
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  )
}

export function EcmCarerCapturedLocation({
  point,
  showMap = false,
  showOpenInMaps = showMap,
}: {
  point: CapturedGpsPoint
  /** OSM preview. Keep false inside a toggle `<button>`. */
  showMap?: boolean
  /** External Maps link. Defaults on when `showMap` is on. */
  showOpenInMaps?: boolean
}) {
  const { address, loading } = useReverseGeocodedAddress(point.latitude, point.longitude)
  const distance = distanceLabel(point.distanceMeters)
  const who = point.carerName?.trim() || null
  const href = mapsSearchHref(point.latitude, point.longitude, address)

  const summary = (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {point.label}
      </p>
      <p className="mt-0.5 text-sm text-foreground">
        {who ? <span className="font-medium">{who} · </span> : null}
        {loading ? (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Looking up address…
          </span>
        ) : (
          address || 'Address unavailable for this GPS point'
        )}
      </p>
      {distance ? (
        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{distance}</p>
      ) : null}
      {point.note ? <p className="mt-0.5 text-xs font-medium text-foreground/80">{point.note}</p> : null}
    </div>
  )

  if (!showMap) {
    return (
      <div
        className="flex items-start gap-2 text-left"
        data-testid="ecm-carer-location"
        onClick={showOpenInMaps ? e => e.stopPropagation() : undefined}
      >
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 space-y-1.5">
          {summary}
          {showOpenInMaps ? <OpenInMapsLink href={href} /> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2" data-testid="ecm-carer-location-map" onClick={e => e.stopPropagation()}>
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        {summary}
      </div>
      <MapView
        locations={[
          {
            id: point.id,
            name: who || point.label,
            address: address || distance || 'Carer GPS',
            lat: point.latitude,
            lng: point.longitude,
            type: 'carer',
          },
        ]}
        selectedId={point.id}
        showList={false}
        overlayOnMap={false}
        height={180}
      />
      {showOpenInMaps ? <OpenInMapsLink href={href} /> : null}
    </div>
  )
}

export function EcmCarerCapturedLocationList({
  points,
  showMap,
  showOpenInMaps,
  className,
}: {
  points: CapturedGpsPoint[]
  showMap?: boolean
  showOpenInMaps?: boolean
  className?: string
}) {
  if (points.length === 0) return null
  return (
    <div className={cn('space-y-3', className)}>
      {points.map(point => (
        <EcmCarerCapturedLocation
          key={point.id}
          point={point}
          showMap={showMap}
          showOpenInMaps={showOpenInMaps ?? showMap}
        />
      ))}
    </div>
  )
}
