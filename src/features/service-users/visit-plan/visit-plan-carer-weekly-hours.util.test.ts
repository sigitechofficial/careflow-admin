import { describe, expect, it } from 'vitest'
import { summarizeCarerWeeklyHours } from '@/features/service-users/visit-plan/visit-plan-carer-weekly-hours.util'

describe('summarizeCarerWeeklyHours', () => {
  it('shows booked, done, limit and what this visit leaves', () => {
    const r = summarizeCarerWeeklyHours(
      {
        contractedWeeklyHours: 10,
        allowedWeeklyHours: 10,
        assignedWeeklyHours: 6,
        projectedWeeklyHours: 8,
        completedWeeklyHours: 3,
      },
      false,
    )
    expect(r?.text).toBe('This week: 6h assigned · limit 10h · 4h left · with this visit 8h')
    expect(r?.statsLine).toBe('Booked 6h · Done 3h · Limit 10h')
    expect(r?.visitLine).toBe('This visit +2h → 2h left')
    expect(r?.tone).toBe('normal')
  })

  it('flags when this visit takes the carer over the limit', () => {
    const r = summarizeCarerWeeklyHours(
      {
        contractedWeeklyHours: 40,
        allowedWeeklyHours: 40,
        assignedWeeklyHours: 40,
        projectedWeeklyHours: 41,
        completedWeeklyHours: 24,
      },
      false,
    )
    expect(r?.text).toBe('This week: 40h assigned · limit 40h · 0h left · with this visit 41h (1h over)')
    expect(r?.statsLine).toBe('Booked 40h · Done 24h · Limit 40h')
    expect(r?.visitLine).toBe('This visit +1h → 1h over limit')
    expect(r?.tone).toBe('over')
  })

  it('assigned card: full sentence counts this visit', () => {
    const r = summarizeCarerWeeklyHours(
      { contractedWeeklyHours: 10, allowedWeeklyHours: 10, assignedWeeklyHours: 10, projectedWeeklyHours: 11.5 },
      true,
    )
    expect(r?.text).toBe('This week: 11.5h assigned incl. this visit · limit 10h · 1.5h over')
    expect(r?.statsLine).toBe('Booked 10h · Done 0h · Limit 10h')
    expect(r?.visitLine).toBe('This visit +1.5h → 1.5h over limit')
    expect(r?.tone).toBe('over')
  })

  it('amber when exactly at the limit', () => {
    const r = summarizeCarerWeeklyHours(
      { contractedWeeklyHours: 10, allowedWeeklyHours: 10, assignedWeeklyHours: 8, projectedWeeklyHours: 10 },
      true,
    )
    expect(r?.visitLine).toBe('This visit +2h → 0h left')
    expect(r?.tone).toBe('atLimit')
  })

  it('uses active approved extra hours as the limit', () => {
    const r = summarizeCarerWeeklyHours(
      { contractedWeeklyHours: 10, allowedWeeklyHours: 20, assignedWeeklyHours: 11, projectedWeeklyHours: 12 },
      false,
    )
    expect(r?.text).toBe(
      'This week: 11h assigned · limit 20h (approved extra) · 9h left · with this visit 12h',
    )
    expect(r?.statsLine).toBe('Booked 11h · Done 0h · Limit 20h (approved extra)')
  })

  it('returns null while hours are not loaded', () => {
    expect(summarizeCarerWeeklyHours({ assignedWeeklyHours: undefined }, true)).toBeNull()
  })

  it('says when no weekly limit is set', () => {
    const r = summarizeCarerWeeklyHours(
      { contractedWeeklyHours: null, allowedWeeklyHours: null, assignedWeeklyHours: 3, projectedWeeklyHours: 4 },
      false,
    )
    expect(r?.text).toBe('This week: 3h assigned · weekly limit not set')
    expect(r?.statsLine).toBe('Booked 3h · Done 0h · No limit set')
    expect(r?.visitLine).toBe('This visit +1h')
    expect(r?.tone).toBe('normal')
  })
})
