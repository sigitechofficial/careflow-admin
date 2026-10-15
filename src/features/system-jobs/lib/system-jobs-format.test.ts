import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/api-client'
import { formatDurationMs } from '@/shared/lib/time-format'
import {
  countJobs,
  describeNextExpected,
  describeRunOutcome,
  filterJobs,
  formatInterval,
  formatSuccessRate,
  formatSummaryJson,
  formatUpdatedAgo,
  healthMeta,
  isRateLimitError,
  isTimeoutError,
  normalizeSuccessRate,
  runNowAvailability,
  runNowWarning,
  runStatusMeta,
  serverClockOffsetMs,
  sourceLabel,
  successRateTone,
  triggerLabel,
} from '@/features/system-jobs/lib/system-jobs-format'
import { validateSystemJobsSearch } from '@/features/system-jobs/types'

describe('health badge mapping', () => {
  it('maps every API health to a label, badge variant and explanation', () => {
    expect(healthMeta('ok')).toMatchObject({ label: 'Healthy', variant: 'success' })
    expect(healthMeta('running')).toMatchObject({ label: 'Running', variant: 'info' })
    expect(healthMeta('late')).toMatchObject({ label: 'Late', variant: 'warning' })
    expect(healthMeta('failing')).toMatchObject({ label: 'Failing', variant: 'destructive' })
    expect(healthMeta('never-run')).toMatchObject({ label: 'Never run', variant: 'muted' })
    for (const h of ['ok', 'running', 'late', 'failing', 'never-run']) {
      expect(healthMeta(h).explanation.length).toBeGreaterThan(10)
    }
  })

  it('falls back safely for unknown values', () => {
    expect(healthMeta('paused')).toMatchObject({ health: 'unknown', label: 'paused', variant: 'outline' })
    expect(healthMeta(undefined).label).toBe('Unknown')
  })

  it('labels run statuses, triggers and sources', () => {
    expect(runStatusMeta('success').variant).toBe('success')
    expect(runStatusMeta('failed').variant).toBe('destructive')
    expect(runStatusMeta('skipped').label).toBe('Skipped')
    expect(runStatusMeta('weird').label).toBe('weird')
    expect(triggerLabel('function')).toBe('Azure Function')
    expect(triggerLabel('container-job')).toBe('Container Job')
    expect(sourceLabel('internal')).toBe('API scheduler')
    expect(sourceLabel('manual')).toBe('Manual')
    expect(sourceLabel(null)).toBe('—')
  })
})

describe('counts and filters', () => {
  const jobs = [
    { name: 'a', health: 'ok' },
    { name: 'b', health: 'running' },
    { name: 'c', health: 'late' },
    { name: 'd', health: 'failing' },
    { name: 'e', health: 'failing' },
    { name: 'f', health: 'never-run' },
  ]

  it('counts healthy (ok + running), late, failing and never-run', () => {
    expect(countJobs(jobs)).toEqual({ total: 6, healthy: 2, late: 1, failing: 2, neverRun: 1, running: 1 })
    expect(countJobs([])).toEqual({ total: 0, healthy: 0, late: 0, failing: 0, neverRun: 0, running: 0 })
  })

  it('filters by summary card', () => {
    expect(filterJobs(jobs, 'all').map(j => j.name)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    expect(filterJobs(jobs, 'healthy').map(j => j.name)).toEqual(['a', 'b'])
    expect(filterJobs(jobs, 'late').map(j => j.name)).toEqual(['c'])
    expect(filterJobs(jobs, 'failing').map(j => j.name)).toEqual(['d', 'e'])
  })

  it('validates the URL search params', () => {
    expect(validateSystemJobsSearch({ job: 'rolling-rota', health: 'late' })).toEqual({
      job: 'rolling-rota',
      health: 'late',
    })
    expect(validateSystemJobsSearch({ job: '../etc', health: 'nope' })).toEqual({ job: undefined, health: undefined })
    expect(validateSystemJobsSearch({ health: 'all' })).toEqual({ job: undefined, health: undefined })
  })
})

describe('success rate', () => {
  it('accepts fractions and percentages, disambiguated by the run counts', () => {
    expect(normalizeSuccessRate(0.985)).toBeCloseTo(98.5)
    expect(normalizeSuccessRate(98.5)).toBe(98.5)
    expect(normalizeSuccessRate(1, 100, 0)).toBe(100)
    expect(normalizeSuccessRate(1, 100, 99)).toBe(1)
    expect(normalizeSuccessRate(null, 10, 1)).toBe(90)
    expect(normalizeSuccessRate(null, 0, 0)).toBeNull()
    expect(normalizeSuccessRate(undefined)).toBeNull()
  })

  it('formats and tones the rate', () => {
    expect(formatSuccessRate(null)).toBe('—')
    expect(formatSuccessRate(100)).toBe('100%')
    expect(formatSuccessRate(98.46)).toBe('98.5%')
    expect(successRateTone(100)).toBe('good')
    expect(successRateTone(95)).toBe('mixed')
    expect(successRateTone(50)).toBe('bad')
    expect(successRateTone(null)).toBe('none')
  })
})

describe('times', () => {
  const now = new Date('2026-10-02T12:00:00Z')

  it('describes the next expected run, flagging overdue ones after a minute of grace', () => {
    expect(describeNextExpected('2026-10-02T12:04:00Z', now)).toEqual({ text: 'in 4 minutes', overdue: false })
    expect(describeNextExpected('2026-10-02T11:59:30Z', now)).toEqual({ text: 'due now', overdue: false })
    expect(describeNextExpected('2026-10-02T11:50:00Z', now)).toEqual({
      text: 'overdue (10 minutes ago)',
      overdue: true,
    })
    expect(describeNextExpected(null, now)).toEqual({ text: '—', overdue: false })
    expect(describeNextExpected('garbage', now)).toEqual({ text: '—', overdue: false })
  })

  it('formats intervals', () => {
    expect(formatInterval(1)).toBe('every minute')
    expect(formatInterval(5)).toBe('every 5 minutes')
    expect(formatInterval(60)).toBe('hourly')
    expect(formatInterval(120)).toBe('every 2 hours')
    expect(formatInterval(1440)).toBe('daily')
    expect(formatInterval(90)).toBe('every 90 minutes')
    expect(formatInterval(0)).toBe('—')
  })

  it('computes the server clock offset', () => {
    expect(serverClockOffsetMs('2026-10-02T12:00:10Z', Date.parse('2026-10-02T12:00:00Z'))).toBe(10_000)
    expect(serverClockOffsetMs(null, 123)).toBe(0)
    expect(serverClockOffsetMs('nope', 123)).toBe(0)
  })

  it('formats "updated … ago"', () => {
    const t = Date.parse('2026-10-02T12:00:00Z')
    expect(formatUpdatedAgo(0, t)).toBe('not yet')
    expect(formatUpdatedAgo(t - 2_000, t)).toBe('just now')
    expect(formatUpdatedAgo(t - 12_000, t)).toBe('12 s ago')
    expect(formatUpdatedAgo(t - 65_000, t)).toBe('1 min ago')
    expect(formatUpdatedAgo(t - 180_000, t)).toBe('3 min ago')
  })
})

describe('summary JSON', () => {
  it('pretty-prints objects and JSON strings, keeps plain text', () => {
    expect(formatSummaryJson({ created: 3, skipped: 1 })).toBe('{\n  "created": 3,\n  "skipped": 1\n}')
    expect(formatSummaryJson('{"a":1}')).toBe('{\n  "a": 1\n}')
    expect(formatSummaryJson('no active visit plans')).toBe('no active visit plans')
    expect(formatSummaryJson(null)).toBeNull()
    expect(formatSummaryJson('  ')).toBeNull()
  })
})

describe('run now', () => {
  it('warns only for the rolling rota', () => {
    expect(runNowWarning('rolling-rota')).toBe(
      'Generates rota for the whole rolling window; existing visits are skipped.',
    )
    expect(runNowWarning('late-visit-alert')).toBeNull()
    expect(runNowWarning(null)).toBeNull()
  })

  it('hides the button without manage and disables it while a run is in flight or in progress', () => {
    const idle = { health: 'ok', lastRun: null }
    expect(runNowAvailability(idle, { canManage: false, pending: false }).visible).toBe(false)
    expect(runNowAvailability(idle, { canManage: true, pending: false })).toEqual({
      visible: true,
      disabled: false,
      reason: null,
    })
    expect(runNowAvailability(idle, { canManage: true, pending: true }).disabled).toBe(true)
    expect(runNowAvailability({ health: 'running', lastRun: null }, { canManage: true, pending: false })).toMatchObject({
      disabled: true,
      reason: 'A run is already in progress.',
    })
  })

  it('recognises rate-limit and timeout errors', () => {
    expect(isRateLimitError(new ApiError('Too many requests', 429))).toBe(true)
    expect(isRateLimitError(new ApiError('Bad', 400))).toBe(false)
    expect(isRateLimitError(new Error('x'))).toBe(false)
    expect(isTimeoutError(new DOMException('timed out', 'TimeoutError'))).toBe(true)
    expect(isTimeoutError(new Error('x'))).toBe(false)
  })

  it('describes the run outcome for the toast', () => {
    expect(describeRunOutcome('Rolling rota', { status: 'success', durationMs: 65_000 }, formatDurationMs)).toEqual({
      tone: 'success',
      title: 'Rolling rota finished',
      description: 'Took 1m 05s.',
    })
    expect(describeRunOutcome('X', { status: 'failed', error: 'boom', durationMs: 5 }, formatDurationMs)).toEqual({
      tone: 'error',
      title: 'X failed',
      description: 'boom',
    })
    expect(describeRunOutcome('X', { status: 'running' }, formatDurationMs).tone).toBe('info')
    expect(describeRunOutcome('X', { status: 'skipped' }, formatDurationMs).title).toBe('X skipped')
    expect(describeRunOutcome('X', null, formatDurationMs).title).toBe('X triggered')
  })
})
