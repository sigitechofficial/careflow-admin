import type { VisitPlanSlot, VisitPlanSlotCarerAssignment } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import { visitPlanSlotVisitDurationMinutes } from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'

export type CarerAssignmentGroup = {
  groupId: string
  template: VisitPlanSlotCarerAssignment
  sourceIndices: number[]
  /** `null` = applies every day the slot runs */
  days: number[] | null
}

function assignmentGroupKey(a: VisitPlanSlotCarerAssignment, index: number): string {
  if (!a.employeeId) return `draft:${index}`
  return [
    a.employeeId,
    a.role,
    a.durationMinutes ?? '',
    a.plannedStartTime ?? '',
    a.plannedEndTime ?? '',
  ].join('|')
}

export function groupCarerAssignments(assignments: VisitPlanSlotCarerAssignment[]): CarerAssignmentGroup[] {
  const map = new Map<
    string,
    { template: VisitPlanSlotCarerAssignment; sourceIndices: number[]; days: Set<number>; allDays: boolean }
  >()

  assignments.forEach((row, index) => {
    const key = assignmentGroupKey(row, index)
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        template: row,
        sourceIndices: [index],
        days: row.dayOfWeek == null ? new Set() : new Set([row.dayOfWeek]),
        allDays: row.dayOfWeek == null,
      })
      return
    }
    existing.sourceIndices.push(index)
    if (row.dayOfWeek == null) {
      existing.allDays = true
    } else {
      existing.days.add(row.dayOfWeek)
    }
  })

  return [...map.entries()].map(([groupId, g]) => ({
    groupId,
    template: g.template,
    sourceIndices: g.sourceIndices,
    days: g.allDays ? null : [...g.days].sort((a, b) => a - b),
  }))
}

export function selectedDayValuesForGroup(days: number[] | null): string[] {
  if (days == null) return ['0', '1', '2', '3', '4', '5', '6']
  return days.map(String)
}

export function replaceGroupDays(
  assignments: VisitPlanSlotCarerAssignment[],
  group: CarerAssignmentGroup,
  selectedDayValues: string[],
): VisitPlanSlotCarerAssignment[] {
  const remaining = assignments.filter((_, i) => !group.sourceIndices.includes(i))
  const template = group.template
  const dayNums = [...new Set(selectedDayValues.map(Number))].sort((a, b) => a - b)

  if (dayNums.length === 0 || dayNums.length === 7) {
    return [...remaining, { ...template, dayOfWeek: null }]
  }

  return [
    ...remaining,
    ...dayNums.map((dayOfWeek) => ({
      ...template,
      dayOfWeek,
    })),
  ]
}

export function replaceGroupField(
  assignments: VisitPlanSlotCarerAssignment[],
  group: CarerAssignmentGroup,
  patch: Partial<VisitPlanSlotCarerAssignment>,
): VisitPlanSlotCarerAssignment[] {
  return assignments.map((row, index) =>
    group.sourceIndices.includes(index) ? { ...row, ...patch } : row,
  )
}

export function removeGroup(
  assignments: VisitPlanSlotCarerAssignment[],
  group: CarerAssignmentGroup,
): VisitPlanSlotCarerAssignment[] {
  return assignments.filter((_, i) => !group.sourceIndices.includes(i))
}

export function slotDefaultDurationMinutes(
  slot: Pick<VisitPlanSlot, 'durationMinutes' | 'plannedStartTime' | 'plannedEndTime'>,
): number {
  return visitPlanSlotVisitDurationMinutes(slot)
}

export function carerAssignmentDisplayDurationMinutes(
  assignment: Pick<VisitPlanSlotCarerAssignment, 'durationMinutes'>,
  slot: Pick<VisitPlanSlot, 'durationMinutes' | 'plannedStartTime' | 'plannedEndTime'>,
): number | null {
  if (assignment.durationMinutes != null && assignment.durationMinutes > 0) {
    return assignment.durationMinutes
  }
  const slotDefault = slotDefaultDurationMinutes(slot)
  return slotDefault > 0 ? slotDefault : null
}

/** `null` = use visit plan duration (same as clearing an override). */
export function parseCarerAssignmentDurationInput(
  raw: string,
  slotDefault: number,
): number | null {
  if (!raw.trim()) return null
  const num = Number(raw)
  if (!Number.isFinite(num) || num <= 0) return null
  if (slotDefault > 0 && num === slotDefault) return null
  return num
}

export function formatCarerAssignmentGroupDaysLabel(days: number[] | null): string {
  if (days == null) return 'every day this visit runs'
  if (days.length === 0) return 'selected days'
  return days.map((day) => VISIT_PLAN_DAY_LABELS[day]).join(', ')
}

export function buildCarerByDayAssignSlot(
  slot: VisitPlanSlot,
  group: CarerAssignmentGroup,
): VisitPlanSlot {
  return {
    ...slot,
    requiredCarers: 1,
    daysOfWeek: group.days ?? slot.daysOfWeek,
    assignedEmployeeIds: group.template.employeeId ? [group.template.employeeId] : [],
    carerAssignments: [],
  }
}
