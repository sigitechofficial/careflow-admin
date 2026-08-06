import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  assessVisitDeliveryFromJobLike,
  type VisitDeliveryAssessment,
  type VisitDeliveryExceptionFlag,
} from '@/features/scheduling/utils/visit-delivery-assessment.util'
import { activeJobAllocationCount } from '@/features/scheduling/utils/scheduling-format'

/** Timing / duration flags worth surfacing on the rota board (compact). */
const BOARD_FLAG_CODES = new Set([
  'EARLY_ARRIVAL',
  'LATE_START',
  'CRITICALLY_LATE',
  'EARLY_END',
  'LATE_END',
  'OVERRUN',
  'ACTUAL_SHORT_VISIT',
  'ABNORMALLY_LONG_OPEN',
  'ZERO_DURATION',
  'NEGATIVE_OR_INVALID_DURATION',
])

const SHORT_LABELS: Record<string, string> = {
  EARLY_ARRIVAL: 'Early start',
  LATE_START: 'Late start',
  CRITICALLY_LATE: 'Crit. late',
  EARLY_END: 'Early end',
  LATE_END: 'Late end',
  OVERRUN: 'Overrun',
  ACTUAL_SHORT_VISIT: 'Short',
  ABNORMALLY_LONG_OPEN: 'Open long',
  ZERO_DURATION: '0 min',
  NEGATIVE_OR_INVALID_DURATION: 'Bad times',
}

export function assessTimelineJobDelivery(job: TimelineJob): VisitDeliveryAssessment {
  if (job.deliveryAssessment) return job.deliveryAssessment
  const visit = job.visits?.[0]
  return assessVisitDeliveryFromJobLike({
    status: job.status,
    requiredCarers: job.requiredCarers,
    allocatedCarers: activeJobAllocationCount(job),
    allocations: job.allocations,
    scheduledStartDateTime: job.scheduledStartDateTime,
    scheduledEndDateTime: job.scheduledEndDateTime,
    actualStartDateTime: visit?.actualStartDateTime ?? job.actualStartDateTime,
    actualEndDateTime: visit?.actualEndDateTime ?? job.actualEndDateTime,
    visitPlan: job.visitPlan
      ? {
          slotId: job.visitPlan.slotId,
          timeCritical: job.visitPlan.timeCritical,
          timeToleranceMinutes: job.visitPlan.timeToleranceMinutes,
        }
      : null,
    visits: job.visits,
  })
}

export function boardVisibleDeliveryFlags(
  assessment: VisitDeliveryAssessment,
): VisitDeliveryExceptionFlag[] {
  return assessment.flags.filter((flag) => BOARD_FLAG_CODES.has(flag.code))
}

export function deliveryFlagShortLabel(flag: VisitDeliveryExceptionFlag): string {
  return SHORT_LABELS[flag.code] ?? flag.label
}

export function deliveryFlagChipClass(severity: VisitDeliveryExceptionFlag['severity']): string {
  if (severity === 'critical') {
    return 'bg-destructive text-destructive-foreground'
  }
  if (severity === 'warning') {
    return 'bg-orange-600 text-white'
  }
  return 'bg-sky-600 text-white'
}

export function timelineJobBoardDeliveryFlags(job: TimelineJob): VisitDeliveryExceptionFlag[] {
  return boardVisibleDeliveryFlags(assessTimelineJobDelivery(job))
}
