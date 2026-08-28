import type { VisitPlanSlot, VisitPlanSlotCarerAssignment } from '@/features/service-users/visit-plan/types'
import { VISIT_PLAN_DAY_LABELS } from '@/features/service-users/visit-plan/types'
import { visitPlanSlotVisitDurationMinutes } from '@/features/service-users/visit-plan/visit-plan-weekly-hours.util'

/** A single carer within a day-group row (one employee + their role/time overrides). */
export type CarerAssignmentGroupCarer = {
  carerKey: string
  employeeId: string
  role: VisitPlanSlotCarerAssignment['role']
  requiredCarers?: number | null
  durationMinutes: number | null
  plannedStartTime: string | null
  plannedEndTime: string | null
  sortOrder: number
  sourceIndices: number[]
}

export type CarerAssignmentGroup = {
  groupId: string
  /** First carer — kept for read-only summaries that show a single carer. */
  template: VisitPlanSlotCarerAssignment
  /** All carers assigned to this day-group. */
  carers: CarerAssignmentGroupCarer[]
  sourceIndices: number[]
  /** `null` = applies every day the slot runs */
  days: number[] | null
  /** Explicit per-row carers required (`null` = use the slot default). */
  requiredCarers: number | null
}

/** Identifies one carer (collapses that carer's own per-day rows into a single entry). */
function carerEntryKey(a: VisitPlanSlotCarerAssignment): string {
  return [
    a.employeeId || `draft:sort${a.sortOrder}`,
    a.role,
    a.requiredCarers ?? '',
    a.durationMinutes ?? '',
    a.plannedStartTime ?? '',
    a.plannedEndTime ?? '',
  ].join('|')
}

/** Canonical signature for a day-set so carers on the same days share one row. */
function daysSignature(days: number[] | null): string {
  if (days == null || days.length === 0 || days.length >= 7) return 'all'
  return [...days].sort((a, b) => a - b).join(',')
}

function carerToTemplate(carer: CarerAssignmentGroupCarer): VisitPlanSlotCarerAssignment {
  return {
    dayOfWeek: null,
    employeeId: carer.employeeId,
    role: carer.role,
    requiredCarers: carer.requiredCarers ?? null,
    durationMinutes: carer.durationMinutes,
    plannedStartTime: carer.plannedStartTime,
    plannedEndTime: carer.plannedEndTime,
    sortOrder: carer.sortOrder,
  }
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
  // Pass 1 — collapse each carer's own per-day rows into a single entry with a day-set.
  const carerMap = new Map<
    string,
    { template: VisitPlanSlotCarerAssignment; sourceIndices: number[]; days: Set<number>; allDays: boolean }
  >()

  assignments.forEach((row, index) => {
    const key = carerEntryKey(row)
    const existing = carerMap.get(key)
    if (!existing) {
      carerMap.set(key, {
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

  const carerEntries = [...carerMap.entries()].map(([carerKey, c]) => ({
    carerKey,
    template: c.template,
    sourceIndices: c.sourceIndices,
    days: c.allDays ? null : [...c.days].sort((a, b) => a - b),
  }))

  // Pass 2 — merge carers that share a day-set into one row. Rows with no carer yet
  // (empty employee) stay separate so "Add carer row" always yields a fresh row.
  const rowMap = new Map<
    string,
    { days: number[] | null; carers: CarerAssignmentGroupCarer[]; sourceIndices: number[]; order: number }
  >()

  carerEntries.forEach((entry, order) => {
    const hasEmployee = Boolean(entry.template.employeeId?.trim())
    const rowKey = hasEmployee ? `days:${daysSignature(entry.days)}` : `empty:${entry.carerKey}`
    const carer: CarerAssignmentGroupCarer = {
      carerKey: entry.carerKey,
      employeeId: entry.template.employeeId,
      role: entry.template.role,
      requiredCarers: entry.template.requiredCarers ?? null,
      durationMinutes: entry.template.durationMinutes,
      plannedStartTime: entry.template.plannedStartTime,
      plannedEndTime: entry.template.plannedEndTime,
      sortOrder: entry.template.sortOrder,
      sourceIndices: entry.sourceIndices,
    }
    const existing = rowMap.get(rowKey)
    if (!existing) {
      rowMap.set(rowKey, {
        days: entry.days,
        carers: [carer],
        sourceIndices: [...entry.sourceIndices],
        order,
      })
      return
    }
    existing.carers.push(carer)
    existing.sourceIndices.push(...entry.sourceIndices)
  })

  return [...rowMap.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([groupId, r]) => {
      const carers = [...r.carers].sort((a, b) => a.sortOrder - b.sortOrder)
      const explicit = carers
        .map((c) => c.requiredCarers)
        .filter((n): n is number => typeof n === 'number' && n > 0)
      return {
        groupId,
        template: carerToTemplate(carers[0]!),
        carers,
        sourceIndices: r.sourceIndices,
        days: r.days,
        requiredCarers: explicit.length ? Math.max(...explicit) : null,
      }
    })
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

/** Rebuild every carer in the row across the newly selected day-set. */
export function replaceGroupDays(
  assignments: VisitPlanSlotCarerAssignment[],
  group: CarerAssignmentGroup,
  selectedDayValues: string[],
): VisitPlanSlotCarerAssignment[] {
  const remaining = assignments.filter((_, i) => !group.sourceIndices.includes(i))
  const dayNums = [...new Set(weekdayValuesOnly(selectedDayValues).map(Number))].sort((a, b) => a - b)
  const templates = group.carers.map(carerToTemplate)
  const allDays = dayNums.length === 0 || dayNums.length === 7

  const additions = templates.flatMap((template): VisitPlanSlotCarerAssignment[] =>
    allDays
      ? [{ ...template, dayOfWeek: null }]
      : dayNums.map((dayOfWeek) => ({ ...template, dayOfWeek })),
  )

  return [...remaining, ...additions]
}

/** Patch a row-level field (e.g. requiredCarers) across every carer in the row. */
export function replaceGroupField(
  assignments: VisitPlanSlotCarerAssignment[],
  group: CarerAssignmentGroup,
  patch: Partial<VisitPlanSlotCarerAssignment>,
): VisitPlanSlotCarerAssignment[] {
  return assignments.map((row, index) =>
    group.sourceIndices.includes(index) ? { ...row, ...patch } : row,
  )
}

/** Patch a single carer's fields (role, duration, time overrides) within a row. */
export function replaceCarerField(
  assignments: VisitPlanSlotCarerAssignment[],
  carer: CarerAssignmentGroupCarer,
  patch: Partial<VisitPlanSlotCarerAssignment>,
): VisitPlanSlotCarerAssignment[] {
  return assignments.map((row, index) =>
    carer.sourceIndices.includes(index) ? { ...row, ...patch } : row,
  )
}

/** Remove one carer from a row, keeping the other carers on the same days. */
export function removeCarer(
  assignments: VisitPlanSlotCarerAssignment[],
  carer: CarerAssignmentGroupCarer,
): VisitPlanSlotCarerAssignment[] {
  return assignments.filter((_, i) => !carer.sourceIndices.includes(i))
}

/** Replace a row's carer set with the given employees, preserving each carer's overrides. */
export function assignCarersToGroup(
  assignments: VisitPlanSlotCarerAssignment[],
  group: CarerAssignmentGroup,
  employeeIds: string[],
): VisitPlanSlotCarerAssignment[] {
  const remaining = assignments.filter((_, i) => !group.sourceIndices.includes(i))
  const dayList: (number | null)[] = group.days == null ? [null] : group.days
  // Keep at least as many required carers as we're naming so the rota does not slice any off.
  const rowRequired = group.requiredCarers ?? Math.max(1, employeeIds.length)

  const additions = employeeIds.flatMap((employeeId, index) => {
    const existing = group.carers.find((c) => c.employeeId === employeeId)
    const base: Omit<VisitPlanSlotCarerAssignment, 'dayOfWeek'> = {
      employeeId,
      role: index === 0 ? 'LEAD' : 'SECONDARY',
      requiredCarers: rowRequired,
      durationMinutes: existing?.durationMinutes ?? null,
      plannedStartTime: existing?.plannedStartTime ?? null,
      plannedEndTime: existing?.plannedEndTime ?? null,
      sortOrder: index,
    }
    return dayList.map((dayOfWeek) => ({ ...base, dayOfWeek }))
  })

  return [...remaining, ...additions]
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
  if (assignment.durationMinutes == null) return `${minutes} min`
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
  const assignedEmployeeIds = group.carers
    .map((carer) => carer.employeeId?.trim())
    .filter((id): id is string => Boolean(id))
  return {
    ...slot,
    // Let the dialog select up to this row's carer count (defaults to the slot count).
    requiredCarers: Math.max(1, group.requiredCarers ?? slot.requiredCarers),
    daysOfWeek: group.days ?? slot.daysOfWeek,
    // Check carer working-hours against this row's own visit window when it overrides the slot,
    // so the "Visit vs working hours" availability reflects the times these carers actually work.
    plannedStartTime: group.template.plannedStartTime?.trim() || slot.plannedStartTime,
    plannedEndTime: group.template.plannedEndTime?.trim() || slot.plannedEndTime,
    assignedEmployeeIds,
    carerAssignments: [],
  }
}
