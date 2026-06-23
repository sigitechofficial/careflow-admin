import { slotAssignedEmployeeIds } from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
import { slotHasCarerByDayAssignments } from '@/features/service-users/visit-plan/visit-plan-carer-by-day.util'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'

export function slotHasAssignedCarers(slot: VisitPlanSlot): boolean {
  return slotHasCarerByDayAssignments(slot) || slotAssignedEmployeeIds(slot).length > 0
}
