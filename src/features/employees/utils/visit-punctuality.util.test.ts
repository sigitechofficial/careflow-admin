import { describe, expect, it } from 'vitest'
import {
  classifyVisitPunctuality,
  resolveVisitPunctualityToleranceMinutes,
  visitPunctualityExportFields,
  VISIT_PUNCTUALITY_INDUSTRY_DEFAULT_MINUTES,
} from '@/features/employees/utils/visit-punctuality.util'

describe('resolveVisitPunctualityToleranceMinutes', () => {
  it('uses time-critical slot tolerance first', () => {
    expect(
      resolveVisitPunctualityToleranceMinutes({
        org: { domLateVisitAlertMinutes: 20, domGlobalToleranceMinutes: 30 },
        slot: { timeCritical: true, timeToleranceMinutes: 5 },
      }),
    ).toBe(5)
  })

  it('falls back to late-visit alert minutes when not time-critical', () => {
    expect(
      resolveVisitPunctualityToleranceMinutes({
        org: { domLateVisitAlertMinutes: 20, domGlobalToleranceMinutes: 30 },
        slot: { timeCritical: false, timeToleranceMinutes: 5 },
      }),
    ).toBe(20)
  })

  it('falls back to global tolerance then industry default', () => {
    expect(
      resolveVisitPunctualityToleranceMinutes({
        org: { domLateVisitAlertMinutes: 0, domGlobalToleranceMinutes: 25 },
      }),
    ).toBe(25)
    expect(resolveVisitPunctualityToleranceMinutes({})).toBe(
      VISIT_PUNCTUALITY_INDUSTRY_DEFAULT_MINUTES,
    )
  })
})

describe('classifyVisitPunctuality', () => {
  const planned = '2026-07-07T07:00:00.000Z'

  it('flags late when outside tolerance', () => {
    const result = classifyVisitPunctuality(planned, '2026-07-07T07:20:00.000Z', 15)
    expect(result.kind).toBe('late')
    expect(result.outcome).toBe('Late')
    expect(result.deltaMinutes).toBe(20)
    expect(result.varianceMinutes).toBe('+20')
  })

  it('flags critically late beyond 2x tolerance threshold', () => {
    const result = classifyVisitPunctuality(planned, '2026-07-07T07:50:00.000Z', 15)
    expect(result.kind).toBe('critically_late')
    expect(result.outcome).toBe('Critically late')
    expect(result.deltaMinutes).toBe(50)
  })

  it('flags early when outside tolerance', () => {
    const result = classifyVisitPunctuality(planned, '2026-07-07T06:40:00.000Z', 15)
    expect(result.kind).toBe('early')
    expect(result.outcome).toBe('Early')
    expect(result.deltaMinutes).toBe(-20)
    expect(result.varianceMinutes).toBe('-20')
  })

  it('is on time within tolerance including small early/late deltas', () => {
    expect(classifyVisitPunctuality(planned, '2026-07-07T06:57:00.000Z', 15).outcome).toBe(
      'On time',
    )
    expect(classifyVisitPunctuality(planned, '2026-07-07T07:03:00.000Z', 15).outcome).toBe(
      'On time',
    )
  })

  it('is not assessed without actual time', () => {
    const result = classifyVisitPunctuality(planned, null, 15)
    expect(result.kind).toBe('unknown')
    expect(result.outcome).toBe('Not assessed')
    expect(result.varianceMinutes).toBe('')
  })

  it('uses tighter time-critical tolerance for late detection', () => {
    const atPlus6 = classifyVisitPunctuality(planned, '2026-07-07T07:06:00.000Z', 5)
    expect(atPlus6.outcome).toBe('Late')
    const withOrg15 = classifyVisitPunctuality(planned, '2026-07-07T07:06:00.000Z', 15)
    expect(withOrg15.outcome).toBe('On time')
  })
})

describe('visitPunctualityExportFields', () => {
  it('maps stable export labels', () => {
    const start = classifyVisitPunctuality(
      '2026-07-07T07:00:00.000Z',
      '2026-07-07T07:20:00.000Z',
      15,
    )
    const end = classifyVisitPunctuality(
      '2026-07-07T08:00:00.000Z',
      '2026-07-07T07:57:00.000Z',
      15,
    )
    expect(visitPunctualityExportFields({ start, end })).toEqual({
      startOutcome: 'Late',
      startVarianceMinutes: '+20',
      endOutcome: 'On time',
      endVarianceMinutes: '-3',
      toleranceMinutes: 15,
    })
  })
})
