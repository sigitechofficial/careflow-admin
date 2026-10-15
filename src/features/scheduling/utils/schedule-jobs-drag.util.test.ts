import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  buildJobScheduleDateTimes,
  pickClosestScheduleJobsRowKey,
  shiftJobScheduleTimes,
  shiftJobScheduleTimesFromViewportDeltaPx,
} from '@/features/scheduling/utils/schedule-jobs-drag.util'

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

describe('dragging a job on the rota board', () => {
  // 20 Oct 2026 is British Summer Time: 22:00 UK = 21:00Z.
  const job = (start: string, end: string) =>
    ({ id: 'j', scheduledStartDateTime: start, scheduledEndDateTime: end, durationMinutes: null }) as unknown as TimelineJob
  const night = job('2026-10-20T21:00:00.000Z', '2026-10-21T06:00:00.000Z')
  const fullDay = { startMinute: 0, endMinute: 1440, spanMinutes: 1440, gridWidth: 1440 } as never

  it('moving a night visit two hours earlier keeps its length and ends the next morning', () => {
    const t = shiftJobScheduleTimes(night, '2026-10-20', -120)
    expect(t.scheduledStartDateTime).toBe('2026-10-20T19:00:00.000Z')
    expect(t.scheduledEndDateTime).toBe('2026-10-21T04:00:00.000Z')
  })

  it('moving a night visit to another carer without a time change keeps its times', () => {
    const t = shiftJobScheduleTimesFromViewportDeltaPx(night, '2026-10-20', 0, fullDay)
    expect(t.scheduledStartDateTime).toBe(night.scheduledStartDateTime)
    expect(t.scheduledEndDateTime).toBe(night.scheduledEndDateTime)
  })

  it('a night visit can be moved later, up to the last slot of the day', () => {
    const t = shiftJobScheduleTimes(night, '2026-10-20', 600)
    expect(t.scheduledStartDateTime).toBe('2026-10-20T22:45:00.000Z')
    expect(t.scheduledEndDateTime).toBe('2026-10-21T07:45:00.000Z')
  })

  it('a day visit still has to end by midnight, and never gets an end before its start', () => {
    const day = job('2026-10-20T13:00:00.000Z', '2026-10-20T14:00:00.000Z') // 14:00-15:00 UK
    const t = shiftJobScheduleTimes(day, '2026-10-20', 1000)
    expect(t.scheduledStartDateTime).toBe('2026-10-20T22:00:00.000Z') // 23:00 UK
    expect(t.scheduledEndDateTime).toBe('2026-10-20T23:00:00.000Z') // 00:00 UK next day
    expect(Date.parse(t.scheduledEndDateTime)).toBeGreaterThan(Date.parse(t.scheduledStartDateTime))
  })

  it('a day visit moved by an hour is unchanged from before', () => {
    const day = job('2026-10-20T13:00:00.000Z', '2026-10-20T14:00:00.000Z')
    const t = shiftJobScheduleTimes(day, '2026-10-20', 60)
    expect(t.scheduledStartDateTime).toBe('2026-10-20T14:00:00.000Z')
    expect(t.scheduledEndDateTime).toBe('2026-10-20T15:00:00.000Z')
  })
})

describe('buildJobScheduleDateTimes (allocate and complete dialogs)', () => {
  const hours = (w: ReturnType<typeof buildJobScheduleDateTimes>) =>
    (Date.parse(w!.scheduledEndDateTime) - Date.parse(w!.scheduledStartDateTime)) / 3600000

  it('22:00-07:00 on an ordinary night ends 07:00 the next morning (9 hours)', () => {
    const w = buildJobScheduleDateTimes('2026-10-20', '22:00', '07:00')
    expect(w?.scheduledEndDateTime).toBe('2026-10-21T06:00:00.000Z')
    expect(hours(w)).toBe(9)
  })

  it('22:00-07:00 when the clocks go back (24-25 Oct 2026) ends 07:00 GMT, 10 hours', () => {
    const w = buildJobScheduleDateTimes('2026-10-24', '22:00', '07:00')
    expect(w?.scheduledEndDateTime).toBe('2026-10-25T07:00:00.000Z')
    expect(hours(w)).toBe(10)
  })

  it('22:00-07:00 when the clocks go forward (27-28 Mar 2027) ends 07:00 BST, 8 hours', () => {
    const w = buildJobScheduleDateTimes('2027-03-27', '22:00', '07:00')
    expect(w?.scheduledEndDateTime).toBe('2027-03-28T06:00:00.000Z')
    expect(hours(w)).toBe(8)
  })

  it('a same-day visit is unchanged', () => {
    const w = buildJobScheduleDateTimes('2026-10-25', '09:00', '10:30')
    expect(w).toEqual({
      scheduledStartDateTime: '2026-10-25T09:00:00.000Z',
      scheduledEndDateTime: '2026-10-25T10:30:00.000Z',
    })
  })

  it('still rejects a window shorter than 5 minutes', () => {
    expect(buildJobScheduleDateTimes('2026-10-20', '09:00', '09:03')).toBeNull()
  })
})
