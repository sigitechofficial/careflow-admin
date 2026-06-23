import { describe, expect, it } from 'vitest'
import {
  addDaysToIsoDate,
  DEFAULT_GENERATE_ROTA_DAYS,
  resolveGenerateRotaToDate,
} from '@/features/service-users/visit-plan/visit-plan-generate-rota.util'

describe('visit-plan-generate-rota.util', () => {
  it('defaults to 14 inclusive days when To is empty', () => {
    expect(DEFAULT_GENERATE_ROTA_DAYS).toBe(14)
    expect(resolveGenerateRotaToDate('2026-06-15')).toBe('2026-06-28')
    expect(resolveGenerateRotaToDate('2026-06-15', '2026-06-20')).toBe('2026-06-20')
    expect(resolveGenerateRotaToDate('2026-06-15', '   ')).toBe('2026-06-28')
  })

  it('adds days in UTC', () => {
    expect(addDaysToIsoDate('2026-06-15', 1)).toBe('2026-06-16')
  })

  it('does not throw when From is blank (tab remount before state init)', () => {
    expect(() => resolveGenerateRotaToDate('', '')).not.toThrow()
    expect(() => addDaysToIsoDate('', 1)).not.toThrow()
  })
})
