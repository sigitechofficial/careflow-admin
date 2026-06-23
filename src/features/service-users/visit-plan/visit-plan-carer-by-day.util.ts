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

function assignmentGroupKey(a: VisitPlanSlotCarerAssignment): string {
  return [
    a.employeeId || `draft:sort${a.sortOrder}`,
    a.role,
    a.durationMinutes ?? '',
    a.plannedStartTime ?? '',
    a.plannedEndTime ?? '',
  ].join('|')
}

export const ALL_WEEKDAYS_SELECT_VALUE = 'all'

export const ALL_WEEKDAYS_SELECT_LABEL = 'Every day (all weekdays)'

const WEEKDAY_VALUES = VISIT_PLAN_DAY_LABELS.map((_, dayOfWeek) => String(dayOfWeek))

export function allWeekdaySelectValues(): string[] {
  return [...WEEKDAY_VALUES]
}

function weekdayValuesOnly(values: string[]): string[] {
  return values.filter((value) => value !== ALL_WEEKDAYS_SELECT_VALUE)
}

export function isAllWeekdaysSelected(values: string[]): boolean {
  return weekdayValuesOnly(values).length === WEEKDAY_VALUES.length
}

export function groupCarerAssignments(assignments: VisitPlanSlotCarerAssignment[]): CarerAssignmentGroup[] {
  const map = new Map<
    string,
    { template: VisitPlanSlotCarerAssignment; sourceIndices: number[]; days: Set<number>; allDays: boolean }
  >()

  assignments.forEach((row, index) => {
    const key = assignmentGroupKey(row)
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
  if (days == null) return allWeekdaySelectValues()
  return days.map(String)
}

/** "Every day" selects all weekday checkboxes; toggling it off clears every day. */
export function normalizeCarerByDaySelection(prev: string[], next: string[]): string[] {
  const prevDays = weekdayValuesOnly(prev)
  const prevAll = prevDays.length === WEEKDAY_VALUES.length
  const nextDays = weekdayValuesOnly(next)

  if (next.includes(ALL_WEEKDAYS_SELECT_VALUE)) {
    return prevAll ? [] : allWeekdaySelectValues()
  }

  if (nextDays.length === WEEKDAY_VALUES.length) return allWeekdaySelectValues()
  return nextDays
}

export function replaceGroupDays(
  assignments: VisitPlanSlotCarerAssignment[],
  group: CarerAssignmentGroup,
  selectedDayValues: string[],
): VisitPlanSlotCarerAssignment[] {
  const remaining = assignments.filter((_, i) => !group.sourceIndices.includes(i))
  const template = group.template
  const dayNums = [...new Set(weekdayValuesOnly(selectedDayValues).map(Number))].sort((a, b) => a - b)

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
  if (days == null) return 'Assigned for all slot days'
  if (days.length === 0) return 'Assigned days not set'
  return `Assigned ${days.map((day) => VISIT_PLAN_DAY_LABELS[day]).join(', ')}`
}

export function formatCarerAssignmentRoleLabel(role: VisitPlanSlotCarerAssignment['role']): string {
  return role === 'LEAD' ? 'Lead' : 'Secondary'
}

export function formatCarerAssignmentDurationLabel(
  assignment: Pick<VisitPlanSlotCarerAssignment, 'durationMinutes'>,
  slot: Pick<VisitPlanSlot, 'durationMinutes' | 'plannedStartTime' | 'plannedEndTime'>,
): string {
  const minutes = carerAssignmentDisplayDurationMinutes(assignment, slot)
  if (minutes == null) return 'Not set'
  if (assignment.durationMinutes == null) return `${minutes} min (visit default)`
  return `${minutes} min`
}

export function formatCarerAssignmentTimeOverrideLabel(
  assignment: Pick<VisitPlanSlotCarerAssignment, 'plannedStartTime' | 'plannedEndTime'>,
): string | null {
  if (assignment.plannedStartTime == null && assignment.plannedEndTime == null) return null
  const start = assignment.plannedStartTime ?? '—'
  const end = assignment.plannedEndTime ?? '—'
  return `${start} – ${end}`
}

export function slotHasCarerByDayAssignments(slot: Pick<VisitPlanSlot, 'carerAssignments'>): boolean {
  return (slot.carerAssignments ?? []).length > 0
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
