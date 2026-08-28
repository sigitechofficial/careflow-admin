import type { VisitPlanSlot, VisitPlanSlotCarerRole } from '@/features/service-users/visit-plan/types'

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

/**
 * The slot's default ("Visit Schedule") carers — global rows only (dayOfWeek == null),
 * falling back to the legacy assignedEmployeeIds. Day-specific advanced rows are excluded
 * so they never override the default carer shown/used for the whole visit.
 */
export function slotGlobalCarerIds(
  slot: Pick<VisitPlanSlot, 'carerAssignments' | 'assignedEmployeeIds'>,
): string[] {
  const globalIds = [...new Set(
    (slot.carerAssignments ?? [])
      .filter((a) => a.dayOfWeek == null)
      .map((a) => a.employeeId?.trim())
      .filter((id): id is string => Boolean(id)),
  )]
  if (globalIds.length) return globalIds
  return (slot.assignedEmployeeIds ?? []).filter((id) => id.trim())
}

/**
 * Lead / Secondary for a carer on this slot.
 * Prefers explicit carerAssignments.role; otherwise first assigned = Lead.
 */
export function slotCarerRoleForEmployee(
  slot: Pick<VisitPlanSlot, 'carerAssignments' | 'assignedEmployeeIds' | 'requiredCarers'>,
  employeeId: string,
): VisitPlanSlotCarerRole {
  const id = employeeId.trim()
  const assignment = (slot.carerAssignments ?? []).find((row) => row.employeeId?.trim() === id)
  if (assignment?.role === 'LEAD' || assignment?.role === 'SECONDARY') return assignment.role
  const ids = slotAssignedEmployeeIds(slot as VisitPlanSlot)
  const index = ids.indexOf(id)
  return index <= 0 ? 'LEAD' : 'SECONDARY'
}

/** On-screen role for 2+ carer slots: Lead, Secondary, or Support 1 / Support 2. */
export function formatSlotCarerDisplayRole(
  slot: Pick<VisitPlanSlot, 'carerAssignments' | 'assignedEmployeeIds' | 'requiredCarers'>,
  employeeId: string,
): string {
  const role = slotCarerRoleForEmployee(slot, employeeId)
  if (role === 'LEAD') return 'Lead'
  const ids = slotAssignedEmployeeIds(slot as VisitPlanSlot)
  const supportIds = ids.filter((id) => slotCarerRoleForEmployee(slot, id) === 'SECONDARY')
  const needNumbered = (slot.requiredCarers ?? 1) >= 3 || supportIds.length >= 2
  if (!needNumbered) return 'Secondary'
  const index = supportIds.indexOf(employeeId.trim())
  return index >= 0 ? `Support ${index + 1}` : 'Secondary'
}

export function formatRequiredCarersRoleHint(requiredCarers: number): string {
  const n = Math.max(1, requiredCarers)
  if (n <= 1) return ''
  if (n === 2) return 'Lead + Secondary'
  const supports = Array.from({ length: n - 1 }, (_, i) => `Support ${i + 1}`)
  return `Lead + ${supports.join(' + ')}`
}

/** Move employee to front so they become Lead when roles are derived from order. */
export function promoteEmployeeToLeadOrder(assignedEmployeeIds: string[], employeeId: string): string[] {
  const id = employeeId.trim()
  const rest = assignedEmployeeIds.filter((row) => row !== id)
  return [id, ...rest]
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
  maxNames = 4,
): string {
  // Visit Schedule overview shows the slot's default carers; day-specific rows show in the advanced panel.
  const ids = slotGlobalCarerIds(slot)
  if (!ids.length) return 'None'
  const showRoles = slot.requiredCarers > 1 || ids.length > 1
  const names = ids.map((id) => {
    const name = nameById.get(id) ?? 'Unknown'
    if (!showRoles) return name
    return `${name} (${formatSlotCarerDisplayRole(slot, id)})`
  })
  if (names.length <= maxNames) return names.join(', ')
  return `${names.slice(0, maxNames).join(', ')} +${names.length - maxNames}`
}

/** Strip empty rows and keep assignedEmployeeIds (the default carers) in sync for API save. */
export function normalizeSlotCarerFields(slot: VisitPlanSlot): Pick<
  VisitPlanSlot,
  'assignedEmployeeIds' | 'carerAssignments'
> {
  const carerAssignments = (slot.carerAssignments ?? [])
    .filter((a) => a.employeeId?.trim())
    .map(({ id: _id, ...assignment }) => assignment)
  // assignedEmployeeIds is the slot default (all-days) carer set only — day-specific advanced
  // rows must not leak in, otherwise they become the fallback carer for every other day.
  const globalIds = [...new Set(
    carerAssignments.filter((a) => a.dayOfWeek == null).map((a) => a.employeeId),
  )]
  const assignedEmployeeIds =
    globalIds.length > 0
      ? globalIds
      : (slot.assignedEmployeeIds ?? []).filter((id) => id.trim())
  return { assignedEmployeeIds, carerAssignments }
}
