import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  buildNextVisitTravelDetail,
  formatTravelDistanceKm,
  sortJobsByStartTime,
} from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import {
  formatHoursMinutes,
  jobDurationMinutes,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'

export type ScheduleRunStats = {
  visitCount: number
  rosteredMinutes: number
  rosteredLabel: string
  /** Nourish-style e.g. "4 hours, 35 minutes" */
  rosteredDisplayLabel: string
  travelMinutes: number
  travelLabel: string
  /** Nourish-style e.g. "20 minutes" */
  travelTimeDisplayLabel: string
  travelDistanceKm: number
  travelDistanceLabel: string
  travelPercentOfRostered: number
  travelPercentDisplayLabel: string | null
  waitMinutes: number
  waitLabel: string
  /** Nourish-style e.g. "34 minutes" */
  waitDisplayLabel: string
}

function formatRunDurationLabel(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '—'
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m} minute${m === 1 ? '' : 's'}`
  const hourPart = `${h} hour${h === 1 ? '' : 's'}`
  if (m === 0) return hourPart
  return `${hourPart}, ${m} minute${m === 1 ? '' : 's'}`
}

export function computeScheduleRunStats(
  jobs: TimelineJob[],
  travelBufferMinutes = 0,
): ScheduleRunStats {
  const sorted = sortJobsByStartTime(jobs)
  let rosteredMinutes = 0
  let travelMinutes = 0
  let travelDistanceKm = 0
  let waitMinutes = 0

  for (const job of sorted) {
    rosteredMinutes += jobDurationMinutes(job)
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i]
    if (!current) continue
    const detail = buildNextVisitTravelDetail(current, sorted, { bufferMinutes: travelBufferMinutes })
    if (!detail) continue
    travelMinutes += detail.travelMinutes
    travelDistanceKm += detail.distanceKm
    const slack = detail.gapMinutes - detail.requiredGapMinutes
    if (slack > 0) waitMinutes += slack
  }

  const travelPercentOfRostered =
    rosteredMinutes > 0 ? Math.round((travelMinutes / rosteredMinutes) * 100) : 0

  const travelPercentDisplayLabel =
    rosteredMinutes > 0 && travelMinutes > 0
      ? `${travelPercentOfRostered}% of rostered time`
      : null

  return {
    visitCount: sorted.length,
    rosteredMinutes,
    rosteredLabel: formatHoursMinutes(rosteredMinutes),
    rosteredDisplayLabel: formatRunDurationLabel(rosteredMinutes),
    travelMinutes,
    travelLabel:
      travelMinutes > 0
        ? `${travelMinutes} min${travelPercentOfRostered > 0 ? ` — ${travelPercentOfRostered}% of rostered time` : ''}`
        : '—',
    travelTimeDisplayLabel: formatRunDurationLabel(travelMinutes),
    travelDistanceKm,
    travelDistanceLabel: travelDistanceKm > 0 ? formatTravelDistanceKm(travelDistanceKm) : '0 mi',
    travelPercentOfRostered,
    travelPercentDisplayLabel,
    waitMinutes,
    waitLabel: waitMinutes > 0 ? `${waitMinutes} min` : '—',
    waitDisplayLabel: formatRunDurationLabel(waitMinutes),
  }
}
