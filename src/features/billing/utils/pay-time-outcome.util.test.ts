import { describe, expect, it } from 'vitest'

import { attendancePayNotice, attendancePayResults, payTimeEditNotice, type PayTimeEdit } from './pay-time-outcome.util'

const edit = (over: Partial<PayTimeEdit> = {}): PayTimeEdit => ({
  outcome: 'PAY_TIME_CHANGED',
  message: 'Payable time changed to 09:01–09:45 (44 min).',
  rule: null,
  reason: null,
  requested: { start: null, end: '2026-11-03T09:45:00.000Z' },
  effective: { start: '2026-11-03T09:01:00.000Z', end: '2026-11-03T09:45:00.000Z', payableMinutes: 44 },
  ...over,
})
const result = (outcome: string, message: string, visitRef = 'VIS-1') => ({
  reconciliationId: 'r-1',
  visitRef,
  outcome,
  message,
  payableBefore: '14',
  payableAfter: '14',
})

describe('what an edit of payable time is reported as (Sprint B4E)', () => {
  it('only a change to the payable time is a success', () => {
    expect(payTimeEditNotice(edit())).toEqual({
      variant: 'success',
      title: 'Payable time changed',
      description: 'Payable time changed to 09:01–09:45 (44 min).',
    })
  })

  it('an edit a pay rule did not let take effect is a warning that names the rule and the payable time in force', () => {
    const notApplied = edit({
      outcome: 'PAY_TIME_NOT_APPLIED',
      rule: 'DURATION_TOLERANCE',
      reason: 'The visit is within the duration tolerance of 20 minutes, so it is paid its planned time.',
      message: 'Payable time not changed. The visit is within the duration tolerance of 20 minutes, so it is paid its planned time. It stays 09:00–10:00 (60 min).',
    })
    const notice = payTimeEditNotice(notApplied)
    expect(notice).toMatchObject({ variant: 'warning', title: 'Payable time not changed' })
    expect(notice?.description).toMatch(/within the duration tolerance of 20 minutes.*It stays 09:00–10:00 \(60 min\)/)
    expect(notice?.title).not.toMatch(/updated|changed to/i)
  })

  it('an edit to the time already in force is neither a success nor a warning', () => {
    expect(payTimeEditNotice(edit({ outcome: 'PAY_TIME_UNCHANGED', message: 'Payable time is already 09:00–10:00 (60 min): nothing changed.' }))).toEqual({
      variant: 'default',
      title: 'Payable time unchanged',
      description: 'Payable time is already 09:00–10:00 (60 min): nothing changed.',
    })
  })

  it('a response with no payable-time edit (for example a mileage change) has no notice of its own', () => {
    expect(payTimeEditNotice(undefined)).toBeNull()
  })
})

describe('what an office-verified attendance time is reported as (Sprint B4E)', () => {
  const envelope = (pay: unknown[]) => ({ success: true, message: 'Request successful', data: { eventId: 'e-1', pay } })

  it('reads the pay results wherever the envelope puts them', () => {
    expect(attendancePayResults(envelope([result('REPRICED', 'x')]))).toHaveLength(1)
    expect(attendancePayResults({ pay: [result('REPRICED', 'x')] })).toHaveLength(1)
    expect(attendancePayResults(null)).toEqual([])
  })

  it('times recorded and pay recalculated', () => {
    expect(attendancePayNotice(envelope([result('REPRICED', 'Times updated and carer pay recalculated.')]))).toEqual({
      variant: 'success',
      title: 'Attendance recorded; carer pay recalculated',
      description: 'Times updated and carer pay recalculated.',
    })
  })

  it('times recorded but pay unchanged: says so, with the reason and the payable time, and is not a success', () => {
    const message =
      'Times updated. Carer pay is unchanged: The visit is within the duration tolerance of 20 minutes, so it is paid its planned time. Payable time stays 09:00–10:00 (60 min).'
    const notice = attendancePayNotice(envelope([result('PAY_UNCHANGED', message)]))
    expect(notice).toEqual({ variant: 'default', title: 'Attendance recorded; carer pay unchanged', description: message })
  })

  it('settled pay: a correction awaiting approval, or a reason to check by hand', () => {
    expect(attendancePayNotice(envelope([result('CORRECTION_RECORDED', 'Pay correction of -£7.00 recorded.')])).title).toBe(
      'Attendance recorded; a pay correction awaits approval',
    )
    const mixed = attendancePayNotice(
      envelope([result('REPRICED', 'Times updated and carer pay recalculated.', 'VIS-1'), result('REVIEW_NEEDED', 'Record a pay correction by hand.', 'VIS-2')]),
    )
    expect(mixed).toMatchObject({ variant: 'warning', title: 'Attendance recorded; check carer pay' })
    expect(mixed.description).toBe('VIS-1: Times updated and carer pay recalculated. VIS-2: Record a pay correction by hand.')
  })

  it('a visit that is not completed yet has no pay results: the time is simply recorded', () => {
    expect(attendancePayNotice(envelope([]))).toEqual({ variant: 'success', title: 'Manual attendance recorded' })
  })
})
