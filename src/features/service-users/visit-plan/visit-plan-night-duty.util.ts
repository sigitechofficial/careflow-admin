import type { VisitPlanNightDuty, VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { visitDurationMinutes } from '@/features/service-users/visit-plan/visit-plan-time.util'

/** Default sleeping / waking night window when the current times are still same-day. */
export const DEFAULT_OVERNIGHT_START = '22:00'
export const DEFAULT_OVERNIGHT_END = '07:00'

export function defaultOvernightTimePatch(
  slot: Pick<VisitPlanSlot, 'plannedStartTime' | 'plannedEndTime'>,
): Partial<VisitPlanSlot> {
  if (slotTimesCrossMidnight(slot.plannedStartTime, slot.plannedEndTime)) return {}
  return {
    plannedStartTime: DEFAULT_OVERNIGHT_START,
    plannedEndTime: DEFAULT_OVERNIGHT_END,
    durationMinutes: visitDurationMinutes(DEFAULT_OVERNIGHT_START, DEFAULT_OVERNIGHT_END),
  }
}

export function slotTimesCrossMidnight(start: string | null | undefined, end: string | null | undefined): boolean {
  const startHm = start?.trim() ?? ''
  const endHm = end?.trim() ?? ''
  if (!startHm || !endHm) return false
  return endHm <= startHm
}

export function slotAllowsNightDuty(
  slot: Pick<VisitPlanSlot, 'slotKind' | 'plannedStartTime' | 'plannedEndTime'>,
): boolean {
  if (slot.slotKind === 'OVERNIGHT') return true
  return slotTimesCrossMidnight(slot.plannedStartTime, slot.plannedEndTime)
}

export function resolveVisitPlanNightDuty(
  slot: Pick<VisitPlanSlot, 'slotKind' | 'plannedStartTime' | 'plannedEndTime'> & {
    nightDuty?: VisitPlanNightDuty | null
  },
): VisitPlanNightDuty {
  if (!slotAllowsNightDuty(slot)) return 'NONE'
  if (slot.nightDuty === 'SLEEPING_NIGHT' || slot.nightDuty === 'WAKING_NIGHT') return slot.nightDuty
  return 'NONE'
}

/** Choices for a visit that runs past midnight; a new one starts as a normal visit. */
export const VISIT_PLAN_NIGHT_TYPE_OPTIONS: { value: VisitPlanNightDuty; label: string; hint: string }[] = [
  { value: 'NONE', label: 'Normal visit', hint: 'An ordinary visit that runs past midnight. Normal visit rates apply.' },
  { value: 'WAKING_NIGHT', label: 'Waking night', hint: 'The carer stays awake. Paid and charged per hour at the waking night rate.' },
  { value: 'SLEEPING_NIGHT', label: 'Sleeping night', hint: 'The carer may sleep. Paid and charged at the fixed sleep-in rate.' },
]

export function formatVisitPlanNightDuty(
  nightDuty: VisitPlanNightDuty | null | undefined,
  noneLabel = 'None',
): string {
  if (nightDuty === 'SLEEPING_NIGHT') return 'Sleeping night'
  if (nightDuty === 'WAKING_NIGHT') return 'Waking night'
  return noneLabel
}
