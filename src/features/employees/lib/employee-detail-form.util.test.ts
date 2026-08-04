import { describe, expect, it } from 'vitest'
import { resolveOtherBranchLocationIds } from '@/features/employees/lib/employee-detail-form.util'

describe('resolveOtherBranchLocationIds', () => {
  it('reads floorLocations from employee GET payload', () => {
    expect(
      resolveOtherBranchLocationIds({
        locationId: 'primary',
        location: { id: 'primary', name: 'Primary' },
        floorLocations: [
          { locationId: 'other-a', location: { id: 'other-a', name: 'A' } },
          { location: { id: 'other-b', name: 'B' } },
        ],
      }),
    ).toEqual(['other-a', 'other-b'])
  })

  it('excludes primary branch even if present in floorLocations', () => {
    expect(
      resolveOtherBranchLocationIds({
        locationId: 'primary',
        floorLocations: [
          { locationId: 'primary', location: { id: 'primary', name: 'Primary' } },
          { locationId: 'other-a', location: { id: 'other-a', name: 'A' } },
        ],
      }),
    ).toEqual(['other-a'])
  })

  it('falls back to baseLocationIds / baseLocations / legacy baseLocation', () => {
    expect(
      resolveOtherBranchLocationIds({
        locationId: 'primary',
        baseLocationIds: ['x'],
      }),
    ).toEqual(['x'])

    expect(
      resolveOtherBranchLocationIds({
        locationId: 'primary',
        baseLocations: [{ location: { id: 'y', name: 'Y' } }],
      }),
    ).toEqual(['y'])

    expect(
      resolveOtherBranchLocationIds({
        locationId: 'primary',
        baseLocationId: 'z',
        baseLocation: { id: 'z', name: 'Z' },
      }),
    ).toEqual(['z'])
  })
})
