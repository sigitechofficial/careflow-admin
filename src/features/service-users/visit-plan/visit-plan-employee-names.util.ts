import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'

export function assignedEmployeeIdsFromSlots(slots: VisitPlanSlot[]): string[] {
  const ids = new Set<string>()
  for (const slot of slots) {
    for (const id of slot.assignedEmployeeIds ?? []) {
      if (id.trim()) ids.add(id)
    }
  }
  return [...ids]
}
