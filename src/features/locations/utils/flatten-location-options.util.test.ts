import { describe, expect, it } from 'vitest'
import { flattenLocationOptionsFromTree } from './flatten-location-options.util'
import type { LocationManagementTree } from '@/features/settings/location-management/location-management.types'

describe('flattenLocationOptionsFromTree', () => {
  it('returns empty for missing tree', () => {
    expect(flattenLocationOptionsFromTree(null)).toEqual([])
    expect(flattenLocationOptionsFromTree(undefined)).toEqual([])
  })

  it('dedupes location ids and prefers branch labels with zone prefix', () => {
    const tree = {
      zones: [
        {
          id: 'z1',
          name: 'North',
          locationId: 'loc-zone',
          locationName: 'North HQ',
          branches: [
            {
              id: 'b1',
              name: 'Branch A',
              locationId: 'loc-a',
              locationName: 'Alpha Site',
            },
            {
              id: 'b2',
              name: 'Branch A dup',
              locationId: 'loc-a',
              locationName: 'Should not win',
            },
          ],
        },
      ],
    } as unknown as LocationManagementTree

    const options = flattenLocationOptionsFromTree(tree)
    expect(options.map((o) => o.id).sort()).toEqual(['loc-a', 'loc-zone'])
    expect(options.find((o) => o.id === 'loc-a')?.label).toBe('North · Alpha Site')
    expect(options.find((o) => o.id === 'loc-zone')?.label).toBe('North HQ')
  })
})
