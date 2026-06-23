import { describe, expect, it } from 'vitest'
import { describeEmployeeBranchScope } from './employee-branch-scope.util'

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
