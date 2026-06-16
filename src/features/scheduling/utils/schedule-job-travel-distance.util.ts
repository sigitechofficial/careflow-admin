import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { jobRotaTimeRange } from '@/features/scheduling/utils/schedule-job-hover-details.util'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'

export type GeoCoordinates = {
  lat: number
  lng: number
}

export type NextVisitTravelDetail = {
  nextJob: TimelineJob
  distanceKm: number
  distanceLabel: string
  travelMinutes: number
  travelLabel: string
  nextClientLabel: string
  nextVisitTimeLabel: string
}

const EARTH_RADIUS_KM = 6371
/** Straight-line distance underestimates driving distance in urban areas. */
const ROAD_DISTANCE_FACTOR = 1.35
/** Typical local driving speed for care visits (km/h), including lights and parking. */
const AVERAGE_DRIVING_SPEED_KMH = 28

export function jobGeoCoordinates(job: TimelineJob): GeoCoordinates | null {
  const lat = job.serviceUser.latitude
  const lng = job.serviceUser.longitude
  if (lat == null || lng == null) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

export function haversineDistanceKm(from: GeoCoordinates, to: GeoCoordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatTravelDistanceKm(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return '—'
  if (distanceKm < 0.1) return `${Math.round(distanceKm * 1000)} m`
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km`
  return `${Math.round(distanceKm)} km`
}

/** Estimates driving time from straight-line (haversine) distance. */
export function estimateTravelMinutesFromStraightLineKm(straightLineKm: number): number {
  if (!Number.isFinite(straightLineKm) || straightLineKm <= 0) return 0
  const roadKm = straightLineKm * ROAD_DISTANCE_FACTOR
  return Math.max(1, Math.round((roadKm / AVERAGE_DRIVING_SPEED_KMH) * 60))
}

export function formatTravelDurationMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '< 1 min'
  if (minutes < 60) return `~${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (remainder === 0) return `~${hours} hr`
  return `~${hours} hr ${remainder} min`
}

export function sortJobsByStartTime(jobs: TimelineJob[]): TimelineJob[] {
  return [...jobs].sort(
    (a, b) =>
      new Date(a.scheduledStartDateTime).getTime() - new Date(b.scheduledStartDateTime).getTime(),
  )
}

export function findNextJobInRow(job: TimelineJob, rowJobs: TimelineJob[]): TimelineJob | null {
  const ordered = sortJobsByStartTime(rowJobs)
  const index = ordered.findIndex((rowJob) => rowJob.id === job.id)
  if (index < 0 || index >= ordered.length - 1) return null
  return ordered[index + 1] ?? null
}

export function buildNextVisitTravelDetail(
  job: TimelineJob,
  rowJobs?: TimelineJob[],
): NextVisitTravelDetail | null {
  if (!rowJobs?.length) return null
  const nextJob = findNextJobInRow(job, rowJobs)
  if (!nextJob) return null

  const from = jobGeoCoordinates(job)
  const to = jobGeoCoordinates(nextJob)
  if (!from || !to) return null

  const distanceKm = haversineDistanceKm(from, to)
  const travelMinutes = estimateTravelMinutesFromStraightLineKm(distanceKm)
  const nextVisitTimeLabel = jobRotaTimeRange(nextJob).start

  return {
    nextJob,
    distanceKm,
    distanceLabel: formatTravelDistanceKm(distanceKm),
    travelMinutes,
    travelLabel: formatTravelDurationMinutes(travelMinutes),
    nextClientLabel: serviceUserLabel(nextJob.serviceUser),
    nextVisitTimeLabel,
  }
}
