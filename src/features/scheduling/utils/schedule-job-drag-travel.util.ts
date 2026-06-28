import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  buildInboundVisitTravelDetail,
  buildNextVisitTravelDetail,
  sortJobsByStartTime,
} from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import {
  resolveTravelTimingStatus,
  type TravelTimingStatus,
} from '@/features/scheduling/utils/schedule-job-travel-timing.util'
import type { ScheduleJobsRowRef } from '@/features/scheduling/utils/schedule-jobs-drag.util'

export type JobDropTravelPreview = {
  status: TravelTimingStatus
  message: string | null
}

function jobWithScheduleTimes(
  job: TimelineJob,
  scheduledStartDateTime: string,
  scheduledEndDateTime: string | null,
): TimelineJob {
  return {
    ...job,
    scheduledStartDateTime,
    scheduledEndDateTime,
  }
}

export function rowJobsAfterDrop(
  rowJobs: TimelineJob[],
  job: TimelineJob,
  scheduledStartDateTime: string,
  scheduledEndDateTime: string | null,
): TimelineJob[] {
  const updated = jobWithScheduleTimes(job, scheduledStartDateTime, scheduledEndDateTime)
  return sortJobsByStartTime(rowJobs.filter((rowJob) => rowJob.id !== job.id).concat(updated))
}

export function evaluateJobDropTravelPreview(options: {
  job: TimelineJob
  targetRow: ScheduleJobsRowRef
  rowJobs: TimelineJob[]
  scheduledStartDateTime: string
  scheduledEndDateTime: string | null
  bufferMinutes?: number
}): JobDropTravelPreview {
  if (options.targetRow.kind !== 'carer') {
    return { status: 'ok', message: null }
  }

  const bufferMinutes = Math.max(0, options.bufferMinutes ?? 0)
  const rowJobs = rowJobsAfterDrop(
    options.rowJobs,
    options.job,
    options.scheduledStartDateTime,
    options.scheduledEndDateTime,
  )
  const updatedJob = rowJobs.find((rowJob) => rowJob.id === options.job.id) ?? options.job

  const inbound = buildInboundVisitTravelDetail(updatedJob, rowJobs, { bufferMinutes })
  const outbound = buildNextVisitTravelDetail(updatedJob, rowJobs, { bufferMinutes })

  let worst: TravelTimingStatus = 'ok'

  if (inbound?.hasTravelConflict) {
    return {
      status: 'conflict',
      message: `Not enough travel time from the previous visit — carer may arrive ~${inbound.lateByMinutes} min late (${inbound.estimatedArrivalLabel}).`,
    }
  }
  if (inbound) {
    const inboundStatus = resolveTravelTimingStatus(
      inbound.gapMinutes,
      inbound.travelMinutes,
      bufferMinutes,
    )
    if (inboundStatus === 'tight') worst = 'tight'
  }

  if (outbound?.hasTravelConflict) {
    return {
      status: 'conflict',
      message: `Not enough travel time to reach the next visit — carer may arrive ~${outbound.lateByMinutes} min late (${outbound.estimatedArrivalLabel} vs ${outbound.nextVisitTimeLabel} start).`,
    }
  }
  if (outbound) {
    const outboundStatus = resolveTravelTimingStatus(
      outbound.gapMinutes,
      outbound.travelMinutes,
      bufferMinutes,
    )
    if (outboundStatus === 'conflict') {
      return {
        status: 'conflict',
        message: `Not enough travel time to reach ${outbound.nextClientLabel}.`,
      }
    }
    if (outboundStatus === 'tight') worst = 'tight'
  }

  if (worst === 'tight') {
    return {
      status: 'tight',
      message: 'Only just enough travel time on this rota — consider leaving more gap.',
    }
  }

  return { status: 'ok', message: null }
}

export function confirmJobDropTravelConflict(message: string): boolean {
  return window.confirm(`${message}\n\nPlace this visit here anyway?`)
}
