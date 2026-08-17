import { describe, expect, it } from 'vitest'
import {
  formatDisplayDate,
  formatDisplayDateLong,
  formatDisplayHourLabel,
  formatDisplayPeriodRange,
  formatDisplayTimeFromIso,
  formatDisplayTimeHm,
  formatDisplayTimeRangeHm,
} from '@/shared/lib/display-format.util'

describe('formatDisplayDate', () => {
  it('formats DD/MM/YYYY by default', () => {
    expect(formatDisplayDate('2026-06-15')).toBe('15/06/2026')
  })

  it('formats MM/DD/YYYY', () => {
    expect(formatDisplayDate('2026-06-15', 'MM_DD_YYYY')).toBe('06/15/2026')
  })

  it('formats YYYY-MM-DD', () => {
    expect(formatDisplayDate('2026-06-15', 'YYYY_MM_DD')).toBe('2026-06-15')
  })
})

describe('formatDisplayDateLong', () => {
  it('includes weekday and configured date', () => {
    expect(formatDisplayDateLong('2026-06-15', 'DD_MM_YYYY')).toBe('Monday, 15/06/2026')
  })
})

describe('formatDisplayTimeFromIso', () => {
  it('formats London winter GMT from a UTC instant', () => {
    expect(formatDisplayTimeFromIso('2026-01-15T14:30:00.000Z')).toBe('14:30')
  })

  it('formats London BST from a UTC instant', () => {
    expect(formatDisplayTimeFromIso('2026-06-15T14:30:00.000Z')).toBe('15:30')
  })

  it('shows noon BST when the job is stored as 11:00Z', () => {
    expect(formatDisplayTimeFromIso('2026-08-17T11:00:00.000Z')).toBe('12:00')
  })

  it('formats 24-hour without minutes in the operational timezone', () => {
    expect(formatDisplayTimeFromIso('2026-06-15T14:30:00.000Z', 'HH_XX')).toBe('15')
  })
})

describe('formatDisplayTimeHm', () => {
  it('formats HH:mm strings with minutes', () => {
    expect(formatDisplayTimeHm('09:15', 'HH_MM')).toBe('09:15')
  })

  it('formats HH:mm strings without minutes', () => {
    expect(formatDisplayTimeHm('09:15', 'HH_XX')).toBe('9')
  })
})

describe('formatDisplayHourLabel', () => {
  it('formats axis hours with minutes by default', () => {
    expect(formatDisplayHourLabel(9, 'HH_MM')).toBe('09:00')
  })

  it('formats axis hours without minutes', () => {
    expect(formatDisplayHourLabel(9, 'HH_XX')).toBe('9')
  })
})

describe('formatDisplayPeriodRange', () => {
  it('formats period ranges using the selected time format', () => {
    expect(formatDisplayPeriodRange(9, 12, 'HH_MM')).toBe('09:00 – 12:00')
    expect(formatDisplayPeriodRange(9, 12, 'HH_XX')).toBe('9 – 12')
  })
})

describe('formatDisplayTimeRangeHm', () => {
  it('formats local time ranges', () => {
    expect(formatDisplayTimeRangeHm('09:00', '10:30', 'HH_MM')).toBe('09:00 – 10:30')
  })
})
