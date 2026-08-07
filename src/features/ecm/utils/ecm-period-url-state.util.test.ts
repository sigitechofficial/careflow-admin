import { describe, expect, it } from 'vitest'
import {
  buildEcmPeriodSearch,
  ecmPeriodSearchHasExplicitPeriod,
  ecmPeriodUrlMatches,
  parseEcmPeriodPreset,
  resolveEcmPeriodFromSearch,
  shouldUpdateEcmPeriodSearch,
  validateEcmPeriodSearch,
} from './ecm-period-url-state.util'

const TODAY = '2026-08-07'

describe('validateEcmPeriodSearch', () => {
  it('keeps valid period/from/to and drops junk', () => {
    expect(
      validateEcmPeriodSearch({
        period: 'last_14_days',
        from: 'not-a-date',
        to: '2026-08-01',
        date: '2026-07-01',
        other: 'x',
      }),
    ).toEqual({
      period: 'last_14_days',
      to: '2026-08-01',
      date: '2026-07-01',
    })
  })

  it('rejects unknown presets', () => {
    expect(validateEcmPeriodSearch({ period: 'next_week' })).toEqual({})
  })
})

describe('resolveEcmPeriodFromSearch', () => {
  it('re-resolves named presets against London today', () => {
    expect(resolveEcmPeriodFromSearch({ period: 'last_14_days' }, null, 'today', TODAY)).toEqual({
      preset: 'last_14_days',
      dateFrom: '2026-07-25',
      dateTo: '2026-08-07',
    })
  })

  it('uses absolute custom from/to', () => {
    expect(
      resolveEcmPeriodFromSearch(
        { period: 'custom', from: '2026-08-01', to: '2026-08-03' },
        null,
        'today',
        TODAY,
      ),
    ).toEqual({
      preset: 'custom',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-03',
    })
  })

  it('orders inverted custom ranges', () => {
    expect(
      resolveEcmPeriodFromSearch(
        { period: 'custom', from: '2026-08-10', to: '2026-08-01' },
        null,
        'today',
        TODAY,
      ),
    ).toEqual({
      preset: 'custom',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-10',
    })
  })

  it('maps legacy date to single-day custom', () => {
    expect(resolveEcmPeriodFromSearch({ date: '2026-08-05' }, null, 'today', TODAY)).toEqual({
      preset: 'custom',
      dateFrom: '2026-08-05',
      dateTo: '2026-08-05',
    })
  })

  it('prefers fallback then default when URL is empty', () => {
    expect(
      resolveEcmPeriodFromSearch(
        {},
        { preset: 'yesterday', dateFrom: '2026-08-06', dateTo: '2026-08-06' },
        'today',
        TODAY,
      ),
    ).toEqual({
      preset: 'yesterday',
      dateFrom: '2026-08-06',
      dateTo: '2026-08-06',
    })

    expect(resolveEcmPeriodFromSearch({}, null, 'this_week', TODAY)).toEqual({
      preset: 'this_week',
      dateFrom: '2026-08-03',
      dateTo: '2026-08-09',
    })
  })
})

describe('buildEcmPeriodSearch', () => {
  it('serializes named presets without from/to', () => {
    expect(
      buildEcmPeriodSearch({
        preset: 'month_to_date',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-07',
      }),
    ).toEqual({ period: 'month_to_date' })
  })

  it('serializes custom with from/to', () => {
    expect(
      buildEcmPeriodSearch({
        preset: 'custom',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-03',
      }),
    ).toEqual({
      period: 'custom',
      from: '2026-08-01',
      to: '2026-08-03',
    })
  })
})

describe('ecmPeriodUrlMatches / shouldUpdateEcmPeriodSearch', () => {
  it('detects explicit period signals', () => {
    expect(ecmPeriodSearchHasExplicitPeriod({})).toBe(false)
    expect(ecmPeriodSearchHasExplicitPeriod({ period: 'today' })).toBe(true)
    expect(ecmPeriodSearchHasExplicitPeriod({ date: '2026-08-07' })).toBe(true)
  })

  it('requires clearing legacy date before match', () => {
    const desired = { period: 'custom', from: '2026-08-07', to: '2026-08-07' }
    expect(
      ecmPeriodUrlMatches({ period: 'custom', from: '2026-08-07', to: '2026-08-07', date: '2026-08-07' }, desired),
    ).toBe(false)
    expect(ecmPeriodUrlMatches(desired, desired)).toBe(true)
    expect(
      shouldUpdateEcmPeriodSearch(
        { period: 'custom', from: '2026-08-07', to: '2026-08-07', date: '2026-08-07' },
        desired,
      ),
    ).toBe(true)
  })

  it('is idempotent for named preset refresh (no rewrite when URL already clean)', () => {
    const desired = buildEcmPeriodSearch({
      preset: 'this_week',
      dateFrom: '2026-08-03',
      dateTo: '2026-08-09',
    })
    expect(desired).toEqual({ period: 'this_week' })
    expect(shouldUpdateEcmPeriodSearch({ period: 'this_week' }, desired)).toBe(false)
    expect(ecmPeriodUrlMatches({ period: 'this_week' }, desired)).toBe(true)
  })

  it('rewrites once when named preset still has leftover from/to', () => {
    const desired = { period: 'last_14_days' as const }
    expect(
      shouldUpdateEcmPeriodSearch(
        { period: 'last_14_days', from: '2026-07-01', to: '2026-07-14' },
        desired,
      ),
    ).toBe(true)
    expect(shouldUpdateEcmPeriodSearch(desired, desired)).toBe(false)
  })

  it('is idempotent for custom from/to refresh', () => {
    const desired = {
      period: 'custom',
      from: '2026-08-01',
      to: '2026-08-03',
    }
    expect(shouldUpdateEcmPeriodSearch(desired, desired)).toBe(false)
    expect(
      shouldUpdateEcmPeriodSearch({ period: 'custom', from: '2026-08-01', to: '2026-08-02' }, desired),
    ).toBe(true)
  })

  it('parses known presets only', () => {
    expect(parseEcmPeriodPreset('today')).toBe('today')
    expect(parseEcmPeriodPreset('nope')).toBeNull()
  })
})
