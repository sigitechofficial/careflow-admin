import { describe, expect, it } from 'vitest'
import {
  addDaysToIsoDate,
  DEFAULT_GENERATE_ROTA_DAYS,
  endOfMonthIsoDate,
  resolveGenerateRotaToDate,
} from '@/features/service-users/visit-plan/visit-plan-generate-rota.util'

describe('visit-plan-generate-rota.util', () => {
  it('defaults to 28 inclusive days when To is empty', () => {
    expect(DEFAULT_GENERATE_ROTA_DAYS).toBe(28)
    expect(resolveGenerateRotaToDate('2026-06-15')).toBe('2026-07-12')
    expect(resolveGenerateRotaToDate('2026-06-15', '2026-06-20')).toBe('2026-06-20')
    expect(resolveGenerateRotaToDate('2026-06-15', '   ')).toBe('2026-07-12')
  })

  it('supports calendar month mode when To is empty', () => {
    expect(
      resolveGenerateRotaToDate('2026-06-15', '', { mode: 'CALENDAR_MONTH', horizonDays: 28 }),
    ).toBe('2026-06-30')
  })

  it('adds days in UTC', () => {
    expect(addDaysToIsoDate('2026-06-15', 1)).toBe('2026-06-16')
  })

  it('endOfMonthIsoDate handles month boundaries', () => {
    expect(endOfMonthIsoDate('2026-06-01')).toBe('2026-06-30')
  })

  it('does not throw when From is blank (tab remount before state init)', () => {
    expect(() => resolveGenerateRotaToDate('', '')).not.toThrow()
    expect(() => addDaysToIsoDate('', 1)).not.toThrow()
  })
})
