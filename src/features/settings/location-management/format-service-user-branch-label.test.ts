import { describe, expect, it } from 'vitest'
import {
  formatBranchDisplayName,
  formatLocationOptionLabel,
  formatServiceUserBranchLabel,
} from '@/features/settings/location-management/format-service-user-branch-label'

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

describe('formatBranchDisplayName', () => {
  it('collapses duplicated zone-branch strings', () => {
    expect(formatBranchDisplayName('Haringey - Haringey')).toBe('Haringey')
  })

  it('keeps the branch part of a location name', () => {
    expect(formatBranchDisplayName(null, 'North - Branch A')).toBe('Branch A')
  })
})

describe('formatLocationOptionLabel', () => {
  it('collapses duplicated zone-branch strings', () => {
    expect(formatLocationOptionLabel('Haringey - Haringey')).toBe('Haringey')
  })

  it('keeps distinct zone and branch', () => {
    expect(formatLocationOptionLabel('North - Branch A')).toBe('North · Branch A')
  })
})
