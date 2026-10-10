import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_OPERATIONAL_TIMEZONE,
  dayKeyInTimeZone,
  operationalTodayIso,
  syncOrganisationOperationalTimezone,
} from './operational-day.util'

afterEach(() => {
  syncOrganisationOperationalTimezone(DEFAULT_OPERATIONAL_TIMEZONE)
})

describe('operationalTodayIso', () => {
  it('uses Europe/London by default, not Asia/Karachi when passed explicitly', () => {
    // Still 6 Aug in London (BST); already 7 Aug in Karachi (UTC+5)
    const now = new Date('2026-08-06T21:05:00.000Z')
    expect(operationalTodayIso(now, DEFAULT_OPERATIONAL_TIMEZONE)).toBe('2026-08-06')
    expect(operationalTodayIso(now, 'Asia/Karachi')).toBe('2026-08-07')
  })

  it('uses synced organisation timezone by default', () => {
    const now = new Date('2026-08-06T21:05:00.000Z')
    syncOrganisationOperationalTimezone('Europe/London')
    expect(operationalTodayIso(now)).toBe('2026-08-06')
  })
})

describe('dayKeyInTimeZone', () => {
  it('maps evening UTC start to London next calendar day when past midnight BST', () => {
    // 2026-08-06 23:30 UTC = 2026-08-07 00:30 London (BST)
    const instant = new Date('2026-08-06T23:30:00.000Z')
    expect(dayKeyInTimeZone(instant, 'Europe/London')).toBe('2026-08-07')
  })
})
