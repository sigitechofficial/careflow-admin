import { describe, expect, it } from 'vitest'
import { entryPattern, readDate, readEntry, readMonth, readTime, showEntry, withinRange } from './date-time-entry'

describe('date and time entry in the organisation format', () => {
  it('shows stored values in the chosen order, always 24-hour', () => {
    expect(showEntry('date', '2026-06-15', 'DD_MM_YYYY')).toBe('15/06/2026')
    expect(showEntry('date', '2026-06-15', 'MM_DD_YYYY')).toBe('06/15/2026')
    expect(showEntry('date', '2026-06-15', 'YYYY_MM_DD')).toBe('2026-06-15')
    expect(showEntry('time', '14:30', 'DD_MM_YYYY')).toBe('14:30')
    expect(showEntry('datetime-local', '2026-06-15T14:30', 'DD_MM_YYYY')).toBe('15/06/2026 14:30')
    expect(showEntry('month', '2026-06', 'DD_MM_YYYY')).toBe('06/2026')
    expect(entryPattern('date', 'DD_MM_YYYY')).toBe('dd/mm/yyyy')
  })

  it('reads what people type, in their order, with any separator', () => {
    expect(readDate('15/06/2026', 'DD_MM_YYYY')).toBe('2026-06-15')
    expect(readDate('15.6.26', 'DD_MM_YYYY')).toBe('2026-06-15')
    expect(readDate('15062026', 'DD_MM_YYYY')).toBe('2026-06-15')
    expect(readDate('06/15/2026', 'MM_DD_YYYY')).toBe('2026-06-15')
    expect(readDate('2026-06-15', 'YYYY_MM_DD')).toBe('2026-06-15')
  })

  it('refuses dates that do not exist, instead of guessing', () => {
    expect(readDate('31/02/2026', 'DD_MM_YYYY')).toBeNull()
    expect(readDate('15/13/2026', 'DD_MM_YYYY')).toBeNull()
    expect(readDate('15/06', 'DD_MM_YYYY')).toBeNull()
  })

  it('reads times as 24-hour; "2:30 pm" still works', () => {
    expect(readTime('14:30')).toBe('14:30')
    expect(readTime('9.05')).toBe('09:05')
    expect(readTime('0930')).toBe('09:30')
    expect(readTime('14')).toBe('14:00')
    expect(readTime('2:30 pm')).toBe('14:30')
    expect(readTime('12am')).toBe('00:00')
    expect(readTime('25:00')).toBeNull()
  })

  it('reads date and time together, and months', () => {
    expect(readEntry('datetime-local', '15/06/2026 14:30', 'DD_MM_YYYY')).toBe('2026-06-15T14:30')
    expect(readEntry('datetime-local', '15/06/2026', 'DD_MM_YYYY')).toBe('2026-06-15T00:00')
    expect(readMonth('06/2026', 'DD_MM_YYYY')).toBe('2026-06')
    expect(readMonth('2026-06', 'YYYY_MM_DD')).toBe('2026-06')
  })

  it('checks min and max', () => {
    expect(withinRange('2026-06-15', '2026-06-01', '2026-06-30')).toBe(true)
    expect(withinRange('2026-07-01', '2026-06-01', '2026-06-30')).toBe(false)
  })
})
