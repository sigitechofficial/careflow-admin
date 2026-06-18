import {
  carerAssignmentDisplayDurationMinutes,
  groupCarerAssignments,
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
    const next = replaceGroupDays(assignments, group, selectedDayValuesForGroup(null))
    expect(next).toHaveLength(1)
    expect(next[0]?.dayOfWeek).toBeNull()
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
})
