import type { EmployeeDayPattern, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  estimateTravelMinutesFromStraightLineKm,
  gapMinutesBetweenJobs,
  geoCoordinatesFromLatLng,
  haversineDistanceKm,
  jobGeoCoordinates,
  sortJobsByStartTime,
  type GeoCoordinates,
} from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import { jobBlockPosition, SCHEDULE_JOBS_DAY_START_HOUR } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { timelineMinutesToHm } from '@/features/scheduling/utils/schedule-jobs-availability.util'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import {
  resolveTravelTimingStatus,
  type TravelTimingStatus,
} from '@/features/scheduling/utils/schedule-job-travel-timing.util'

export type RotaGapDisplayMode = 'none' | 'idle' | 'travel' | 'both'

export const ROTA_GAP_DISPLAY_MODES: RotaGapDisplayMode[] = ['none', 'idle', 'travel', 'both']

export type RotaGapSegmentKind = 'idle' | 'travel'

export type RotaGapSegment = {
  id: string
  kind: RotaGapSegmentKind
  startMin: number
  endMin: number
  /** Clock range shown on the block, e.g. `08:00–09:35`. */
  timeRangeLabel: string
  /** Duration shown under the time range, e.g. `35 min`. */
  durationLabel: string
  durationMinutes: number
  title: string
  /** @deprecated Prefer travelTimingStatus */
  hasConflict?: boolean
  travelTimingStatus?: TravelTimingStatus
  /** Destination visit for travel / idle-before-visit segments. */
  toJobId?: string
}

function parseHmToTimelineMinutes(hm: string, dayStartHour: number): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hm.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return Math.max(0, hours * 60 + minutes - dayStartHour * 60)
}

/** Minutes from timeline start when the carer's working day begins. */
export function resolveCarerWorkStartMinute(
  dayPattern: EmployeeDayPattern | null | undefined,
  dayStartHour = SCHEDULE_JOBS_DAY_START_HOUR,
): number {
  if (!dayPattern?.isAvailable) return 0
  if (!dayPattern.startTime) return 0
  return parseHmToTimelineMinutes(dayPattern.startTime, dayStartHour) ?? 0
}

export function rotaGapDisplayModeLabel(mode: RotaGapDisplayMode): string {
  switch (mode) {
    case 'none':
      return 'Hidden'
    case 'idle':
      return 'Idle time only'
    case 'travel':
      return 'Travel time only'
    case 'both':
      return 'Idle and travel'
  }
}

export function rotaGapDisplayModeIncludesIdle(mode: RotaGapDisplayMode): boolean {
  return mode === 'idle' || mode === 'both'
}

export function rotaGapDisplayModeIncludesTravel(mode: RotaGapDisplayMode): boolean {
  return mode === 'travel' || mode === 'both'
}

function formatMinuteRange(startMin: number, endMin: number, dayStartHour = SCHEDULE_JOBS_DAY_START_HOUR): string {
  return `${timelineMinutesToHm(startMin, dayStartHour)} – ${timelineMinutesToHm(endMin, dayStartHour)}`
}

/** Compact clock range for block header, e.g. `08:00–09:35`. */
export function formatGapTimeRange(
  startMin: number,
  endMin: number,
  dayStartHour = SCHEDULE_JOBS_DAY_START_HOUR,
): string {
  return `${timelineMinutesToHm(startMin, dayStartHour)}–${timelineMinutesToHm(endMin, dayStartHour)}`
}

export function formatGapDurationMinutes(minutes: number, kind: RotaGapSegmentKind): string {
  const rounded = Math.max(0, Math.round(minutes))
  if (rounded <= 0) return kind === 'travel' ? '< 1 min' : '0 min'
  return `${rounded} min`
}

/** Position idle/travel blocks immediately before the destination visit start. */
export function anchorPreVisitGapSegmentPosition(options: {
  visitStartMin: number
  travelWindowMinutes: number
  idleMinutes: number
  kind: RotaGapSegmentKind
}): { startMin: number; endMin: number } {
  const travelStart = options.visitStartMin - Math.max(0, options.travelWindowMinutes)
  if (options.kind === 'travel') {
    return { startMin: travelStart, endMin: options.visitStartMin }
  }
  return {
    startMin: Math.max(0, travelStart - Math.max(0, options.idleMinutes)),
    endMin: travelStart,
  }
}

function buildGapSegmentFields(options: {
  kind: RotaGapSegmentKind
  visitStartMin: number
  travelWindowMinutes: number
  idleMinutes: number
  dayStartHour: number
  title: string
  toJobId?: string
  hasConflict?: boolean
  travelTimingStatus?: TravelTimingStatus
}): Omit<RotaGapSegment, 'id'> {
  const { startMin, endMin } = anchorPreVisitGapSegmentPosition({
    visitStartMin: options.visitStartMin,
    travelWindowMinutes: options.travelWindowMinutes,
    idleMinutes: options.idleMinutes,
    kind: options.kind,
  })
  const durationMinutes = Math.max(0, endMin - startMin)
  return {
    kind: options.kind,
    startMin,
    endMin,
    timeRangeLabel: formatGapTimeRange(startMin, endMin, options.dayStartHour),
    durationLabel: formatGapDurationMinutes(durationMinutes, options.kind),
    durationMinutes,
    title: options.title,
    toJobId: options.toJobId,
    hasConflict: options.travelTimingStatus === 'conflict' || options.hasConflict,
    travelTimingStatus: options.travelTimingStatus,
  }
}

function pushSegment(
  segments: RotaGapSegment[],
  segment: Omit<RotaGapSegment, 'id'> & { id?: string },
): void {
  if (segment.endMin <= segment.startMin) return
  segments.push({
    ...segment,
    id: segment.id ?? `${segment.kind}-${segment.startMin}-${segment.endMin}-${segment.toJobId ?? 'row'}`,
  })
}

export function estimateTravelMinutesBetween(
  from: GeoCoordinates | null,
  to: GeoCoordinates | null,
): number | null {
  if (!from || !to) return null
  const distanceKm = haversineDistanceKm(from, to)
  return estimateTravelMinutesFromStraightLineKm(distanceKm)
}

/** Split a gap before a visit into idle (wait) and travel (drive) portions. */
export function splitPreVisitGapMinutes(options: {
  windowStartMin: number
  visitStartMin: number
  travelMinutes: number
  bufferMinutes?: number
}): { idleMinutes: number; travelMinutes: number; departMin: number } {
  const bufferMinutes = Math.max(0, options.bufferMinutes ?? 0)
  const travelNeed = Math.max(0, options.travelMinutes) + bufferMinutes
  const departMin = Math.max(options.windowStartMin, options.visitStartMin - travelNeed)
  const idleMinutes = Math.max(0, departMin - options.windowStartMin)
  const travelMinutes = Math.max(0, options.visitStartMin - departMin)
  return { idleMinutes, travelMinutes, departMin }
}

export function buildFirstJobRotaGapSegments(options: {
  jobs: TimelineJob[]
  dayPattern?: EmployeeDayPattern | null
  carerCoordinates?: GeoCoordinates | null
  displayMode: RotaGapDisplayMode
  bufferMinutes?: number
  dayStartHour?: number
}): RotaGapSegment[] {
  if (!rotaGapDisplayModeIncludesIdle(options.displayMode) && !rotaGapDisplayModeIncludesTravel(options.displayMode)) {
    return []
  }

  const ordered = sortJobsByStartTime(options.jobs)
  const firstJob = ordered[0]
  if (!firstJob) return []

  const dayStartHour = options.dayStartHour ?? SCHEDULE_JOBS_DAY_START_HOUR
  const workStartMin = resolveCarerWorkStartMinute(options.dayPattern, dayStartHour)
  const visitStartMin = jobBlockPosition(firstJob).startMin
  if (visitStartMin <= workStartMin) return []

  const toCoords = jobGeoCoordinates(firstJob)
  const travelMinutes = estimateTravelMinutesBetween(options.carerCoordinates ?? null, toCoords)
  const segments: RotaGapSegment[] = []
  const showTravel = rotaGapDisplayModeIncludesTravel(options.displayMode)

  const toJob = firstJob
  const toClientLabel = serviceUserLabel(toJob.serviceUser)

  if (travelMinutes == null || travelMinutes <= 0 || !showTravel) {
    return segments
  }

  const bufferMinutes = Math.max(0, options.bufferMinutes ?? 0)
  const travelNeed = Math.max(0, travelMinutes) + bufferMinutes
  const departMin = Math.max(workStartMin, visitStartMin - travelNeed)
  const travelWindowMinutes = visitStartMin - departMin
  if (travelWindowMinutes <= 0) return segments

  const totalWindow = visitStartMin - workStartMin
  const travelTimingStatus = resolveTravelTimingStatus(
    totalWindow,
    travelMinutes,
    options.bufferMinutes,
  )

  pushSegment(segments, buildGapSegmentFields({
    kind: 'travel',
    visitStartMin,
    travelWindowMinutes,
    idleMinutes: 0,
    dayStartHour,
    title: `Travel to ${toClientLabel} (${formatMinuteRange(departMin, visitStartMin, dayStartHour)})`,
    toJobId: toJob.id,
    travelTimingStatus,
  }))

  return segments
}

export function buildBetweenJobsRotaGapSegments(options: {
  jobs: TimelineJob[]
  displayMode: RotaGapDisplayMode
  bufferMinutes?: number
  dayStartHour?: number
}): RotaGapSegment[] {
  if (!rotaGapDisplayModeIncludesIdle(options.displayMode) && !rotaGapDisplayModeIncludesTravel(options.displayMode)) {
    return []
  }

  const ordered = sortJobsByStartTime(options.jobs)
  if (ordered.length < 2) return []

  const dayStartHour = options.dayStartHour ?? SCHEDULE_JOBS_DAY_START_HOUR
  const showIdle = rotaGapDisplayModeIncludesIdle(options.displayMode)
  const showTravel = rotaGapDisplayModeIncludesTravel(options.displayMode)
  const segments: RotaGapSegment[] = []

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const fromJob = ordered[index]
    const toJob = ordered[index + 1]
    if (!fromJob || !toJob) continue

    const gapStartMin = jobBlockPosition(fromJob).endMin
    const visitStartMin = jobBlockPosition(toJob).startMin
    if (visitStartMin <= gapStartMin) continue

    const fromCoords = jobGeoCoordinates(fromJob)
    const toCoords = jobGeoCoordinates(toJob)
    const travelMinutes = estimateTravelMinutesBetween(fromCoords, toCoords)
    const gapMinutes = gapMinutesBetweenJobs(fromJob, toJob)

    const toClientLabel = serviceUserLabel(toJob.serviceUser)

    if (travelMinutes == null || travelMinutes <= 0) {
      if (showIdle) {
        pushSegment(segments, buildGapSegmentFields({
          kind: 'idle',
          visitStartMin,
          travelWindowMinutes: 0,
          idleMinutes: gapMinutes,
          dayStartHour,
          title: `Idle before ${toClientLabel} (${formatMinuteRange(gapStartMin, visitStartMin, dayStartHour)})`,
          toJobId: toJob.id,
        }))
      }
      continue
    }

    const split = splitPreVisitGapMinutes({
      windowStartMin: gapStartMin,
      visitStartMin,
      travelMinutes,
      bufferMinutes: options.bufferMinutes,
    })
    const travelTimingStatus = resolveTravelTimingStatus(
      gapMinutes,
      split.travelMinutes,
      options.bufferMinutes,
    )

    if (showIdle && split.idleMinutes > 0) {
      pushSegment(segments, buildGapSegmentFields({
        kind: 'idle',
        visitStartMin,
        travelWindowMinutes: split.travelMinutes,
        idleMinutes: split.idleMinutes,
        dayStartHour,
        title: `Idle before travelling to ${toClientLabel} (${formatMinuteRange(gapStartMin, split.departMin, dayStartHour)})`,
        toJobId: toJob.id,
      }))
    }

    if (showTravel && split.travelMinutes > 0) {
      pushSegment(segments, buildGapSegmentFields({
        kind: 'travel',
        visitStartMin,
        travelWindowMinutes: split.travelMinutes,
        idleMinutes: 0,
        dayStartHour,
        title: `Travel to ${toClientLabel} (${formatMinuteRange(split.departMin, visitStartMin, dayStartHour)})`,
        toJobId: toJob.id,
        travelTimingStatus,
      }))
    }
  }

  return segments
}

export function buildCarerRowRotaGapSegments(options: {
  jobs: TimelineJob[]
  dayPattern?: EmployeeDayPattern | null
  carerCoordinates?: GeoCoordinates | null
  displayMode: RotaGapDisplayMode
  bufferMinutes?: number
}): RotaGapSegment[] {
  if (options.displayMode === 'none') return []
  return [
    ...buildFirstJobRotaGapSegments(options),
    ...buildBetweenJobsRotaGapSegments(options),
  ]
}

export function parseEmployeeHomeCoordinates(
  latitude?: number | string | null,
  longitude?: number | string | null,
): GeoCoordinates | null {
  return geoCoordinatesFromLatLng(latitude, longitude)
}

export { geoCoordinatesFromLatLng }
