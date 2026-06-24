import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { jobRotaTimeRange } from '@/features/scheduling/utils/schedule-job-hover-details.util'
import { jobDurationMinutes } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
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
  gapMinutes: number
  bufferMinutes: number
  requiredGapMinutes: number
  hasTravelConflict: boolean
  lateByMinutes: number
  estimatedArrivalLabel: string
}

export type BuildNextVisitTravelOptions = {
  bufferMinutes?: number
}

const EARTH_RADIUS_KM = 6371
/** Straight-line distance underestimates driving distance in urban areas. */
const ROAD_DISTANCE_FACTOR = 1.35
/** Typical local driving speed for care visits (km/h), including lights and parking. */
const AVERAGE_DRIVING_SPEED_KMH = 28

export function jobGeoCoordinates(job: TimelineJob): GeoCoordinates | null {
  const lat = job.serviceUser.latitude ?? job.latitude
  const lng = job.serviceUser.longitude ?? job.longitude
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

function jobEndTimestampMs(job: TimelineJob): number {
  if (job.scheduledEndDateTime) {
    return new Date(job.scheduledEndDateTime).getTime()
  }
  return new Date(job.scheduledStartDateTime).getTime() + jobDurationMinutes(job) * 60_000
}

export function gapMinutesBetweenJobs(current: TimelineJob, next: TimelineJob): number {
  const gapMs = new Date(next.scheduledStartDateTime).getTime() - jobEndTimestampMs(current)
  return Math.round(gapMs / 60_000)
}

export function addMinutesToHm(hm: string, minutes: number): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hm.trim())
  if (!match) return hm
  const total = Number(match[1]) * 60 + Number(match[2]) + minutes
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  const hours = Math.floor(normalized / 60)
  const mins = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function hasTravelGapConflict(
  gapMinutes: number,
  travelMinutes: number,
  bufferMinutes: number,
): boolean {
  const requiredGapMinutes = travelMinutes + Math.max(0, bufferMinutes)
  return gapMinutes >= 0 && gapMinutes < requiredGapMinutes
}

export function travelConflictJobIds(
  rowJobs: TimelineJob[],
  bufferMinutes = 0,
): Set<string> {
  const ids = new Set<string>()
  for (const job of rowJobs) {
    const detail = buildNextVisitTravelDetail(job, rowJobs, { bufferMinutes })
    if (detail?.hasTravelConflict) ids.add(job.id)
  }
  return ids
}

export function buildNextVisitTravelDetail(
  job: TimelineJob,
  rowJobs?: TimelineJob[],
  options?: BuildNextVisitTravelOptions,
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
  const rota = jobRotaTimeRange(job)
  const bufferMinutes = Math.max(0, options?.bufferMinutes ?? 0)
  const gapMinutes = gapMinutesBetweenJobs(job, nextJob)
  const requiredGapMinutes = travelMinutes + bufferMinutes
  const hasTravelConflict = hasTravelGapConflict(gapMinutes, travelMinutes, bufferMinutes)
  const lateByMinutes = hasTravelConflict ? requiredGapMinutes - gapMinutes : 0
  const estimatedArrivalLabel = addMinutesToHm(rota.end, travelMinutes)

  return {
    nextJob,
    distanceKm,
    distanceLabel: formatTravelDistanceKm(distanceKm),
    travelMinutes,
    travelLabel: formatTravelDurationMinutes(travelMinutes),
    nextClientLabel: serviceUserLabel(nextJob.serviceUser),
    nextVisitTimeLabel,
    gapMinutes,
    bufferMinutes,
    requiredGapMinutes,
    hasTravelConflict,
    lateByMinutes,
    estimatedArrivalLabel,
  }
}

/** Sum straight-line leg distances between consecutive jobs on a carer row. */
export function computeRowTravelDistanceKm(rowJobs: TimelineJob[] | undefined): number {
  if (!rowJobs?.length) return 0
  const ordered = sortJobsByStartTime(rowJobs)
  let totalKm = 0
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const detail = buildNextVisitTravelDetail(ordered[index], ordered)
    if (detail) totalKm += detail.distanceKm
  }
  return totalKm
}
