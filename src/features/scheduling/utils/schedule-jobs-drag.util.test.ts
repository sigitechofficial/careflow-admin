import { describe, expect, it } from 'vitest'
import { pickClosestScheduleJobsRowKey } from '@/features/scheduling/utils/schedule-jobs-drag.util'

describe('pickClosestScheduleJobsRowKey', () => {
  const rows = [
    { key: 'unassigned', top: 100, height: 52 },
    { key: 'carer:a', top: 152, height: 52 },
    { key: 'carer:b', top: 204, height: 52 },
    { key: 'carer:c', top: 256, height: 52 },
  ]

  it('picks row 2 when pointer is in the upper half of that row', () => {
    expect(pickClosestScheduleJobsRowKey(160, rows)).toBe('carer:a')
  })

  it('picks row 2 not row 3 when pointer is on the border between them', () => {
    expect(pickClosestScheduleJobsRowKey(203, rows)).toBe('carer:a')
    expect(pickClosestScheduleJobsRowKey(205, rows)).toBe('carer:b')
  })

  it('picks row centre closest to pointer', () => {
    expect(pickClosestScheduleJobsRowKey(178, rows)).toBe('carer:a')
    expect(pickClosestScheduleJobsRowKey(230, rows)).toBe('carer:b')
  })
})
