import { describe, expect, it } from 'vitest'
import type { CarePlanPublishedVersionSummary } from '@/features/service-users/care-plans/types'
import {
  careHistoryIsIndependentOfDraft,
  mapCarePlanVersionsToHistory,
  resolveCarePlanHistoryStatus,
} from '@/features/service-users/care-plan/care-plan-history.util'

function version(
  partial: Partial<CarePlanPublishedVersionSummary> &
    Pick<CarePlanPublishedVersionSummary, 'id' | 'versionNumber' | 'publishedAt'>,
): CarePlanPublishedVersionSummary {
  return {
    summary: null,
    publishedById: null,
    supersededAt: null,
    isCurrent: false,
    ...partial,
  }
}

describe('mapCarePlanVersionsToHistory', () => {
  it('maps published versions to Care History display rows', () => {
    const rows = mapCarePlanVersionsToHistory([
      version({
        id: 'v2',
        versionNumber: 2,
        publishedAt: '2026-08-25T14:00:00.000Z',
        publishedById: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        isCurrent: true,
        summary: 'Review complete',
      }),
      version({
        id: 'v1',
        versionNumber: 1,
        publishedAt: '2026-08-01T10:00:00.000Z',
        publishedById: 'user-1',
        isCurrent: false,
        supersededAt: '2026-08-25T14:00:00.000Z',
      }),
    ])

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      id: 'v2',
      versionLabel: 'Version 2',
      versionNumber: 2,
      status: 'Current',
      kind: 'care_plan_version',
      summary: 'Review complete',
    })
    expect(rows[0].publishedAtLabel).not.toBe('—')
    expect(rows[0].publishedByLabel).toContain('Staff')
    expect(rows[1]).toMatchObject({
      id: 'v1',
      versionLabel: 'Version 1',
      status: 'Superseded',
    })
  })

  it('returns empty list for empty versions (empty state)', () => {
    expect(mapCarePlanVersionsToHistory([])).toEqual([])
  })

  it('sorts by version number descending', () => {
    const rows = mapCarePlanVersionsToHistory([
      version({ id: 'a', versionNumber: 1, publishedAt: '2026-01-01T00:00:00.000Z', isCurrent: false }),
      version({ id: 'c', versionNumber: 3, publishedAt: '2026-03-01T00:00:00.000Z', isCurrent: true }),
      version({ id: 'b', versionNumber: 2, publishedAt: '2026-02-01T00:00:00.000Z', isCurrent: false }),
    ])
    expect(rows.map((r) => r.versionNumber)).toEqual([3, 2, 1])
  })
})

describe('resolveCarePlanHistoryStatus', () => {
  it('marks current vs superseded', () => {
    expect(resolveCarePlanHistoryStatus({ isCurrent: true, supersededAt: null })).toBe('Current')
    expect(
      resolveCarePlanHistoryStatus({ isCurrent: false, supersededAt: '2026-08-01T00:00:00.000Z' }),
    ).toBe('Superseded')
  })
})

describe('careHistoryIsIndependentOfDraft', () => {
  it('does not depend on care plan draft values', () => {
    expect(careHistoryIsIndependentOfDraft({})).toBe(true)
    expect(
      careHistoryIsIndependentOfDraft({
        '__meta.riskItems': '[]',
        'clinical.field': 'x',
      }),
    ).toBe(true)
  })
})
