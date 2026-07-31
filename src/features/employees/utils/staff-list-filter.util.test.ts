import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STAFF_LIST_FILTERS,
  staffListFiltersToListParams,
  staffListFiltersToSearch,
  staffListSearchToFilters,
  defaultActiveStatusId,
} from './staff-list-filter.util'

describe('staffListSearchToFilters', () => {
  it('parses status=all and uuid status lists', () => {
    expect(staffListSearchToFilters({ status: 'all' }).allStatuses).toBe(true)
    expect(
      staffListSearchToFilters({
        status: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      }).statusIds,
    ).toHaveLength(2)
  })
})

describe('staffListFiltersToSearch', () => {
  it('omits status from url when all statuses (default)', () => {
    expect(
      staffListFiltersToSearch({
        ...DEFAULT_STAFF_LIST_FILTERS,
        allStatuses: true,
        visaTypeIds: ['british_citizen'],
      }),
    ).toEqual({ immigration: 'british_citizen' })
  })

  it('writes narrowed status ids to url', () => {
    expect(
      staffListFiltersToSearch({
        ...DEFAULT_STAFF_LIST_FILTERS,
        allStatuses: false,
        statusIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'],
      }),
    ).toEqual({ status: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' })
  })
})

describe('staffListFiltersToListParams', () => {
  it('omits status filter by default (active + inactive)', () => {
    const lookups = {
      employeeStatuses: [
        { id: 'st-active', name: 'Active' },
        { id: 'st-inactive', name: 'Inactive' },
      ],
    } as const

    const params = staffListFiltersToListParams(DEFAULT_STAFF_LIST_FILTERS, lookups as never)
    expect(params.statusId).toBeUndefined()
    expect(params.statusIds).toBeUndefined()
  })

  it('omits status filter when all statuses selected', () => {
    const params = staffListFiltersToListParams(
      { ...DEFAULT_STAFF_LIST_FILTERS, allStatuses: true },
      { employeeStatuses: [{ id: 'st-active', name: 'Active' }] } as never,
    )
    expect(params.statusIds).toBeUndefined()
    expect(params.statusId).toBeUndefined()
  })

  it('maps default active id helper', () => {
    expect(
      defaultActiveStatusId({
        employeeStatuses: [{ id: 'st-active', name: 'Active' }],
      } as never),
    ).toBe('st-active')
  })
})
