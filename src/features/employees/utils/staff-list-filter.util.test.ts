import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STAFF_LIST_FILTERS,
  clearStaffListFilterChip,
  countActiveStaffListFilters,
  countStaffListFiltersInGroup,
  describeStaffListFilterChips,
  hasStaffListFilters,
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

describe('describeStaffListFilterChips / clearStaffListFilterChip', () => {
  it('groups multi-selects into one chip per field', () => {
    const chips = describeStaffListFilterChips(
      {
        ...DEFAULT_STAFF_LIST_FILTERS,
        locationIds: ['b1', 'b2', 'b3'],
        roleIds: ['r1'],
        inCountry: 'in',
        compliance: 'needs_attention',
      },
      {
        locations: [
          { id: 'b1', name: 'Croydon' },
          { id: 'b2', name: 'Croydon 3' },
          { id: 'b3', name: 'Sutton' },
        ],
        roles: [{ id: 'r1', name: 'Carer' }],
      } as never,
    )
    expect(chips.map((chip) => chip.label)).toEqual([
      'Branch: Croydon, Croydon 3 +1',
      'Role: Carer',
      'In country',
      'Compliance: needs attention',
    ])
  })

  it('omits header-controlled location chips', () => {
    const chips = describeStaffListFilterChips(
      { ...DEFAULT_STAFF_LIST_FILTERS, locationIds: ['b1'], roleIds: ['r1'] },
      null,
      undefined,
      { omitLocation: true },
    )
    expect(chips.map((chip) => chip.key)).toEqual(['roleIds'])
  })

  it('clears a chip without dropping unrelated filters', () => {
    const next = clearStaffListFilterChip(
      {
        ...DEFAULT_STAFF_LIST_FILTERS,
        roleIds: ['r1'],
        compliance: 'up_to_date',
      },
      'roleIds',
    )
    expect(next.roleIds).toEqual([])
    expect(next.compliance).toBe('up_to_date')
  })
})

describe('countActiveStaffListFilters', () => {
  it('counts grouped chips and excludes search', () => {
    const filters = {
      ...DEFAULT_STAFF_LIST_FILTERS,
      search: 'zeeshan',
      roleIds: ['r1'],
      jobTitleIds: ['j1'],
      inCountry: 'out' as const,
    }
    expect(countActiveStaffListFilters(filters)).toBe(3)
    expect(countStaffListFiltersInGroup(filters, 'job')).toBe(2)
    expect(countStaffListFiltersInGroup(filters, 'immigration')).toBe(1)
    expect(countStaffListFiltersInGroup(filters, 'organisation')).toBe(0)
    expect(hasStaffListFilters(filters)).toBe(true)
    expect(hasStaffListFilters(DEFAULT_STAFF_LIST_FILTERS)).toBe(false)
    expect(hasStaffListFilters({ ...DEFAULT_STAFF_LIST_FILTERS, search: 'a' })).toBe(true)
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
