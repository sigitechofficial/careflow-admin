import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { isScheduleJobCancelled, isScheduleJobCompleted } from '@/features/scheduling/types/schedule-job-context-actions.types'
import {
  buildNextVisitTravelDetail,
  sortJobsByStartTime,
} from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import type { JobOverlapLayout } from '@/features/scheduling/utils/schedule-jobs-overlap-lanes.util'
import { scheduleJobLaneTopPx } from '@/features/scheduling/utils/schedule-jobs-overlap-lanes.util'
import {
  jobBlockLayoutPxInViewport,
  type ScheduleJobsTimelineViewport,
} from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'

/** Extra inset for card border, ring, and shadow outside the layout box. */
export const SCHEDULE_JOB_TRAVEL_CONNECTOR_CARD_HALO_PX = 4
/** Visible clear space between painted card edge and travel line. */
export const SCHEDULE_JOB_TRAVEL_CONNECTOR_AIR_GAP_PX = 10
/** @deprecated Use halo + air gap; kept for tests referencing total inset. */
export const SCHEDULE_JOB_TRAVEL_CONNECTOR_CARD_GAP_PX =
  SCHEDULE_JOB_TRAVEL_CONNECTOR_CARD_HALO_PX + SCHEDULE_JOB_TRAVEL_CONNECTOR_AIR_GAP_PX

/** Matches ScheduleJobBlock in carer view: `top-0.5` + `h-11`. */
export const SCHEDULE_JOB_TRAVEL_LABEL_BLOCK_TOP_PX = 2
export const SCHEDULE_JOB_TRAVEL_LABEL_BLOCK_HEIGHT_PX = 44

export function travelConnectorCardInsetPx(
  airGapPx = SCHEDULE_JOB_TRAVEL_CONNECTOR_AIR_GAP_PX,
  haloPx = SCHEDULE_JOB_TRAVEL_CONNECTOR_CARD_HALO_PX,
): number {
  return airGapPx + haloPx
}

export type ScheduleJobTravelConnector = {
  id: string
  fromJobId: string
  toJobId: string
  fromX: number
  toX: number
  lineEndX: number
  y: number
  midX: number
  widthPx: number
  label: string
  hasTravelConflict: boolean
}

type BuildScheduleJobTravelConnectorsOptions = {
  overlapByJobId?: Map<string, JobOverlapLayout>
  jobLaneHeight: number
  rowHeightPx: number
  travelBufferMinutes?: number
}

function jobVisualEdgePxInViewport(
  job: Pick<TimelineJob, 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'>,
  viewport: ScheduleJobsTimelineViewport,
  edge: 'start' | 'end',
): number | null {
  const layout = jobBlockLayoutPxInViewport(job, viewport)
  if (!layout) return null
  return edge === 'start' ? layout.leftPx : layout.leftPx + layout.widthPx
}

export function insetTravelConnectorEndpoints(
  fromEdgeX: number,
  toEdgeX: number,
  cardInsetPx = travelConnectorCardInsetPx(),
): { fromX: number; toX: number; widthPx: number; lineEndX: number } | null {
  const fromX = fromEdgeX + cardInsetPx
  const toX = toEdgeX - cardInsetPx
  const widthPx = toX - fromX
  if (widthPx < 4) return null
  return { fromX, toX, widthPx, lineEndX: toX }
}

export function scheduleJobTravelLabelY(options: {
  jobLaneHeight: number
  fromOverlap?: JobOverlapLayout
  toOverlap?: JobOverlapLayout
}): number {
  const laneCount = Math.max(options.fromOverlap?.laneCount ?? 1, options.toOverlap?.laneCount ?? 1)
  if (laneCount > 1) {
    const fromLane = options.fromOverlap?.lane ?? 0
    const toLane = options.toOverlap?.lane ?? 0
    const fromY = scheduleJobLaneTopPx(fromLane, options.jobLaneHeight) + options.jobLaneHeight / 2
    const toY = scheduleJobLaneTopPx(toLane, options.jobLaneHeight) + options.jobLaneHeight / 2
    return (fromY + toY) / 2
  }

  return (
    SCHEDULE_JOB_TRAVEL_LABEL_BLOCK_TOP_PX + SCHEDULE_JOB_TRAVEL_LABEL_BLOCK_HEIGHT_PX / 2
  )
}

export function buildScheduleJobTravelConnectors(
  jobs: TimelineJob[],
  viewport: ScheduleJobsTimelineViewport,
  options: BuildScheduleJobTravelConnectorsOptions,
): ScheduleJobTravelConnector[] {
  if (jobs.length < 2) return []

  const connectors: ScheduleJobTravelConnector[] = []
  const ordered = sortJobsByStartTime(jobs)

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const fromJob = ordered[index]
    const toJob = ordered[index + 1]
    if (!fromJob || !toJob) continue
    if (isScheduleJobCompleted(fromJob) || isScheduleJobCancelled(fromJob)) continue

    const detail = buildNextVisitTravelDetail(fromJob, jobs, {
      bufferMinutes: options.travelBufferMinutes ?? 0,
    })
    if (!detail) continue

    const fromEdgeX = jobVisualEdgePxInViewport(fromJob, viewport, 'end')
    const toEdgeX = jobVisualEdgePxInViewport(toJob, viewport, 'start')
    if (fromEdgeX == null || toEdgeX == null) continue

    const endpoints = insetTravelConnectorEndpoints(fromEdgeX, toEdgeX)
    if (!endpoints) continue

    const { fromX, toX, widthPx, lineEndX } = endpoints
    const y = scheduleJobTravelLabelY({
      jobLaneHeight: options.jobLaneHeight,
      fromOverlap: options.overlapByJobId?.get(fromJob.id),
      toOverlap: options.overlapByJobId?.get(toJob.id),
    })
    const midX = fromX + widthPx / 2

    connectors.push({
      id: `${fromJob.id}->${toJob.id}`,
      fromJobId: fromJob.id,
      toJobId: toJob.id,
      fromX,
      toX,
      lineEndX,
      y,
      midX,
      widthPx,
      label: `${detail.distanceLabel} · ${detail.travelLabel}`,
      hasTravelConflict: detail.hasTravelConflict,
    })
  }

  return connectors
}
