import { describe, expect, it } from 'vitest'
import type { LocationManagementTree, LocationTreeZone } from './location-management.types'
import {
  filterZonesByHierarchy,
  findZoneBranchForLocationId,
} from './location-management-hierarchy.util'

const tree = {
  zones: [
    {
      id: 'zone-london',
      name: 'London',
      locationId: null,
      branches: [
        {
          id: 'sa-croydon',
          name: 'Croydon',
          locationId: 'loc-croydon',
          areas: [
            { id: 'area-4', name: 'Croydon 4', postcodes: [], children: [] },
            { id: 'area-5', name: 'Croydon 5', postcodes: [], children: [] },
          ],
        },
        {
          id: 'sa-merton',
          name: 'Merton',
          locationId: 'loc-merton',
          areas: [],
        },
      ],
    },
  ],
} as unknown as LocationManagementTree

describe('findZoneBranchForLocationId', () => {
  it('maps a header location to zone and branch', () => {
    expect(findZoneBranchForLocationId(tree, 'loc-croydon')).toEqual({
      zoneId: 'zone-london',
      zoneName: 'London',
      branchLocationId: 'loc-croydon',
    })
  })

  it('returns null when unscoped', () => {
    expect(findZoneBranchForLocationId(tree, null)).toBeNull()
  })
})

describe('filterZonesByHierarchy', () => {
  const zones = tree.zones as LocationTreeZone[]

  it('keeps the matching branch and area', () => {
    const filtered = filterZonesByHierarchy(zones, {
      zoneId: 'zone-london',
      branchLocationId: 'loc-croydon',
      areaId: 'area-4',
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.branches).toHaveLength(1)
    expect(filtered[0]?.branches[0]?.areas.map(a => a.id)).toEqual(['area-4'])
  })

  it('returns all zones when filters are empty', () => {
    expect(
      filterZonesByHierarchy(zones, { zoneId: '', branchLocationId: '', areaId: '' }),
    ).toHaveLength(1)
  })
})
