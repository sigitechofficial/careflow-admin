import { describe, expect, it } from 'vitest'
import {
  ECM_OPERATIONAL_TIMEZONE,
  daysInPeriod,
  normalizeToDayKey,
  periodFromPreset,
  todayIsoLocal,
} from './ecm-operational-period.util'

describe('todayIsoLocal', () => {
  it('uses Europe/London, not the browser offset', () => {
    // 2026-08-06 21:05 UTC = still 6 Aug in London (BST), but 7 Aug in UTC+5
    const now = new Date('2026-08-06T21:05:00.000Z')
    expect(todayIsoLocal(now, ECM_OPERATIONAL_TIMEZONE)).toBe('2026-08-06')
    expect(todayIsoLocal(now, 'Asia/Karachi')).toBe('2026-08-07')
  })
})

describe('periodFromPreset', () => {
  it('this_month covers the full calendar month', () => {
    expect(periodFromPreset('this_month', '2026-08-06')).toEqual({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    })
  })

  it('month_to_date ends on today', () => {
    expect(periodFromPreset('month_to_date', '2026-08-06')).toEqual({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-06',
    })
  })

  it('last_14_days is inclusive of today', () => {
    expect(periodFromPreset('last_14_days', '2026-08-06')).toEqual({
      dateFrom: '2026-07-24',
      dateTo: '2026-08-06',
    })
  })

  it('yesterday is a single prior London day', () => {
    expect(periodFromPreset('yesterday', '2026-08-07')).toEqual({
      dateFrom: '2026-08-06',
      dateTo: '2026-08-06',
    })
  })

  it('this_week is Monday–Sunday containing today', () => {
    // 2026-08-07 is Friday
    expect(periodFromPreset('this_week', '2026-08-07')).toEqual({
      dateFrom: '2026-08-03',
      dateTo: '2026-08-09',
    })
  })

  it('last_week is the prior Monday–Sunday', () => {
    expect(periodFromPreset('last_week', '2026-08-07')).toEqual({
      dateFrom: '2026-07-27',
      dateTo: '2026-08-02',
    })
  })

  it('this_week from Sunday still starts on that week’s Monday', () => {
    expect(periodFromPreset('this_week', '2026-08-09')).toEqual({
      dateFrom: '2026-08-03',
      dateTo: '2026-08-09',
    })
  })

  it('quarter_to_date starts on quarter boundary', () => {
    expect(periodFromPreset('quarter_to_date', '2026-08-07')).toEqual({
      dateFrom: '2026-07-01',
      dateTo: '2026-08-07',
    })
  })
})

describe('daysInPeriod', () => {
  it('lists inclusive days', () => {
    expect(daysInPeriod({ dateFrom: '2026-08-05', dateTo: '2026-08-07' })).toEqual([
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
    ])
  })
})

describe('normalizeToDayKey', () => {
  it('maps ISO datetimes via London operational day', () => {
    expect(normalizeToDayKey('2026-08-06T23:30:00.000Z')).toBe('2026-08-07')
    expect(normalizeToDayKey('2026-08-06')).toBe('2026-08-06')
  })
})
