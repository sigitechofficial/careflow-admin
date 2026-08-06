import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { jobScheduleDateIso } from '@/features/scheduling/utils/schedule-jobs-drag.util'

export type ScheduleVisitContext = {
  scheduledJobId: string
  scheduledVisitId: string | undefined
  serviceUserId: string
  scheduleDate: string
  medicationRequired: boolean
}

export function resolveScheduledVisitId(job: TimelineJob): string | undefined {
  return job.visits?.[0]?.id ?? undefined
}

export function resolveJobMedicationRequired(job: TimelineJob): boolean {
  // Prefer persisted visit flag (set from actual scheduled meds for the round).
  const fromVisit = job.visits?.[0]?.medicationRequired
  if (typeof fromVisit === 'boolean') return fromVisit
  // Legacy fallback — round code alone is NOT proof of MAR.
  return false
}

export function buildScheduleVisitContext(job: TimelineJob, date?: string): ScheduleVisitContext {
  return {
    scheduledJobId: job.id,
    scheduledVisitId: resolveScheduledVisitId(job),
    serviceUserId: job.serviceUserId,
    scheduleDate: date ?? jobScheduleDateIso(job),
    medicationRequired: resolveJobMedicationRequired(job),
  }
}
