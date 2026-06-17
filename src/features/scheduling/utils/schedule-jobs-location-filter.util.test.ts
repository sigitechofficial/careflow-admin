import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  buildEmployeeLocationCatalogMap,
  scheduleJobCarerLocationConflictMessage,
} from '@/features/scheduling/utils/schedule-jobs-location-filter.util'

function job(locationId: string | null, locationName?: string): TimelineJob {
  return {
    id: 'job-1',
    jobName: 'Morning visit',
    status: 'SCHEDULED',
    serviceUserId: 'su-1',
    serviceUser: {
      id: 'su-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      locationId,
      location: locationId && locationName ? { id: locationId, name: locationName } : null,
    },
    scheduledStartDateTime: '2026-06-15T09:00:00.000Z',
    scheduledEndDateTime: '2026-06-15T10:00:00.000Z',
    requiredCarers: 1,
    allocations: [],
  }
}

describe('scheduleJobCarerLocationConflictMessage', () => {
  const catalog = buildEmployeeLocationCatalogMap([
    {
      id: 'carer-a',
      locationId: 'loc-a',
      baseLocationIds: [],
    } as never,
    {
      id: 'carer-b',
      locationId: 'loc-b',
      baseLocationIds: ['loc-a'],
    } as never,
    {
      id: 'carer-c',
      locationId: 'loc-b',
      baseLocationIds: [],
    } as never,
  ])
  const locationNames = new Map([
    ['loc-a', 'Location A'],
    ['loc-b', 'Location B'],
  ])

  it('allows assign when carer primary location matches visit location', () => {
    expect(
      scheduleJobCarerLocationConflictMessage(
        job('loc-a', 'Location A'),
        { kind: 'carer', employeeId: 'carer-a' },
        catalog,
        locationNames,
      ),
    ).toBeNull()
  })

  it('allows assign when visit location is in carer base locations', () => {
    expect(
      scheduleJobCarerLocationConflictMessage(
        job('loc-a', 'Location A'),
        { kind: 'carer', employeeId: 'carer-b' },
        catalog,
        locationNames,
      ),
    ).toBeNull()
  })

  it('blocks assign when visit and carer locations differ', () => {
    expect(
      scheduleJobCarerLocationConflictMessage(
        job('loc-a', 'Location A'),
        { kind: 'carer', employeeId: 'carer-c' },
        catalog,
        locationNames,
      ),
    ).toContain('Location A')
  })

  it('ignores unassigned row and visits without a location', () => {
    expect(
      scheduleJobCarerLocationConflictMessage(job(null), { kind: 'unassigned' }, catalog, locationNames),
    ).toBeNull()
    expect(
      scheduleJobCarerLocationConflictMessage(job(null), { kind: 'carer', employeeId: 'carer-a' }, catalog, locationNames),
    ).toBeNull()
  })
})
