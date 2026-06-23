import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'

/** Resolved carer IDs for one slot (carerAssignments take precedence over legacy list). */
export function slotAssignedEmployeeIds(slot: VisitPlanSlot): string[] {
  const fromAssignments = [...new Set(
    (slot.carerAssignments ?? [])
      .map((a) => a.employeeId?.trim())
      .filter((id): id is string => Boolean(id)),
  )]
  if (fromAssignments.length) return fromAssignments
  return (slot.assignedEmployeeIds ?? []).filter((id) => id.trim())
}

export function assignedEmployeeIdsFromSlots(slots: VisitPlanSlot[]): string[] {
  const ids = new Set<string>()
  for (const slot of slots) {
    for (const id of slotAssignedEmployeeIds(slot)) {
      ids.add(id)
    }
  }
  return [...ids]
}

export function formatSlotAssignedCarersSummary(
  slot: VisitPlanSlot,
  nameById: Map<string, string>,
  maxNames = 2,
): string {
  const ids = slotAssignedEmployeeIds(slot)
  if (!ids.length) return 'None'
  const names = ids.map((id) => nameById.get(id) ?? 'Unknown')
  if (names.length <= maxNames) return names.join(', ')
  return `${names.slice(0, maxNames).join(', ')} +${names.length - maxNames}`
}

/** Strip empty rows and keep assignedEmployeeIds in sync for API save. */
export function normalizeSlotCarerFields(slot: VisitPlanSlot): Pick<
  VisitPlanSlot,
  'assignedEmployeeIds' | 'carerAssignments'
> {
  const carerAssignments = (slot.carerAssignments ?? [])
    .filter((a) => a.employeeId?.trim())
    .map(({ id: _id, ...assignment }) => assignment)
  const assignedEmployeeIds =
    carerAssignments.length > 0
      ? [...new Set(carerAssignments.map((a) => a.employeeId))]
      : (slot.assignedEmployeeIds ?? []).filter((id) => id.trim())
  return { assignedEmployeeIds, carerAssignments }
}
