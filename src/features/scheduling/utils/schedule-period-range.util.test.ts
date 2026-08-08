import { describe, expect, it } from 'vitest'
import {
  clampIsoDateToRange,
  enumerateScheduleIsoDays,
  MAX_SCHEDULE_FILTER_RANGE_DAYS,
  schedulePeriodDayCount,
} from '@/features/scheduling/utils/schedule-period-range.util'

describe('schedule-period-range.util', () => {
  it('clamps focus day into period', () => {
    expect(clampIsoDateToRange('2026-08-01', '2026-08-05', '2026-08-10')).toBe('2026-08-05')
    expect(clampIsoDateToRange('2026-08-12', '2026-08-05', '2026-08-10')).toBe('2026-08-10')
    expect(clampIsoDateToRange('2026-08-07', '2026-08-05', '2026-08-10')).toBe('2026-08-07')
  })

  it('enumerates inclusive days and caps length', () => {
    expect(enumerateScheduleIsoDays('2026-08-01', '2026-08-03')).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
    ])
    expect(enumerateScheduleIsoDays('2026-08-03', '2026-08-01')).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
    ])
    expect(enumerateScheduleIsoDays('2026-01-01', '2026-12-31').length).toBe(
      MAX_SCHEDULE_FILTER_RANGE_DAYS,
    )
  })

  it('counts full period days', () => {
    expect(schedulePeriodDayCount('2026-08-01', '2026-08-07')).toBe(7)
  })
})
