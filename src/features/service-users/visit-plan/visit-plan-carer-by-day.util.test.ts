import { describe, expect, it } from 'vitest'
import {
  ALL_WEEKDAYS_SELECT_VALUE,
  allWeekdaySelectValues,
  carerAssignmentDisplayDurationMinutes,
  formatCarerAssignmentDurationLabel,
  formatCarerAssignmentGroupDaysLabel,
  formatCarerAssignmentRoleLabel,
  formatCarerAssignmentTimeOverrideLabel,
  groupCarerAssignments,
  normalizeCarerByDaySelection,
  parseCarerAssignmentDurationInput,
  replaceGroupDays,
  selectedDayValuesForGroup,
} from '@/features/service-users/visit-plan/visit-plan-carer-by-day.util'
import type { VisitPlanSlotCarerAssignment } from '@/features/service-users/visit-plan/types'

function row(partial: Partial<VisitPlanSlotCarerAssignment>): VisitPlanSlotCarerAssignment {
  return {
    dayOfWeek: null,
    employeeId: 'emp-1',
    role: 'LEAD',
    durationMinutes: null,
    plannedStartTime: null,
    plannedEndTime: null,
    sortOrder: 0,
    ...partial,
  }
}

describe('visit-plan-carer-by-day.util', () => {
  it('groups rows with the same carer and different days', () => {
    const assignments = [
      row({ dayOfWeek: 1 }),
      row({ dayOfWeek: 3 }),
      row({ employeeId: 'emp-2', dayOfWeek: 1 }),
    ]
    const groups = groupCarerAssignments(assignments)
    expect(groups).toHaveLength(2)
    expect(groups[0]?.days).toEqual([1, 3])
    expect(groups[1]?.days).toEqual([1])
  })

  it('expands multi-day selection into one assignment per day', () => {
    const assignments = [row({ dayOfWeek: null })]
    const group = groupCarerAssignments(assignments)[0]!
    const next = replaceGroupDays(assignments, group, ['1', '3', '5'])
    expect(next).toHaveLength(3)
    expect(next.map((r) => r.dayOfWeek)).toEqual([1, 3, 5])
  })

  it('collapses all seven days to a single all-days row', () => {
    const assignments = [row({ dayOfWeek: 1 }), row({ dayOfWeek: 3 })]
    const group = groupCarerAssignments(assignments)[0]!
    const next = replaceGroupDays(
      assignments,
      group,
      ['0', '1', '2', '3', '4', '5', '6'],
    )
    expect(next).toHaveLength(1)
    expect(next[0]?.dayOfWeek).toBeNull()
  })

  it('uses the every-day option for all-weekday selection', () => {
    const assignments = [row({ dayOfWeek: 1 })]
    const group = groupCarerAssignments(assignments)[0]!
    expect(selectedDayValuesForGroup(null)).toEqual(allWeekdaySelectValues())
    const next = replaceGroupDays(assignments, group, allWeekdaySelectValues())
    expect(next).toHaveLength(1)
    expect(next[0]?.dayOfWeek).toBeNull()
  })

  it('normalizes every-day selection against individual weekdays', () => {
    expect(normalizeCarerByDaySelection([], [ALL_WEEKDAYS_SELECT_VALUE])).toEqual(
      allWeekdaySelectValues(),
    )
    expect(
      normalizeCarerByDaySelection(allWeekdaySelectValues(), [
        ...allWeekdaySelectValues(),
        ALL_WEEKDAYS_SELECT_VALUE,
      ]),
    ).toEqual([])
    expect(
      normalizeCarerByDaySelection(['1'], allWeekdaySelectValues()),
    ).toEqual(allWeekdaySelectValues())
  })

  it('keeps multi-day draft rows in one group (stable sortOrder key)', () => {
    const assignments = [row({ dayOfWeek: null, sortOrder: 0 })]
    const group = groupCarerAssignments(assignments)[0]!
    const next = replaceGroupDays(assignments, group, ['1', '3', '5'])
    const regrouped = groupCarerAssignments(next)
    expect(regrouped).toHaveLength(1)
    expect(regrouped[0]?.days).toEqual([1, 3, 5])
  })

  it('uses visit slot duration when carer duration is unset', () => {
    const slot = {
      durationMinutes: null,
      plannedStartTime: '07:00',
      plannedEndTime: '08:30',
    }
    expect(
      carerAssignmentDisplayDurationMinutes({ durationMinutes: null }, slot),
    ).toBe(90)
  })

  it('stores null when duration matches visit default', () => {
    expect(parseCarerAssignmentDurationInput('90', 90)).toBeNull()
    expect(parseCarerAssignmentDurationInput('60', 90)).toBe(60)
  })

  it('formats carer-by-day labels for the details panel', () => {
    expect(formatCarerAssignmentGroupDaysLabel(null)).toBe('Assigned for all slot days')
    expect(formatCarerAssignmentGroupDaysLabel([1, 3, 5])).toBe('Assigned Mon, Wed, Fri')
    expect(formatCarerAssignmentRoleLabel('LEAD')).toBe('Lead')
    expect(
      formatCarerAssignmentDurationLabel(
        { durationMinutes: null },
        { durationMinutes: null, plannedStartTime: '08:00', plannedEndTime: '09:30' },
      ),
    ).toBe('90 min (visit default)')
    expect(
      formatCarerAssignmentTimeOverrideLabel({
        plannedStartTime: '07:00',
        plannedEndTime: null,
      }),
    ).toBe('07:00 – —')
  })
})
