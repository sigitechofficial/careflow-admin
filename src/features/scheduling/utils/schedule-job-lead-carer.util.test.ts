import { describe, expect, it } from 'vitest'
import {
  resolveJobLeadCarer,
  sortAllocationsByAssignedOrder,
} from '@/features/scheduling/utils/schedule-job-lead-carer.util'

const row = (
  id: string,
  employeeId: string,
  allocatedAt: string,
  extra: { isLeadCarer?: boolean; status?: string } = {},
) => ({ id, employeeId, allocatedAt, status: extra.status ?? 'CONFIRMED', isLeadCarer: extra.isLeadCarer })

describe('schedule-job-lead-carer.util', () => {
  it('returns null for single-carer visits', () => {
    expect(resolveJobLeadCarer(1, [row('1', 'a', '2026-10-01T09:00:00Z')])).toBeNull()
  })

  it('uses the flagged lead', () => {
    const lead = resolveJobLeadCarer(2, [
      row('1', 'a', '2026-10-01T09:00:00Z'),
      row('2', 'b', '2026-10-01T09:05:00Z', { isLeadCarer: true }),
    ])
    expect(lead?.allocation.employeeId).toBe('b')
    expect(lead?.explicit).toBe(true)
  })

  it('falls back to the earliest-assigned carer (same as the carer app)', () => {
    const lead = resolveJobLeadCarer(2, [
      row('2', 'later', '2026-10-01T09:05:00Z'),
      row('1', 'first', '2026-10-01T09:00:00Z'),
    ])
    expect(lead?.allocation.employeeId).toBe('first')
    expect(lead?.explicit).toBe(false)
  })

  it('ignores removed carers and tie-breaks by id', () => {
    const lead = resolveJobLeadCarer(2, [
      row('0', 'gone', '2026-10-01T08:00:00Z', { isLeadCarer: true, status: 'UNALLOCATED' }),
      row('b', 'x', '2026-10-01T09:00:00Z'),
      row('a', 'y', '2026-10-01T09:00:00Z'),
    ])
    expect(lead?.allocation.employeeId).toBe('y')
    expect(sortAllocationsByAssignedOrder([row('b', 'x', 't'), row('a', 'y', 't')])[0]!.id).toBe('a')
  })
})

describe('clockedInRemovalMessage', () => {
  it('blocks a clocked-in carer on an open visit', async () => {
    const { clockedInRemovalMessage } = await import(
      '@/features/scheduling/utils/schedule-job-lead-carer.util'
    )
    expect(
      clockedInRemovalMessage(
        { status: 'IN_PROGRESS' },
        {
          actualStartDateTime: '2026-10-01T09:00:00Z',
          actualEndDateTime: null,
          employee: { firstName: 'Amina', lastName: 'Yusuf' },
        },
      ),
    ).toBe("Amina Yusuf is clocked in on this visit and can't be removed. Ask them to clock out first.")
    expect(
      clockedInRemovalMessage(
        { status: 'IN_PROGRESS' },
        { actualStartDateTime: '2026-10-01T09:00:00Z', actualEndDateTime: '2026-10-01T10:00:00Z' },
      ),
    ).toBeNull()
    expect(
      clockedInRemovalMessage({ status: 'COMPLETED' }, { actualStartDateTime: '2026-10-01T09:00:00Z' }),
    ).toBeNull()
    expect(clockedInRemovalMessage({ status: 'ALLOCATED' }, {})).toBeNull()
  })
})

describe('isAbsentCoCarerAllocation', () => {
  it('flags a carer who never clocked in on a completed shared visit', async () => {
    const { isAbsentCoCarerAllocation } = await import(
      '@/features/scheduling/utils/schedule-job-lead-carer.util'
    )
    const lead = { id: 'a1', employeeId: 'l', status: 'CONFIRMED', actualStartDateTime: '2026-10-01T09:00:00Z' }
    const absent = { id: 'a2', employeeId: 's', status: 'CONFIRMED', actualStartDateTime: null }
    const job = { status: 'COMPLETED', requiredCarers: 2, allocations: [lead, absent] } as never
    expect(isAbsentCoCarerAllocation(job, absent)).toBe(true)
    expect(isAbsentCoCarerAllocation(job, lead)).toBe(false)
    expect(
      isAbsentCoCarerAllocation({ status: 'IN_PROGRESS', requiredCarers: 2, allocations: [lead, absent] } as never, absent),
    ).toBe(false)
    // Nobody clocked in (office-completed with visit times): unchanged.
    expect(
      isAbsentCoCarerAllocation(
        { status: 'COMPLETED', requiredCarers: 2, allocations: [{ ...lead, actualStartDateTime: null }, absent] } as never,
        absent,
      ),
    ).toBe(false)
  })
})
