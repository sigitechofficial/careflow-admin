import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ESTIMATE_INPUT,
  buildEstimatePayload,
  buildSettingsPayload,
  estimateInputToForm,
  isValidDateRange,
  isValidEmail,
  normaliseRecipients,
  recentMonthOptions,
  resolveDateRange,
  settingsToForm,
  sortCostRows,
} from '@/features/azure-pricing/lib/azure-pricing-forms'
import { unwrapEnvelope } from '@/features/azure-pricing/api/azure-pricing.api'

// 15 Sep 2026, local time.
const TODAY = new Date(2026, 8, 15, 10, 30)

describe('date range presets', () => {
  it('this month runs from the 1st to today', () => {
    expect(resolveDateRange('this-month', TODAY)).toEqual({ from: '2026-09-01', to: '2026-09-15' })
  })

  it('last month covers the whole previous month', () => {
    expect(resolveDateRange('last-month', TODAY)).toEqual({ from: '2026-08-01', to: '2026-08-31' })
    // January → previous December, across the year boundary.
    expect(resolveDateRange('last-month', new Date(2026, 0, 10))).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    // Leap-year February.
    expect(resolveDateRange('last-month', new Date(2028, 2, 3))).toEqual({ from: '2028-02-01', to: '2028-02-29' })
  })

  it('last 30 / 90 days are inclusive of today', () => {
    expect(resolveDateRange('last-30', TODAY)).toEqual({ from: '2026-08-17', to: '2026-09-15' })
    expect(resolveDateRange('last-90', TODAY)).toEqual({ from: '2026-06-18', to: '2026-09-15' })
  })

  it('custom uses the supplied range when valid, else falls back to this month', () => {
    expect(resolveDateRange('custom', TODAY, { from: '2026-07-01', to: '2026-07-10' })).toEqual({
      from: '2026-07-01',
      to: '2026-07-10',
    })
    expect(resolveDateRange('custom', TODAY, { from: '2026-07-10', to: '2026-07-01' })).toEqual({
      from: '2026-09-01',
      to: '2026-09-15',
    })
  })

  it('validates ranges', () => {
    expect(isValidDateRange({ from: '2026-01-01', to: '2026-01-01' })).toBe(true)
    expect(isValidDateRange({ from: '2026-01-02', to: '2026-01-01' })).toBe(false)
    expect(isValidDateRange({ from: '', to: '2026-01-01' })).toBe(false)
    expect(isValidDateRange({ from: '01/01/2026', to: '2026-01-01' })).toBe(false)
  })

  it('lists recent months newest first', () => {
    const opts = recentMonthOptions(new Date(2026, 1, 20), 3).map(o => o.value)
    expect(opts).toEqual(['2026-02', '2026-01', '2025-12'])
  })
})

describe('sortCostRows', () => {
  const rows = [
    { key: 'a', label: 'Storage', cost: 5, share: 10 },
    { key: 'b', label: 'app service', cost: 20, share: 40 },
    { key: 'c', label: 'Database', cost: 25, share: 50 },
  ]
  it('sorts by cost desc and label asc (case-insensitive)', () => {
    expect(sortCostRows(rows, 'cost', 'desc').map(r => r.key)).toEqual(['c', 'b', 'a'])
    expect(sortCostRows(rows, 'label', 'asc').map(r => r.key)).toEqual(['b', 'c', 'a'])
    expect(sortCostRows(rows, 'share', 'asc').map(r => r.key)).toEqual(['a', 'b', 'c'])
  })
  it('does not mutate the input', () => {
    const copy = [...rows]
    sortCostRows(rows, 'cost', 'asc')
    expect(rows).toEqual(copy)
  })
})

describe('buildEstimatePayload', () => {
  it('round-trips the default architecture', () => {
    const result = buildEstimatePayload(estimateInputToForm(DEFAULT_ESTIMATE_INPUT))
    expect(result).toEqual({ ok: true, payload: DEFAULT_ESTIMATE_INPUT })
  })

  it('parses numeric strings and keeps booleans/SKU', () => {
    const form = {
      ...estimateInputToForm(DEFAULT_ESTIMATE_INPUT),
      apiReplicas: '3',
      apiVcpu: ' 1.5 ',
      dbSku: 'D2ds_v5' as const,
      dbHighAvailability: true,
      logGbPerDay: '2.25',
    }
    const result = buildEstimatePayload(form)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload).toMatchObject({
        apiReplicas: 3,
        apiVcpu: 1.5,
        dbSku: 'D2ds_v5',
        dbHighAvailability: true,
        logGbPerDay: 2.25,
      })
      expect(typeof result.payload.emailsPerMonth).toBe('number')
    }
  })

  it('reports empty, fractional and out-of-range values', () => {
    const result = buildEstimatePayload({
      ...estimateInputToForm(DEFAULT_ESTIMATE_INPUT),
      apiReplicas: '1.5',
      apiVcpu: '',
      dbStorageGiB: '10',
      emailsPerMonth: 'abc',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.apiReplicas).toMatch(/whole number/)
      expect(result.errors.apiVcpu).toMatch(/required/)
      expect(result.errors.dbStorageGiB).toMatch(/between 32/)
      expect(result.errors.emailsPerMonth).toMatch(/required/)
      expect(result.errors.logGbPerDay).toBeUndefined()
    }
  })

  it('rejects an unknown database SKU', () => {
    const result = buildEstimatePayload({
      ...estimateInputToForm(DEFAULT_ESTIMATE_INPUT),
      dbSku: 'P99' as never,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.dbSku).toBeDefined()
  })
})

describe('settings payload', () => {
  const base = {
    anomalyThresholdPercent: 50,
    anomalyMinDailyIncrease: 1,
    monthlyReportEnabled: true,
    monthlyReportRecipients: ['ops@careflow.co.uk'],
  }

  it('validates email addresses', () => {
    expect(isValidEmail('a@b.com')).toBe(true)
    expect(isValidEmail(' a@b.co.uk ')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('not an email')).toBe(false)
  })

  it('normalises recipients (trim, lower-case, de-dupe)', () => {
    expect(normaliseRecipients([' A@B.com', 'a@b.com', '', 'c@d.org'])).toEqual(['a@b.com', 'c@d.org'])
  })

  it('builds a PATCH body from the form', () => {
    const form = { ...settingsToForm(base), anomalyThresholdPercent: '75', anomalyMinDailyIncrease: '2.555' }
    form.monthlyReportRecipients = ['Ops@Careflow.co.uk', 'finance@careflow.co.uk']
    expect(buildSettingsPayload(form)).toEqual({
      ok: true,
      payload: {
        anomalyThresholdPercent: 75,
        anomalyMinDailyIncrease: 2.56,
        monthlyReportEnabled: true,
        monthlyReportRecipients: ['ops@careflow.co.uk', 'finance@careflow.co.uk'],
      },
    })
  })

  it('rejects bad numbers and invalid recipients', () => {
    const result = buildSettingsPayload({
      ...settingsToForm(base),
      anomalyThresholdPercent: '0',
      anomalyMinDailyIncrease: '',
      monthlyReportRecipients: ['bad@', 'ok@x.com'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.anomalyThresholdPercent).toBeDefined()
      expect(result.errors.anomalyMinDailyIncrease).toBeDefined()
      expect(result.errors.monthlyReportRecipients).toMatch(/bad@/)
    }
  })

  it('requires a whole-number threshold and caps recipients at 20', () => {
    const frac = buildSettingsPayload({ ...settingsToForm(base), anomalyThresholdPercent: '12.5' })
    expect(frac.ok).toBe(false)
    if (!frac.ok) expect(frac.errors.anomalyThresholdPercent).toMatch(/whole number/)
    const many = buildSettingsPayload({
      ...settingsToForm(base),
      monthlyReportRecipients: Array.from({ length: 21 }, (_, i) => `user${i}@careflow.co.uk`),
    })
    expect(many.ok).toBe(false)
  })

  it('requires a recipient only when the report is on', () => {
    const on = buildSettingsPayload({ ...settingsToForm(base), monthlyReportRecipients: [] })
    expect(on.ok).toBe(false)
    const off = buildSettingsPayload({ ...settingsToForm(base), monthlyReportEnabled: false, monthlyReportRecipients: [] })
    expect(off.ok).toBe(true)
  })
})

describe('unwrapEnvelope', () => {
  it('unwraps the Nest response envelope and tolerates bare bodies', () => {
    expect(unwrapEnvelope({ success: true, message: 'ok', data: { a: 1 } })).toEqual({ a: 1 })
    expect(unwrapEnvelope({ a: 1 })).toEqual({ a: 1 })
    expect(unwrapEnvelope('id,cost\n')).toBe('id,cost\n')
  })
})
