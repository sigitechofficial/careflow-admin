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

  it('uses the containing row even when an adjacent tall row has a closer centre', () => {
    // Tall unassigned area above short carer rows — pointer sits inside carer:a
    // near its top edge; the tall row centre would otherwise be closer.
    const mixed = [
      { key: 'unassigned', top: 0, height: 250 },
      { key: 'carer:a', top: 250, height: 56 },
      { key: 'carer:b', top: 306, height: 56 },
    ]
    expect(pickClosestScheduleJobsRowKey(252, mixed)).toBe('carer:a')
    expect(pickClosestScheduleJobsRowKey(308, mixed)).toBe('carer:b')
  })

  it('falls back to nearest centre when pointer is outside every row', () => {
    expect(pickClosestScheduleJobsRowKey(90, rows)).toBe('unassigned')
    expect(pickClosestScheduleJobsRowKey(400, rows)).toBe('carer:c')
  })
})
