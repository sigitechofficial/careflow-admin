import { describe, expect, it } from 'vitest'
import {
  formatDateTimeGb,
  formatDateTimeSecondsGb,
  formatDurationMs,
  formatRelativeTime,
  formatShortDateTimeSecondsGb,
  formatTimeSecondsGb,
  isSameUkDay,
} from '@/shared/lib/time-format'

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-02T12:00:00Z')

  it('formats past and future times', () => {
    expect(formatRelativeTime('2026-10-02T11:59:30Z', now)).toBe('just now')
    expect(formatRelativeTime('2026-10-02T11:55:00Z', now)).toBe('5 minutes ago')
    expect(formatRelativeTime('2026-10-02T09:00:00Z', now)).toBe('3 hours ago')
    expect(formatRelativeTime('2026-10-01T12:00:00Z', now)).toBe('yesterday')
    expect(formatRelativeTime('2026-10-02T12:04:00Z', now)).toBe('in 4 minutes')
    expect(formatRelativeTime('2026-10-02T14:00:00Z', now)).toBe('in 2 hours')
  })

  it('handles missing and invalid values', () => {
    expect(formatRelativeTime(null, now)).toBe('never')
    expect(formatRelativeTime('nope', now)).toBe('unknown')
  })
})

describe('formatDurationMs', () => {
  it('formats milliseconds, seconds, minutes and hours', () => {
    expect(formatDurationMs(850)).toBe('850 ms')
    expect(formatDurationMs(12_000)).toBe('12s')
    expect(formatDurationMs(65_000)).toBe('1m 05s')
    expect(formatDurationMs(3_720_000)).toBe('1h 02m')
  })

  it('returns a dash for missing or bad values', () => {
    expect(formatDurationMs(null)).toBe('—')
    expect(formatDurationMs(undefined)).toBe('—')
    expect(formatDurationMs(-5)).toBe('—')
    expect(formatDurationMs(Number.NaN)).toBe('—')
  })
})

describe('UK date-time formatting', () => {
  it('shows UK local time (BST in October)', () => {
    expect(formatDateTimeGb('2026-10-02T12:05:00Z')).toBe('2 Oct 2026, 13:05')
    expect(formatDateTimeSecondsGb('2026-10-02T12:05:09Z')).toBe('2 Oct 2026, 13:05:09')
    expect(formatTimeSecondsGb('2026-10-02T12:05:09Z')).toBe('13:05:09')
    expect(formatShortDateTimeSecondsGb('2026-10-02T12:05:09Z')).toBe('2 Oct, 13:05:09')
  })

  it('compares UK calendar days', () => {
    // 23:30Z on 1 Oct is 00:30 BST on 2 Oct.
    expect(isSameUkDay('2026-10-01T23:30:00Z', '2026-10-02T08:00:00Z')).toBe(true)
    expect(isSameUkDay('2026-10-01T22:30:00Z', '2026-10-02T08:00:00Z')).toBe(false)
    expect(isSameUkDay(null, '2026-10-02T08:00:00Z')).toBe(false)
  })

  it('handles empty values', () => {
    expect(formatDateTimeGb(null)).toBe('—')
    expect(formatDateTimeSecondsGb(undefined)).toBe('—')
    expect(formatTimeSecondsGb(null)).toBe('—')
  })
})
