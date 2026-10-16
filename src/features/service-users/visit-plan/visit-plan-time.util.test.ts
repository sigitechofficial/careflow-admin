import { describe, expect, it } from 'vitest'
import {
  addMinutesToTime,
  durationKeepingEndTime,
  visitDurationMinutes,
  visitPlanEndTimeFromStartAndDuration,
} from '@/features/service-users/visit-plan/visit-plan-time.util'

describe('addMinutesToTime', () => {
  it('adds minutes within the same day', () => {
    expect(addMinutesToTime('07:30', 90)).toBe('09:00')
  })

  it('wraps past midnight', () => {
    expect(addMinutesToTime('23:00', 120)).toBe('01:00')
  })
})

describe('visitPlanEndTimeFromStartAndDuration', () => {
  it('derives end time from start and duration', () => {
    expect(visitPlanEndTimeFromStartAndDuration('08:00', 45)).toBe('08:45')
  })

  it('returns null when duration is missing', () => {
    expect(visitPlanEndTimeFromStartAndDuration('08:00', null)).toBeNull()
  })
})

describe('visitDurationMinutes round-trip', () => {
  it('matches addMinutesToTime for same-day visits', () => {
    const end = visitPlanEndTimeFromStartAndDuration('07:30', 90)
    expect(end).toBe('09:00')
    expect(visitDurationMinutes('07:30', end!)).toBe(90)
  })
})

describe('durationKeepingEndTime', () => {
  it('keeps a night visit ending at 07:00 when the start moves from 20:00 to 22:00', () => {
    expect(durationKeepingEndTime('22:00', '07:00', 720)).toBe(540)
  })

  it('works for a same-day visit', () => {
    expect(durationKeepingEndTime('09:15', '10:00', 720)).toBe(45)
  })

  it('returns null when the new length would be over the limit, so the duration is kept', () => {
    expect(durationKeepingEndTime('18:00', '07:00', 720)).toBeNull()
    expect(durationKeepingEndTime('07:00', '07:00', 720)).toBeNull()
  })
})
