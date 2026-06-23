import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  buildEmployeeLocationCatalogMap,
  filterTimelineJobsByLocation,
  resolveTimelineJobLocationId,
  resolveTimelineJobLocationIds,
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

  it('allows assign for carers with access to all zones', () => {
    const allZonesCatalog = buildEmployeeLocationCatalogMap([
      {
        id: 'carer-z',
        locationId: 'loc-z',
        baseLocationIds: [],
        accessAllZones: true,
      } as never,
    ])
    expect(
      scheduleJobCarerLocationConflictMessage(
        job('loc-a', 'Location A'),
        { kind: 'carer', employeeId: 'carer-z' },
        allZonesCatalog,
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

describe('resolveTimelineJobLocationId', () => {
  it('prefers service user location then schedule area location', () => {
    expect(
      resolveTimelineJobLocationId({
        serviceUser: { locationId: 'loc-a' },
        scheduleArea: { locationId: 'loc-b' },
      }),
    ).toBe('loc-a')
    expect(
      resolveTimelineJobLocationId({
        serviceUser: { locationId: null },
        scheduleArea: { locationId: 'loc-b' },
      }),
    ).toBe('loc-b')
  })
})

describe('resolveTimelineJobLocationIds', () => {
  it('includes service user and schedule area locations when both differ', () => {
    expect(
      resolveTimelineJobLocationIds({
        serviceUser: { locationId: 'loc-a' },
        scheduleArea: { locationId: 'loc-b' },
      }),
    ).toEqual(['loc-a', 'loc-b'])
  })
})

describe('filterTimelineJobsByLocation', () => {
  it('matches service user location or schedule area location', () => {
    const jobs: TimelineJob[] = [
      job('loc-a', 'Location A'),
      {
        ...job(null),
        id: 'job-2',
        scheduleArea: { id: 'area-a', name: 'Area A', code: 'A', locationId: 'loc-b' },
      },
      {
        ...job('loc-a', 'Location A'),
        id: 'job-3',
        scheduleArea: { id: 'area-b', name: 'Area B', code: 'B', locationId: 'loc-b' },
      },
    ]
    expect(filterTimelineJobsByLocation(jobs, 'loc-a').map((j) => j.id)).toEqual(['job-1', 'job-3'])
    expect(filterTimelineJobsByLocation(jobs, 'loc-b').map((j) => j.id)).toEqual(['job-2', 'job-3'])
  })

  it('supports multiple branch ids', () => {
    const jobs: TimelineJob[] = [
      job('loc-a', 'Location A'),
      { ...job('loc-b', 'Location B'), id: 'job-2', serviceUserId: 'su-2' },
    ]
    expect(filterTimelineJobsByLocation(jobs, ['loc-a', 'loc-b']).map((j) => j.id).sort()).toEqual(
      ['job-1', 'job-2'],
    )
  })
})
