import { describe, expect, it } from 'vitest'
import {
  addDaysToIsoDate,
  DEFAULT_GENERATE_ROTA_DAYS,
  endOfMonthIsoDate,
  maxEnabledSlotBackfillDays,
  resolveBackfillWindowEnd,
  resolveBackfillWindowStart,
  resolveGenerateRotaToDate,
  resolveRotaStartIsoDate,
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

  it('resolveBackfillWindowStart is N days before rota start', () => {
    expect(resolveBackfillWindowStart('2026-08-06', 6)).toBe('2026-07-31')
    expect(resolveBackfillWindowEnd('2026-08-06')).toBe('2026-08-05')
  })

  it('resolveRotaStartIsoDate uses earliest enabled slot start', () => {
    expect(
      resolveRotaStartIsoDate(
        [
          { isEnabled: true, slotEffectiveFrom: '2026-08-06' },
          { isEnabled: false, slotEffectiveFrom: '2026-07-01' },
          { isEnabled: true, slotEffectiveFrom: '2026-08-10' },
        ],
        '2026-01-01',
      ),
    ).toBe('2026-08-06')
  })

  it('maxEnabledSlotBackfillDays uses enabled slots only and caps at 14', () => {
    expect(
      maxEnabledSlotBackfillDays([
        { isEnabled: true, allowBackfillDays: 3 },
        { isEnabled: false, allowBackfillDays: 10 },
        { isEnabled: true, allowBackfillDays: 20 },
      ]),
    ).toBe(14)
    expect(maxEnabledSlotBackfillDays([{ isEnabled: true, allowBackfillDays: 0 }])).toBe(0)
  })
})
