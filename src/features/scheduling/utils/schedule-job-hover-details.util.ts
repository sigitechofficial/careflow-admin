import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { timelineJobLinkedCarePlanIds } from '@/features/scheduling/utils/scheduling-visit-plan.util'
import {
  hasExplicitCarePlanLinks,
  resolveCarePlansForSlot,
} from '@/features/service-users/visit-plan/visit-plan-care-plan-links.util'
import { formatVisitPlanFrequency, formatWeekdays } from '@/features/service-users/visit-plan/visit-plan-format'
import { normalizeTimeForInput, visitDurationMinutes } from '@/features/service-users/visit-plan/visit-plan-time.util'
import { jobDurationMinutes } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { isoToLocalTimeInput } from '@/features/scheduling/utils/schedule-jobs-drag.util'

export type JobTimeRange = {
  start: string
  end: string
  durationMinutes: number
}

export function resolveVisitPlanSlotForJob(
  job: TimelineJob,
  slotsByServiceUser?: Map<string, VisitPlanSlot[]>,
): VisitPlanSlot | null {
  const slotId = job.visitPlan?.slotId ?? job.visits?.[0]?.visitPlanSlotId
  if (!slotId) return null
  const fromMap = slotsByServiceUser?.get(job.serviceUserId)?.find((slot) => slot.id === slotId)
  if (fromMap) return fromMap
  const ctx = job.visitPlan
  if (!ctx?.plannedStartTime || !ctx.plannedEndTime) return null
  return {
    slotCode: ctx.slotCode,
    label: ctx.label,
    daysOfWeek: ctx.daysOfWeek ?? [],
    plannedStartTime: ctx.plannedStartTime,
    plannedEndTime: ctx.plannedEndTime,
    requiredCarers: ctx.requiredCarers ?? job.requiredCarers,
    isEnabled: ctx.isEnabled ?? true,
    medicationRoundCode: ctx.medicationRoundCode ?? null,
    notes: '',
    sortOrder: 0,
    scheduleFrequency: (ctx.scheduleFrequency as VisitPlanSlot['scheduleFrequency']) ?? 'WEEKLY',
    repeatEvery: 1,
    repeatUnit: 'WEEKS',
    timeCritical: false,
    timeToleranceMinutes: 0,
    durationMinutes: ctx.durationMinutes ?? null,
    notesRequired: false,
    photoAllowed: false,
    shareOutcomeWithFamily: false,
    analysisArea: null,
    monthlyDayMode: 'BY_DATE',
    monthlyDaysOfMonth: [],
    monthlyPatternOrdinal: null,
    monthlyPatternWeekday: null,
    linkedCarePlanFormIds: ctx.linkedCarePlanFormIds,
    assignedEmployeeIds: [],
    slotKind: 'STANDARD',
    slotEffectiveFrom: null,
    slotEffectiveTo: null,
    oneOffDate: null,
    allowBackfillDays: 0,
    carerAssignments: [],
    exceptions: [],
    id: ctx.slotId,
  }
}

export function jobRotaTimeRange(job: TimelineJob): JobTimeRange {
  const start = isoToLocalTimeInput(job.scheduledStartDateTime)
  const durationMinutes = jobDurationMinutes(job)
  const end = job.scheduledEndDateTime
    ? isoToLocalTimeInput(job.scheduledEndDateTime)
    : isoToLocalTimeInput(
        new Date(
          new Date(job.scheduledStartDateTime).getTime() + durationMinutes * 60_000,
        ).toISOString(),
      )
  return { start, end, durationMinutes }
}

export function callPatternTimeRange(
  slot: Pick<VisitPlanSlot, 'plannedStartTime' | 'plannedEndTime' | 'durationMinutes'>,
): JobTimeRange {
  const start = normalizeTimeForInput(slot.plannedStartTime)
  const end = normalizeTimeForInput(slot.plannedEndTime)
  const durationMinutes =
    slot.durationMinutes ??
    visitDurationMinutes(start, end) ??
    60
  return { start, end, durationMinutes }
}

export function rotaTimingDiffersFromCallPattern(job: TimelineJob, slot: VisitPlanSlot): boolean {
  const rota = jobRotaTimeRange(job)
  const pattern = callPatternTimeRange(slot)
  return rota.start !== pattern.start || rota.end !== pattern.end
}

export function formatJobTimeRangeLabel(range: JobTimeRange): string {
  return `${range.start} – ${range.end}`
}

export function visitPlanScheduleSummary(slot: VisitPlanSlot): string {
  const frequency = formatVisitPlanFrequency(slot)
  const days =
    slot.scheduleFrequency === 'MONTHLY' ? null : formatWeekdays(slot)
  return [frequency, days].filter(Boolean).join(' · ')
}

export type JobHoverCarePlanSource = 'explicit' | 'suggested' | 'none'

export function carePlansForJobHover(
  job: TimelineJob,
  visitSlot: VisitPlanSlot | null,
  acceptedCarePlans: AcceptedCarePlanItem[],
): { plans: AcceptedCarePlanItem[]; source: JobHoverCarePlanSource } {
  if (visitSlot) {
    const plans = resolveCarePlansForSlot(visitSlot, acceptedCarePlans)
    return {
      plans,
      source: hasExplicitCarePlanLinks(visitSlot)
        ? 'explicit'
        : plans.length > 0
          ? 'suggested'
          : 'none',
    }
  }

  const linkedIds = timelineJobLinkedCarePlanIds(job)
  if (!linkedIds.length) return { plans: [], source: 'none' }

  const byId = new Map(acceptedCarePlans.map((plan) => [plan.formId, plan]))
  const plans = linkedIds
    .map((formId) => byId.get(formId))
    .filter((plan): plan is AcceptedCarePlanItem => Boolean(plan))
  return { plans, source: plans.length > 0 ? 'explicit' : 'none' }
}
