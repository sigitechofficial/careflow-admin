import { describe, expect, it } from 'vitest'
import {
  collectJobServiceUserLocationIds,
  describeEmployeeBranchScope,
  employeeListRowMatchesBranches,
  filterEmployeesByBranchLocations,
} from './employee-branch-scope.util'

describe('describeEmployeeBranchScope', () => {
  const locationNames = new Map([
    ['loc-a', 'Croydon - Croydon 1'],
    ['loc-b', 'Croydon - Croydon 2'],
    ['loc-t', 'Transport - Croydon Transport'],
  ])

  it('classifies all-zones staff', () => {
    expect(
      describeEmployeeBranchScope(
        {
          locationId: 'loc-a',
          location: { id: 'loc-a', name: 'Croydon - Croydon 1' },
          baseLocationIds: [],
          accessAllZones: true,
        },
        locationNames,
      ),
    ).toEqual({
      kind: 'all-zones',
      summary: 'All zones — can work at every branch',
      branches: [],
    })
  })

  it('classifies single-branch staff', () => {
    const result = describeEmployeeBranchScope(
      {
        locationId: 'loc-t',
        location: { id: 'loc-t', name: 'Transport - Croydon Transport' },
        baseLocationIds: [],
        accessAllZones: false,
      },
      locationNames,
    )
    expect(result.kind).toBe('single')
    expect(result.branches).toHaveLength(1)
  })

  it('classifies multi-branch staff', () => {
    const result = describeEmployeeBranchScope(
      {
        locationId: 'loc-a',
        location: { id: 'loc-a', name: 'Croydon - Croydon 1' },
        baseLocationIds: ['loc-b'],
        accessAllZones: false,
      },
      locationNames,
    )
    expect(result.kind).toBe('multiple')
    expect(result.summary).toBe('Multiple branches (2)')
    expect(result.branches).toHaveLength(2)
  })
})

describe('employeeListRowMatchesBranches', () => {
  it('matches all-zones, primary, and floor locations', () => {
    expect(
      employeeListRowMatchesBranches(
        { accessAllZones: true, locationId: 'loc-x', baseLocationIds: [] },
        ['loc-a'],
      ),
    ).toBe(true)
    expect(
      employeeListRowMatchesBranches(
        { accessAllZones: false, locationId: 'loc-a', baseLocationIds: [] },
        ['loc-a'],
      ),
    ).toBe(true)
    expect(
      employeeListRowMatchesBranches(
        { accessAllZones: false, locationId: 'loc-x', baseLocationIds: ['loc-a'] },
        ['loc-a'],
      ),
    ).toBe(true)
    expect(
      employeeListRowMatchesBranches(
        { accessAllZones: false, locationId: 'loc-x', baseLocationIds: ['loc-y'] },
        ['loc-a'],
      ),
    ).toBe(false)
  })

  it('returns all employees when no location filter', () => {
    const rows = [
      { id: '1', accessAllZones: false, locationId: 'loc-a', baseLocationIds: [] as string[] },
      { id: '2', accessAllZones: false, locationId: 'loc-b', baseLocationIds: [] as string[] },
    ]
    expect(filterEmployeesByBranchLocations(rows, [])).toHaveLength(2)
  })
})

describe('collectJobServiceUserLocationIds', () => {
  it('dedupes service user location ids from jobs', () => {
    expect(
      collectJobServiceUserLocationIds([
        { serviceUser: { locationId: 'loc-a' } },
        { serviceUser: { locationId: 'loc-a' } },
        { serviceUser: { locationId: 'loc-b' } },
        { serviceUser: { locationId: null } },
        null,
      ]),
    ).toEqual(['loc-a', 'loc-b'])
  })
})
