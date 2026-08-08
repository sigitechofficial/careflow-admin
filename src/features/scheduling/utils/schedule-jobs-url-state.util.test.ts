import { describe, expect, it } from 'vitest'
import {
  buildScheduleJobsSearch,
  buildScheduleSharedFilterSearch,
  parseCommaSeparatedFilterIds,
} from '@/features/scheduling/utils/schedule-jobs-url-state.util'

describe('schedule-jobs-url-state.util', () => {
  it('parses comma-separated filter ids', () => {
    expect(parseCommaSeparatedFilterIds('a, b ,c')).toEqual(['a', 'b', 'c'])
    expect(parseCommaSeparatedFilterIds('')).toEqual([])
  })

  it('builds shared search with ECM period params', () => {
    expect(
      buildScheduleSharedFilterSearch({
        period: { preset: 'last_14_days', dateFrom: '2026-07-26', dateTo: '2026-08-08' },
        date: '2026-08-08',
        locationIds: ['loc-1'],
        serviceUserIds: [],
        employeeIds: ['e-1'],
        requiredCarersFilters: ['2'],
      }),
    ).toEqual({
      period: 'last_14_days',
      date: '2026-08-08',
      locationId: 'loc-1',
      employeeId: 'e-1',
      requiredCarers: '2',
    })
  })

  it('serializes custom period with from/to', () => {
    expect(
      buildScheduleSharedFilterSearch({
        period: { preset: 'custom', dateFrom: '2026-08-01', dateTo: '2026-08-07' },
        date: '2026-08-03',
        locationIds: [],
        serviceUserIds: [],
        requiredCarersFilters: [],
      }),
    ).toEqual({
      period: 'custom',
      from: '2026-08-01',
      to: '2026-08-07',
      date: '2026-08-03',
    })
  })

  it('builds search with only non-default params', () => {
    expect(
      buildScheduleJobsSearch({
        period: { preset: 'custom', dateFrom: '2026-06-23', dateTo: '2026-06-23' },
        date: '2026-06-23',
        locationIds: ['loc-1'],
        serviceUserIds: [],
        employeeIds: ['e-1', 'e-2'],
        requiredCarersFilters: [],
        jobOperationalFilters: ['unassigned'],
        layout: 'runs',
        rowAxis: 'service-users',
      }),
    ).toEqual({
      period: 'custom',
      from: '2026-06-23',
      to: '2026-06-23',
      date: '2026-06-23',
      locationId: 'loc-1',
      employeeId: 'e-1,e-2',
      op: 'unassigned',
      layout: 'runs',
      rowAxis: 'service-users',
    })
  })
})
