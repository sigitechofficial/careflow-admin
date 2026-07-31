import {
  allocationTimingWithinVisit,
  isInheritedHmTiming,
  propagateVisitWindowToInheritedDrafts,
} from './allocation-carer-timing.util'

describe('allocation-carer-timing.util', () => {
  it('validates assignment within visit window', () => {
    expect(
      allocationTimingWithinVisit({
        assignmentStartHm: '10:00',
        assignmentEndHm: '11:30',
        visitStartHm: '10:00',
        visitEndHm: '12:00',
      }),
    ).toBeNull()
    expect(
      allocationTimingWithinVisit({
        assignmentStartHm: '09:00',
        assignmentEndHm: '11:00',
        visitStartHm: '10:00',
        visitEndHm: '12:00',
      }),
    ).toMatch(/within the visit window/)
    expect(
      allocationTimingWithinVisit({
        assignmentStartHm: '10:00',
        assignmentEndHm: '10:00',
        visitStartHm: '10:00',
        visitEndHm: '12:00',
      }),
    ).toMatch(/later than start/)
  })

  it('propagates visit window only to inherited drafts', () => {
    const next = propagateVisitWindowToInheritedDrafts({
      drafts: [
        { allocationId: 'a1', employeeId: 'e1', startHm: '10:00', endHm: '12:00' },
        { allocationId: 'a2', employeeId: 'e2', startHm: '11:00', endHm: '12:00' },
      ],
      previousStartHm: '10:00',
      previousEndHm: '12:00',
      nextStartHm: '09:30',
      nextEndHm: '12:30',
    })
    expect(next[0]).toEqual({
      allocationId: 'a1',
      employeeId: 'e1',
      startHm: '09:30',
      endHm: '12:30',
    })
    expect(next[1]).toEqual({
      allocationId: 'a2',
      employeeId: 'e2',
      startHm: '11:00',
      endHm: '12:00',
    })
    expect(
      isInheritedHmTiming({
        assignmentStartHm: '09:30',
        assignmentEndHm: '12:30',
        visitStartHm: '09:30',
        visitEndHm: '12:30',
      }),
    ).toBe(true)
  })
})
