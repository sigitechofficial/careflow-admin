import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { jobDurationMinutes } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { visitPlanSlotMatchesDay } from '@/features/service-users/visit-plan/visit-plan-schedule-match.util'
import { normalizeTimeForInput } from '@/features/service-users/visit-plan/visit-plan-time.util'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import {
  visitPlanSlotVisitDurationMinutes,
  visitPlanWeekStartIso,
} from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'

export function scheduleWeekStartIso(isoDate: string): string {
  return visitPlanWeekStartIso(isoDate)
}

/** Job ids that fall beyond a service user's weekly contracted hours (chronological week order). */
export function excessWeeklyContractedJobIds(
  jobs: TimelineJob[],
  contractedHoursByServiceUserId: Map<string, number>,
): Set<string> {
  const excess = new Set<string>()
  const byServiceUser = new Map<string, TimelineJob[]>()

  for (const job of jobs) {
    const list = byServiceUser.get(job.serviceUserId) ?? []
    list.push(job)
    byServiceUser.set(job.serviceUserId, list)
  }

  for (const [serviceUserId, serviceUserJobs] of byServiceUser) {
    const contractedHours = contractedHoursByServiceUserId.get(serviceUserId)
    if (contractedHours == null || contractedHours <= 0) continue

    const contractedMinutes = Math.round(contractedHours * 60)
    const sorted = [...serviceUserJobs].sort(
      (a, b) =>
        new Date(a.scheduledStartDateTime).getTime() - new Date(b.scheduledStartDateTime).getTime(),
    )

    let accumulated = 0
    for (const job of sorted) {
      const minutes = jobDurationMinutes(job)
      if (accumulated >= contractedMinutes) {
        excess.add(job.id)
      } else if (accumulated + minutes > contractedMinutes) {
        excess.add(job.id)
        accumulated += minutes
      } else {
        accumulated += minutes
      }
    }
  }

  return excess
}

export function weeklyBookedMinutesByServiceUser(jobs: TimelineJob[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const job of jobs) {
    totals.set(job.serviceUserId, (totals.get(job.serviceUserId) ?? 0) + jobDurationMinutes(job))
  }
  return totals
}

export type WeeklyContractSummary = {
  contractedMinutes: number
  bookedVisitMinutes: number
  excessVisitMinutes: number
}

/** Visit hours booked this week vs weekly contracted hours from visit plans. */
export function summarizeWeeklyContractUsage(
  jobs: TimelineJob[],
  contractedHoursByServiceUserId: Map<string, number>,
): WeeklyContractSummary {
  const bookedByServiceUser = weeklyBookedMinutesByServiceUser(jobs)
  let contractedMinutes = 0
  let bookedVisitMinutes = 0
  let excessVisitMinutes = 0

  for (const [serviceUserId, booked] of bookedByServiceUser) {
    bookedVisitMinutes += booked
    const contractedHours = contractedHoursByServiceUserId.get(serviceUserId)
    if (contractedHours == null || contractedHours <= 0) continue

    const cap = Math.round(contractedHours * 60)
    contractedMinutes += cap
    excessVisitMinutes += Math.max(0, booked - cap)
  }

  return { contractedMinutes, bookedVisitMinutes, excessVisitMinutes }
}

type VisitPlanWeekOccurrence = {
  key: string
  sortMs: number
  durationMinutes: number
}

function visitPlanSlotStartMinutes(
  slot: Pick<VisitPlanSlot, 'plannedStartTime'>,
): number {
  const normalized = normalizeTimeForInput(slot.plannedStartTime)
  if (!normalized) return 0
  const [hoursPart, minutesPart] = normalized.split(':')
  const hours = Number.parseInt(hoursPart ?? '', 10)
  const minutes = Number.parseInt(minutesPart ?? '', 10)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0
  return hours * 60 + minutes
}

function buildVisitPlanWeekOccurrences(
  slots: VisitPlanSlot[],
  weekMondayIso: string,
  anchorIso: string,
): VisitPlanWeekOccurrence[] {
  const weekMonday = new Date(`${weekMondayIso}T12:00:00Z`)
  const anchor = new Date(`${anchorIso.slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(weekMonday.getTime()) || Number.isNaN(anchor.getTime())) return []

  const occurrences: VisitPlanWeekOccurrence[] = []
  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const day = new Date(weekMonday)
    day.setUTCDate(day.getUTCDate() + dayOffset)
    const dateIso = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}-${String(day.getUTCDate()).padStart(2, '0')}`

    for (const slot of slots) {
      if (!slot.isEnabled || !visitPlanSlotMatchesDay(slot, day, anchor)) continue
      const startMinutes = visitPlanSlotStartMinutes(slot)
      occurrences.push({
        key: `${dateIso}:${slot.id}`,
        sortMs: day.getTime() + startMinutes * 60_000,
        durationMinutes: visitPlanSlotVisitDurationMinutes(slot),
      })
    }
  }

  return occurrences.sort((a, b) => a.sortMs - b.sortMs)
}

/** Occurrence keys (date:slotId) that fall past weekly contracted hours in call-pattern order. */
export function excessVisitPlanOccurrenceKeys(
  slots: VisitPlanSlot[],
  contractedHours: number,
  weekMondayIso: string,
  anchorIso: string,
): Set<string> {
  const excess = new Set<string>()
  if (contractedHours <= 0) return excess

  const contractedMinutes = Math.round(contractedHours * 60)
  let accumulated = 0

  for (const occurrence of buildVisitPlanWeekOccurrences(slots, weekMondayIso, anchorIso)) {
    if (accumulated >= contractedMinutes) {
      excess.add(occurrence.key)
      continue
    }
    if (accumulated + occurrence.durationMinutes > contractedMinutes) {
      excess.add(occurrence.key)
      accumulated += occurrence.durationMinutes
    } else {
      accumulated += occurrence.durationMinutes
    }
  }

  return excess
}

function jobVisitPlanOccurrenceKey(job: TimelineJob): string | null {
  const slotId = job.visitPlan?.slotId ?? job.visits?.[0]?.visitPlanSlotId
  if (!slotId) return null
  const dateIso = job.scheduledStartDateTime.slice(0, 10)
  return `${dateIso}:${slotId}`
}

export function excessJobIdsFromVisitPlanCallPattern(
  jobs: TimelineJob[],
  slots: VisitPlanSlot[],
  contractedHours: number,
  weekMondayIso: string,
  anchorIso: string,
): Set<string> {
  const excessKeys = excessVisitPlanOccurrenceKeys(slots, contractedHours, weekMondayIso, anchorIso)
  const flagged = new Set<string>()
  for (const job of jobs) {
    const key = jobVisitPlanOccurrenceKey(job)
    if (key && excessKeys.has(key)) flagged.add(job.id)
  }
  return flagged
}

/** Union rota chronological excess and visit-plan call-pattern slot matching. */
export function mergedExcessWeeklyContractedJobIds(
  weekJobs: TimelineJob[],
  contractedHoursByServiceUserId: Map<string, number>,
  slotsByServiceUserId: Map<string, VisitPlanSlot[]>,
  weekMondayIso: string,
  anchorIso: string,
): Set<string> {
  const merged = excessWeeklyContractedJobIds(weekJobs, contractedHoursByServiceUserId)

  for (const [serviceUserId, slots] of slotsByServiceUserId) {
    const contractedHours = contractedHoursByServiceUserId.get(serviceUserId)
    if (contractedHours == null || contractedHours <= 0 || slots.length === 0) continue
    const serviceUserJobs = weekJobs.filter((job) => job.serviceUserId === serviceUserId)
    for (const jobId of excessJobIdsFromVisitPlanCallPattern(
      serviceUserJobs,
      slots,
      contractedHours,
      weekMondayIso,
      anchorIso,
    )) {
      merged.add(jobId)
    }
  }

  return merged
}
