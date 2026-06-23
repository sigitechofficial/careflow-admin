import { describe, expect, it } from 'vitest'
import { buildScheduleJobsSearch, parseCommaSeparatedFilterIds } from '@/features/scheduling/utils/schedule-jobs-url-state.util'

describe('schedule-jobs-url-state.util', () => {
  it('parses comma-separated filter ids', () => {
    expect(parseCommaSeparatedFilterIds('a, b ,c')).toEqual(['a', 'b', 'c'])
    expect(parseCommaSeparatedFilterIds('')).toEqual([])
  })

  it('builds search with only non-default params', () => {
    expect(
      buildScheduleJobsSearch({
        date: '2026-06-23',
        locationIds: ['loc-1'],
        serviceUserIds: [],
        requiredCarersFilters: [],
        jobOperationalFilters: ['unassigned'],
        layout: 'runs',
        rowAxis: 'service-users',
      }),
    ).toEqual({
      date: '2026-06-23',
      locationId: 'loc-1',
      op: 'unassigned',
      layout: 'runs',
      rowAxis: 'service-users',
    })
  })
})
