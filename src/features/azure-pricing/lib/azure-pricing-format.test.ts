import { describe, expect, it } from 'vitest'
import {
  budgetTone,
  changeDirection,
  clampPercent,
  formatDateGb,
  formatDateTimeGb,
  formatDuration,
  formatMoney,
  formatMoneyAxis,
  formatMoneyDifference,
  formatMonthGb,
  formatPercent,
  formatRelativeTime,
  formatShortDateGb,
  formatSignedPercent,
  formatUnitPrice,
  reachedThresholds,
} from '@/features/azure-pricing/lib/azure-pricing-format'

describe('money formatting (GBP, en-GB)', () => {
  it('formats major units with 2 dp and thousands separators', () => {
    expect(formatMoney(23.4)).toBe('£23.40')
    expect(formatMoney(1234.5)).toBe('£1,234.50')
    expect(formatMoney(0)).toBe('£0.00')
  })

  it('renders an em dash for missing values', () => {
    expect(formatMoney(null)).toBe('—')
    expect(formatMoney(undefined)).toBe('—')
    expect(formatMoney(Number.NaN)).toBe('—')
  })

  it('keeps tiny unit prices visible', () => {
    expect(formatUnitPrice(0.0000216)).toBe('£0.0000216')
    expect(formatUnitPrice(0.0124)).toBe('£0.0124')
    expect(formatUnitPrice(0.1052)).toBe('£0.1052')
    expect(formatUnitPrice(0.32)).toBe('£0.32')
    expect(formatUnitPrice(12.5)).toBe('£12.50')
    expect(formatUnitPrice(0)).toBe('£0.00')
  })

  it('signs differences', () => {
    expect(formatMoneyDifference(4.2)).toBe('+£4.20')
    expect(formatMoneyDifference(-1)).toBe('−£1.00')
    expect(formatMoneyDifference(0.001)).toBe('£0.00')
  })

  it('compacts axis labels', () => {
    expect(formatMoneyAxis(0)).toBe('£0')
    expect(formatMoneyAxis(12)).toBe('£12')
    expect(formatMoneyAxis(2.5)).toBe('£2.50')
    expect(formatMoneyAxis(1500)).toMatch(/^£1\.5[kK]$/)
  })
})

describe('percent formatting', () => {
  it('formats plain and signed percentages', () => {
    expect(formatPercent(23.44)).toBe('23.4%')
    expect(formatPercent(50, 0)).toBe('50%')
    expect(formatPercent(null)).toBe('—')
    expect(formatSignedPercent(12.46)).toBe('+12.5%')
    expect(formatSignedPercent(-3)).toBe('−3.0%')
    expect(formatSignedPercent(0.01)).toBe('0.0%')
  })

  it('derives change direction', () => {
    expect(changeDirection(null)).toBe('none')
    expect(changeDirection(12)).toBe('up')
    expect(changeDirection(-4)).toBe('down')
    expect(changeDirection(0.01)).toBe('flat')
  })
})

describe('date formatting', () => {
  it('formats ISO dates without timezone drift', () => {
    // ICU versions differ on "Sep" vs "Sept" for en-GB.
    expect(formatDateGb('2026-09-01')).toMatch(/^1 Sept? 2026$/)
    expect(formatDateGb('2026-01-31T23:30:00Z')).toBe('31 Jan 2026')
    expect(formatShortDateGb('2026-12-31')).toMatch(/^31 Dec$/)
    expect(formatDateGb(null)).toBe('—')
  })

  it('formats months', () => {
    expect(formatMonthGb('2026-09')).toBe('September 2026')
    expect(formatMonthGb('2026-02-15')).toBe('February 2026')
  })

  it('formats timestamps in UK time', () => {
    // 13:05 UTC in BST is 14:05 London time.
    expect(formatDateTimeGb('2026-07-01T13:05:00Z')).toMatch(/1 Jul 2026,? 14:05/)
  })

  it('describes relative times', () => {
    const now = new Date('2026-10-01T12:00:00Z')
    expect(formatRelativeTime(null, now)).toBe('never')
    expect(formatRelativeTime('2026-10-01T11:59:50Z', now)).toBe('just now')
    expect(formatRelativeTime('2026-10-01T11:55:00Z', now)).toBe('5 minutes ago')
    expect(formatRelativeTime('2026-10-01T09:00:00Z', now)).toBe('3 hours ago')
    expect(formatRelativeTime('2026-09-30T12:00:00Z', now)).toBe('yesterday')
    expect(formatRelativeTime('2026-09-27T12:00:00Z', now)).toBe('4 days ago')
  })

  it('formats sync durations', () => {
    expect(formatDuration('2026-10-01T10:00:00Z', null)).toBe('—')
    expect(formatDuration('2026-10-01T10:00:00Z', '2026-10-01T10:00:00.850Z')).toBe('850 ms')
    expect(formatDuration('2026-10-01T10:00:00Z', '2026-10-01T10:00:12Z')).toBe('12s')
    expect(formatDuration('2026-10-01T10:00:00Z', '2026-10-01T10:01:05Z')).toBe('1m 05s')
    expect(formatDuration('2026-10-01T10:00:00Z', '2026-10-01T11:02:00Z')).toBe('1h 02m')
  })
})

describe('budget threshold colours', () => {
  it.each([
    [0, 'ok'],
    [49.9, 'ok'],
    [50, 'notice'],
    [69.9, 'notice'],
    [70, 'warning'],
    [84.99, 'warning'],
    [85, 'high'],
    [94.9, 'high'],
    [95, 'critical'],
    [130, 'critical'],
  ] as const)('%s%% → %s', (pct, tone) => {
    expect(budgetTone(pct)).toBe(tone)
  })

  it('treats missing values as ok', () => {
    expect(budgetTone(null)).toBe('ok')
  })

  it('lists thresholds reached', () => {
    expect(reachedThresholds(23.4)).toEqual([])
    expect(reachedThresholds(72)).toEqual([50, 70])
    expect(reachedThresholds(100)).toEqual([50, 70, 85, 95])
  })

  it('clamps bar widths', () => {
    expect(clampPercent(-5)).toBe(0)
    expect(clampPercent(140)).toBe(100)
    expect(clampPercent(null)).toBe(0)
  })
})
