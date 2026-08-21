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

export function formatVisitPlanNightDuty(nightDuty: VisitPlanNightDuty | null | undefined): string {
  if (nightDuty === 'SLEEPING_NIGHT') return 'Sleeping night'
  if (nightDuty === 'WAKING_NIGHT') return 'Waking night'
  return 'None'
}
