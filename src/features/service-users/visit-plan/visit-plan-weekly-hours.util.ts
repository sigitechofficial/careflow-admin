import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { visitPlanSlotMatchesDay } from '@/features/service-users/visit-plan/visit-plan-schedule-match.util'
import { normalizeTimeForInput, visitDurationMinutes } from '@/features/service-users/visit-plan/visit-plan-time.util'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'

export function parseWeeklyContractedHours(value: string | null | undefined): number | null {
  if (value == null || String(value).trim() === '') return null
  const parsed = Number.parseFloat(String(value).trim())
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function visitPlanWeekStartIso(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return isoDate
  const dow = d.getUTCDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  d.setUTCDate(d.getUTCDate() + mondayOffset)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export function visitPlanSlotVisitDurationMinutes(
  slot: Pick<VisitPlanSlot, 'durationMinutes' | 'plannedStartTime' | 'plannedEndTime'>,
): number {
  if (typeof slot.durationMinutes === 'number' && slot.durationMinutes > 0) return slot.durationMinutes
  const mins = visitDurationMinutes(
    normalizeTimeForInput(slot.plannedStartTime),
    normalizeTimeForInput(slot.plannedEndTime),
  )
  return mins ?? 0
}

export function visitPlanSlotVisitsInWeek(
  slot: VisitPlanSlot,
  weekMondayIso: string,
  anchorIso: string,
): number {
  if (!slot.isEnabled) return 0
  const weekMonday = new Date(`${weekMondayIso}T12:00:00Z`)
  const anchor = new Date(`${anchorIso.slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(weekMonday.getTime()) || Number.isNaN(anchor.getTime())) return 0

  let count = 0
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(weekMonday)
    day.setUTCDate(day.getUTCDate() + i)
    if (visitPlanSlotMatchesDay(slot, day, anchor)) count += 1
  }
  return count
}

export function visitPlanWeeklyPlannedMinutes(
  slots: VisitPlanSlot[],
  options?: { weekStartIso?: string; anchorIso?: string },
): number {
  const weekStartIso = options?.weekStartIso ?? visitPlanWeekStartIso(operationalTodayIso())
  const anchorIso = options?.anchorIso?.slice(0, 10) ?? weekStartIso

  return slots.reduce((sum, slot) => {
    if (!slot.isEnabled) return sum
    const duration = visitPlanSlotVisitDurationMinutes(slot)
    const visits = visitPlanSlotVisitsInWeek(slot, weekStartIso, anchorIso)
    return sum + duration * visits
  }, 0)
}

export function formatVisitPlanWeeklyHours(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export type VisitPlanWeeklyHoursSummary = {
  contractedHours: number | null
  contractedMinutes: number | null
  plannedMinutes: number
  excessMinutes: number
  isOverContract: boolean
  isUnderContract: boolean
}

export function summarizeVisitPlanWeeklyHours(
  slots: VisitPlanSlot[],
  weeklyContractedHours: string | null | undefined,
  options?: { anchorIso?: string },
): VisitPlanWeeklyHoursSummary {
  const contractedHours = parseWeeklyContractedHours(weeklyContractedHours)
  const contractedMinutes = contractedHours != null ? Math.round(contractedHours * 60) : null
  const plannedMinutes = visitPlanWeeklyPlannedMinutes(slots, {
    anchorIso: options?.anchorIso,
  })
  const excessMinutes =
    contractedMinutes != null && plannedMinutes > contractedMinutes
      ? plannedMinutes - contractedMinutes
      : 0

  return {
    contractedHours,
    contractedMinutes,
    plannedMinutes,
    excessMinutes,
    isOverContract: excessMinutes > 0,
    isUnderContract:
      contractedMinutes != null && plannedMinutes < contractedMinutes && plannedMinutes > 0,
  }
}
