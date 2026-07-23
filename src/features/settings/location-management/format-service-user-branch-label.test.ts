import { describe, expect, it } from 'vitest'
import { formatServiceUserBranchLabel } from '@/features/settings/location-management/format-service-user-branch-label'

describe('formatServiceUserBranchLabel', () => {
  it('formats flat locationName (zone - branch)', () => {
    expect(
      formatServiceUserBranchLabel({
        locationId: 'loc-1',
        locationName: 'Merton - Merton',
      }),
    ).toBe('Merton')
  })

  it('reads nested location.name from ServiceUserBrief-style payloads', () => {
    expect(
      formatServiceUserBranchLabel({
        locationId: 'loc-1',
        location: { id: 'loc-1', name: 'Merton - Merton' },
      }),
    ).toBe('Merton')
  })

  it('prefers explicit locationName over nested location.name', () => {
    expect(
      formatServiceUserBranchLabel({
        locationId: 'loc-1',
        locationName: 'North - Branch A',
        location: { id: 'loc-1', name: 'Ignored' },
      }),
    ).toBe('North · Branch A')
  })

  it('returns Not assigned when no location is present', () => {
    expect(formatServiceUserBranchLabel({})).toBe('Not assigned')
  })
})
