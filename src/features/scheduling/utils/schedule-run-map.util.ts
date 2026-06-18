import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { MapLocation } from '@/shared/ui/map'
import { jobGeoCoordinates, sortJobsByStartTime } from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'

export type ScheduleRunMapStop = {
  letter: string
  jobId: string
  name: string
  address: string
  lat: number
  lng: number
}

function stopLetter(index: number): string {
  return String.fromCharCode(65 + index)
}

export function buildScheduleRunMapStops(
  jobs: TimelineJob[],
  nameForJob?: (job: TimelineJob) => string,
): ScheduleRunMapStop[] {
  const sorted = sortJobsByStartTime(jobs)
  const stops: ScheduleRunMapStop[] = []

  for (let i = 0; i < sorted.length; i += 1) {
    const job = sorted[i]
    if (!job) continue
    const coords = jobGeoCoordinates(job)
    if (!coords) continue
    const su = job.serviceUser
    const address =
      su.location?.name ??
      [coords.lat.toFixed(5), coords.lng.toFixed(5)].join(', ')
    stops.push({
      letter: stopLetter(stops.length),
      jobId: job.id,
      name: nameForJob ? nameForJob(job) : serviceUserLabel(su),
      address,
      lat: coords.lat,
      lng: coords.lng,
    })
  }

  return stops
}

export function scheduleRunStopsToMapLocations(stops: ScheduleRunMapStop[]): MapLocation[] {
  return stops.map((stop) => ({
    id: stop.jobId,
    name: stop.name,
    address: stop.address,
    lat: stop.lat,
    lng: stop.lng,
    type: 'service-user',
    badge: stop.letter,
  }))
}

/** Google Maps directions embed (route line + lettered stops) — no API key required. */
export function buildGoogleMapsDirectionsEmbedUrl(stops: ScheduleRunMapStop[]): string | null {
  if (stops.length < 2) return null
  const first = stops[0]
  const last = stops[stops.length - 1]
  if (!first || !last) return null

  const saddr = `${first.lat},${first.lng}`
  const via = stops.slice(1, -1).map((s) => `${s.lat},${s.lng}`)
  const daddr =
    via.length > 0
      ? `${via.join('+to:')}+to:${last.lat},${last.lng}`
      : `${last.lat},${last.lng}`

  return `https://maps.google.com/maps?f=d&saddr=${encodeURIComponent(saddr)}&daddr=${encodeURIComponent(daddr)}&output=embed`
}

export function buildGoogleMapsDirectionsExternalUrl(stops: ScheduleRunMapStop[]): string | null {
  if (stops.length < 2) return null
  const path = stops.map((s) => `${s.lat},${s.lng}`).join('/')
  return `https://www.google.com/maps/dir/${path}`
}

export function buildMultiStopMapBboxUrl(stops: ScheduleRunMapStop[]): string | null {
  const bbox = computeMapBbox(stops)
  if (!bbox) return null
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&layer=mapnik`
}

export type MapBbox = {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export function computeMapBbox(stops: ScheduleRunMapStop[], pad = 0.025): MapBbox | null {
  if (stops.length === 0) return null
  const lats = stops.map((s) => s.lat)
  const lngs = stops.map((s) => s.lng)
  return {
    minLng: Math.min(...lngs) - pad,
    maxLng: Math.max(...lngs) + pad,
    minLat: Math.min(...lats) - pad,
    maxLat: Math.max(...lats) + pad,
  }
}

export function latLngToBboxPercent(
  lat: number,
  lng: number,
  bbox: MapBbox,
): { left: number; top: number } {
  const lngSpan = bbox.maxLng - bbox.minLng || 1
  const latSpan = bbox.maxLat - bbox.minLat || 1
  return {
    left: ((lng - bbox.minLng) / lngSpan) * 100,
    top: ((bbox.maxLat - lat) / latSpan) * 100,
  }
}

export function buildGoogleMapsSingleEmbedUrl(lat: number, lng: number): string {
  return `https://maps.google.com/maps?q=${lat},${lng}&z=14&output=embed`
}
