import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  jobBlockPosition,
  SCHEDULE_JOBS_JOB_LANE_HEIGHT,
  SCHEDULE_JOBS_ROW_HEIGHT,
  SCHEDULE_JOBS_ROW_LANE_GAP,
  SCHEDULE_JOBS_ROW_VERTICAL_PAD,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'

export type JobOverlapLayout = {
  lane: number
  laneCount: number
  overlapCount: number
}

type JobTiming = Pick<
  TimelineJob,
  'id' | 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'
>

export function jobsTimeOverlap(a: JobTiming, b: JobTiming): boolean {
  const pa = jobBlockPosition(a)
  const pb = jobBlockPosition(b)
  return pa.startMin < pb.endMin && pb.startMin < pa.endMin
}

/** Stack overlapping jobs into lanes so each visit slot stays visible on the timeline row. */
export function computeScheduleJobOverlapLayout(jobs: JobTiming[]): {
  byJobId: Map<string, JobOverlapLayout>
  rowHeightPx: number
} {
  if (jobs.length === 0) {
    return { byJobId: new Map(), rowHeightPx: SCHEDULE_JOBS_ROW_HEIGHT }
  }

  const sorted = [...jobs].sort((a, b) => {
    const pa = jobBlockPosition(a)
    const pb = jobBlockPosition(b)
    return pa.startMin - pb.startMin || pa.endMin - pb.endMin || a.id.localeCompare(b.id)
  })

  const laneEnds: number[] = []
  const laneByJobId = new Map<string, number>()

  for (const job of sorted) {
    const { startMin, endMin } = jobBlockPosition(job)
    let lane = laneEnds.findIndex((end) => startMin >= end)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(endMin)
    } else {
      laneEnds[lane] = Math.max(laneEnds[lane], endMin)
    }
    laneByJobId.set(job.id, lane)
  }

  const laneCount = Math.max(1, laneEnds.length)
  const byJobId = new Map<string, JobOverlapLayout>()

  for (const job of jobs) {
    const overlapCount = jobs.filter((other) => other.id !== job.id && jobsTimeOverlap(job, other)).length + 1
    byJobId.set(job.id, {
      lane: laneByJobId.get(job.id) ?? 0,
      laneCount,
      overlapCount,
    })
  }

  const rowHeightPx =
    laneCount <= 1
      ? SCHEDULE_JOBS_ROW_HEIGHT
      : Math.max(
          SCHEDULE_JOBS_ROW_HEIGHT,
          SCHEDULE_JOBS_ROW_VERTICAL_PAD * 2 +
            laneCount * SCHEDULE_JOBS_JOB_LANE_HEIGHT +
            (laneCount - 1) * SCHEDULE_JOBS_ROW_LANE_GAP,
        )

  return { byJobId, rowHeightPx }
}

export function scheduleJobLaneTopPx(lane: number): number {
  return SCHEDULE_JOBS_ROW_VERTICAL_PAD + lane * (SCHEDULE_JOBS_JOB_LANE_HEIGHT + SCHEDULE_JOBS_ROW_LANE_GAP)
}
