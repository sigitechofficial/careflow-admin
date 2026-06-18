import {
  VISIT_PLAN_CALENDAR_OUTCOME_OPTIONS,
  type VisitPlanCalendarOutcomeStatus,
} from '@/features/service-users/visit-plan/visit-plan-calendar-outcome.constants'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'

export const SCHEDULE_JOB_VISIT_OUTCOME_OPTIONS = VISIT_PLAN_CALENDAR_OUTCOME_OPTIONS.filter(
  (option) => option.value !== 'NOT_GENERATED',
)

const JOB_STATUS_TO_VISIT_OUTCOME: Partial<Record<string, VisitPlanCalendarOutcomeStatus>> = {
  DRAFT: 'PLANNED',
  UNALLOCATED: 'PLANNED',
  ALLOCATED: 'PLANNED',
  IN_PROGRESS: 'STARTED',
  COMPLETED: 'COMPLETED',
  PARTIALLY_COMPLETED: 'PARTIALLY_COMPLETED',
  MISSED: 'MISSED',
  CANCELLED: 'CANCELLED',
  CALLED_OFF: 'CALLED_OFF',
  NEEDS_ATTENTION: 'NEEDS_ATTENTION',
}

export function defaultScheduleJobVisitOutcome(
  job: Pick<TimelineJob, 'status' | 'visits'>,
): VisitPlanCalendarOutcomeStatus {
  const visitStatus = job.visits?.[0]?.status
  if (visitStatus && visitStatus !== 'NOT_GENERATED') {
    return visitStatus as VisitPlanCalendarOutcomeStatus
  }
  return JOB_STATUS_TO_VISIT_OUTCOME[job.status] ?? 'COMPLETED'
}

export function scheduleJobVisitOutcomeRequiresTimes(status: VisitPlanCalendarOutcomeStatus): boolean {
  return status === 'COMPLETED' || status === 'PARTIALLY_COMPLETED'
}

export function scheduleJobVisitOutcomeRequiresCarePlans(
  status: VisitPlanCalendarOutcomeStatus,
): boolean {
  return status === 'COMPLETED' || status === 'PARTIALLY_COMPLETED'
}

export function scheduleJobVisitOutcomeSaveLabel(status: VisitPlanCalendarOutcomeStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'Complete job'
    case 'STARTED':
      return 'Start visit'
    case 'PLANNED':
      return 'Save as planned'
    default:
      return 'Save visit'
  }
}
