import { describe, expect, it } from 'vitest'
import {
  defaultOvernightTimePatch,
  formatVisitPlanNightDuty,
  resolveVisitPlanNightDuty,
  slotAllowsNightDuty,
} from '@/features/service-users/visit-plan/visit-plan-night-duty.util'

describe('visit-plan-night-duty.util', () => {
  it('allows night duty only for overnight kind or midnight-crossing times', () => {
    expect(
      slotAllowsNightDuty({
        slotKind: 'STANDARD',
        plannedStartTime: '08:00',
        plannedEndTime: '09:00',
      }),
    ).toBe(false)
    expect(
      slotAllowsNightDuty({
        slotKind: 'OVERNIGHT',
        plannedStartTime: '20:00',
        plannedEndTime: '23:59',
      }),
    ).toBe(true)
    expect(
      slotAllowsNightDuty({
        slotKind: 'STANDARD',
        plannedStartTime: '22:00',
        plannedEndTime: '07:00',
      }),
    ).toBe(true)
  })

  it('clears sleeping/waking when the slot is a daytime call', () => {
    expect(
      resolveVisitPlanNightDuty({
        slotKind: 'STANDARD',
        plannedStartTime: '08:00',
        plannedEndTime: '09:00',
        nightDuty: 'SLEEPING_NIGHT',
      }),
    ).toBe('NONE')
  })

  it('formats labels for the visit plan UI', () => {
    expect(formatVisitPlanNightDuty('SLEEPING_NIGHT')).toBe('Sleeping night')
    expect(formatVisitPlanNightDuty('WAKING_NIGHT')).toBe('Waking night')
    expect(formatVisitPlanNightDuty('NONE')).toBe('None')
  })

  it('fills 22:00–07:00 when current times are still same-day', () => {
    expect(
      defaultOvernightTimePatch({ plannedStartTime: '07:00', plannedEndTime: '10:00' }),
    ).toEqual({
      plannedStartTime: '22:00',
      plannedEndTime: '07:00',
      durationMinutes: 540,
    })
  })

  it('keeps an existing midnight-crossing window', () => {
    expect(
      defaultOvernightTimePatch({ plannedStartTime: '21:00', plannedEndTime: '08:00' }),
    ).toEqual({})
  })

  it('keeps a new overnight visit as a normal visit until another night type is chosen', () => {
    const night = { slotKind: 'STANDARD' as const, plannedStartTime: '20:00', plannedEndTime: '07:00' }
    expect(resolveVisitPlanNightDuty({ ...night, nightDuty: 'NONE' })).toBe('NONE')
    expect(resolveVisitPlanNightDuty({ ...night, nightDuty: 'WAKING_NIGHT' })).toBe('WAKING_NIGHT')
    expect(resolveVisitPlanNightDuty({ ...night, nightDuty: 'SLEEPING_NIGHT' })).toBe('SLEEPING_NIGHT')
    expect(
      resolveVisitPlanNightDuty({ ...night, plannedEndTime: '21:00', nightDuty: 'WAKING_NIGHT' }),
    ).toBe('NONE')
  })
})
