import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { NextVisitTravelDetail } from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import {
  TRAVEL_TIGHT_SPARE_MINUTES,
  type TravelTimingStatus,
} from '@/features/scheduling/utils/schedule-job-travel-timing.util'
import { jobRotaTimeRange } from '@/features/scheduling/utils/schedule-job-hover-details.util'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'

export type TravelTimingBadgeTone = 'rose' | 'amber' | 'emerald'

export type TravelTimingBadge = {
  label: string
  tone: TravelTimingBadgeTone
}

export function resolveTravelTimingBadge(detail: NextVisitTravelDetail): TravelTimingBadge | null {
  if (detail.hasTravelConflict) {
    return { label: 'Arrives too late', tone: 'rose' }
  }
  const spareMinutes = detail.gapMinutes - detail.requiredGapMinutes
  if (spareMinutes <= TRAVEL_TIGHT_SPARE_MINUTES) {
    return { label: 'Only just on time', tone: 'amber' }
  }
  return null
}

/** Where the driving time comes from, shown after the travel figures. */
export function travelSourceLabel(detail: NextVisitTravelDetail): string {
  return detail.travelSource === 'GOOGLE' ? 'Google route' : 'estimated'
}

export function formatInboundTravelSummary(
  detail: NextVisitTravelDetail,
  previousJob: TimelineJob,
  visitStartLabel: string,
): { headline: string; subline: string } {
  const previousName = serviceUserLabel(previousJob.serviceUser)
  const previousEnd = jobRotaTimeRange(previousJob).end
  const spareMinutes = detail.gapMinutes - detail.requiredGapMinutes

  const headline = detail.hasTravelConflict
    ? `Coming from ${previousName}, the carer can't arrive until ${detail.estimatedArrivalLabel} — after the ${visitStartLabel} start`
    : `Leaves ${previousName} at ${previousEnd}, drives ${detail.travelMinutes} min, arrives ${detail.estimatedArrivalLabel}`

  const subline = detail.hasTravelConflict
    ? `${detail.distanceLabel}, about ${detail.travelLabel} driving`
    : spareMinutes <= 0
      ? `No spare minutes before the ${visitStartLabel} start · ${detail.distanceLabel}`
      : `${spareMinutes} min spare before the ${visitStartLabel} start · ${detail.distanceLabel}`

  return { headline, subline: `${subline} · ${travelSourceLabel(detail)}` }
}

export function formatOutboundTravelSummary(
  detail: NextVisitTravelDetail,
  fromJob: TimelineJob,
): { headline: string; subline: string } {
  const fromEnd = jobRotaTimeRange(fromJob).end
  const nextName = detail.nextClientLabel
  const spareMinutes = detail.gapMinutes - detail.requiredGapMinutes

  const headline = detail.hasTravelConflict
    ? `Going on to ${nextName}, the carer can't arrive until ${detail.estimatedArrivalLabel} — after ${detail.nextVisitTimeLabel} start`
    : `Leaves at ${fromEnd}, drives ${detail.travelMinutes} min, arrives ${detail.estimatedArrivalLabel}`

  const subline = detail.hasTravelConflict
    ? `${detail.distanceLabel}, about ${detail.travelLabel} driving`
    : spareMinutes <= 0
      ? `No spare minutes before ${detail.nextVisitTimeLabel} start · ${detail.distanceLabel}`
      : `${spareMinutes} min spare before ${detail.nextVisitTimeLabel} start · ${detail.distanceLabel}`

  return { headline, subline: `${subline} · ${travelSourceLabel(detail)}` }
}
