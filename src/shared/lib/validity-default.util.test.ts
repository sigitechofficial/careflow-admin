import { describe, expect, it } from 'vitest'
import { expiryFromValidityIso, nextPrefilledExpiry, validityHint } from '@/shared/lib/validity-default.util'

describe('expiryFromValidityIso', () => {
  it('adds calendar months with month-end clamping', () => {
    expect(expiryFromValidityIso('2026-01-15', 36)).toBe('2029-01-15')
    expect(expiryFromValidityIso('2026-08-31', 6)).toBe('2027-02-28')
    expect(expiryFromValidityIso('2026-11-30', 3)).toBe('2027-02-28')
  })

  it('gives nothing without a start date or a period', () => {
    expect(expiryFromValidityIso('', 12)).toBeNull()
    expect(expiryFromValidityIso('2026-01-15', null)).toBeNull()
    expect(expiryFromValidityIso('2026-01-15', 0)).toBeNull()
  })
})

describe('nextPrefilledExpiry', () => {
  it('fills an empty expiry and refills it while it is still ours', () => {
    const first = nextPrefilledExpiry({ startIso: '2026-01-15', currentExpiry: '', lastAutoExpiry: null, months: 12 })
    expect(first).toEqual({ expiry: '2027-01-15', autoExpiry: '2027-01-15' })
    const second = nextPrefilledExpiry({ startIso: '2026-02-01', currentExpiry: first.expiry, lastAutoExpiry: first.autoExpiry, months: 12 })
    expect(second).toEqual({ expiry: '2027-02-01', autoExpiry: '2027-02-01' })
  })

  it('never overwrites a date the user typed', () => {
    expect(
      nextPrefilledExpiry({ startIso: '2026-02-01', currentExpiry: '2026-12-31', lastAutoExpiry: null, months: 12 }),
    ).toEqual({ expiry: '2026-12-31', autoExpiry: null })
  })

  it('clears the filled value when the start date is cleared', () => {
    expect(
      nextPrefilledExpiry({ startIso: '', currentExpiry: '2027-01-15', lastAutoExpiry: '2027-01-15', months: 12 }),
    ).toEqual({ expiry: '', autoExpiry: null })
  })
})

describe('validityHint', () => {
  it('reads in years or months', () => {
    expect(validityHint(36, 'the start date')).toBe('Defaults to 3 years after the start date.')
    expect(validityHint(12, 'the issue date')).toBe('Defaults to 1 year after the issue date.')
    expect(validityHint(6, 'today')).toBe('Defaults to 6 months after today.')
    expect(validityHint(null, 'today')).toBeNull()
  })
})
