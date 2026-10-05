import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  addMinutesToHm,
  buildNextVisitTravelDetail,
  computeRowTravelDistanceKm,
  estimateTravelMinutesFromStraightLineKm,
  formatTravelDistanceKm,
  gapMinutesBetweenJobs,
  haversineDistanceKm,
  hasTravelGapConflict,
  jobGeoCoordinates,
  travelConflictFromPreviousJobIds,
} from '@/features/scheduling/utils/schedule-job-travel-distance.util'

function job(
  id: string,
  start: string,
  lat: number | null,
  lng: number | null,
  name: { firstName: string; lastName: string },
  end?: string,
): TimelineJob {
  return {
    id,
    jobName: 'Visit',
    status: 'SCHEDULED',
    serviceUserId: id,
    serviceUser: {
      id,
      firstName: name.firstName,
      lastName: name.lastName,
      latitude: lat,
      longitude: lng,
    },
    scheduledStartDateTime: start,
    scheduledEndDateTime: end ?? null,
    requiredCarers: 1,
    allocations: [],
  }
}

describe('schedule-job-travel-distance', () => {
  it('formats sub-kilometre distances in metres', () => {
    expect(formatTravelDistanceKm(0.042)).toBe('42 m')
  })

  it('computes London sample distance (~4.5 km)', () => {
    const km = haversineDistanceKm(
      { lat: 51.5074, lng: -0.1278 },
      { lat: 51.5074, lng: -0.06333 },
    )
    expect(km).toBeGreaterThan(4)
    expect(km).toBeLessThan(5.5)
  })

  it('builds next-visit travel detail for the following job on the row', () => {
    const first = job('su-1', '2026-06-15T08:00:00.000Z', 51.5074, -0.1278, {
      firstName: 'Danish',
      lastName: 'Ali',
    })
    const second = job('su-2', '2026-06-15T10:00:00.000Z', 51.5074, -0.06333, {
      firstName: 'Margaret',
      lastName: 'Hughes',
    })
    const detail = buildNextVisitTravelDetail(first, [first, second])
    expect(detail?.nextClientLabel).toBe('Margaret Hughes')
    expect(detail?.nextVisitTimeLabel).toBe('11:00')
    expect(detail?.distanceLabel).toMatch(/km$/)
    expect(detail?.travelMinutes).toBeGreaterThan(0)
    expect(detail?.travelLabel).toMatch(/^~\d+ min$/)
  })

  it('estimates travel time from straight-line distance', () => {
    const km = haversineDistanceKm(
      { lat: 51.5074, lng: -0.1278 },
      { lat: 51.5074, lng: -0.06333 },
    )
    const minutes = estimateTravelMinutesFromStraightLineKm(km)
    expect(minutes).toBeGreaterThanOrEqual(10)
    expect(minutes).toBeLessThanOrEqual(20)
  })

  it('returns null when there is no next job', () => {
    const only = job('su-1', '2026-06-15T09:00:00.000Z', 51.5, -0.12, {
      firstName: 'Ada',
      lastName: 'Lovelace',
    })
    expect(buildNextVisitTravelDetail(only, [only])).toBeNull()
  })

  it('flags travel conflict when gap is shorter than travel plus buffer', () => {
    const first = job(
      'su-1',
      '2026-06-15T10:00:00.000Z',
      51.5074,
      -0.1278,
      { firstName: 'Danish', lastName: 'Ali' },
      '2026-06-15T11:00:00.000Z',
    )
    const second = job('su-2', '2026-06-15T11:15:00.000Z', 51.5074, -0.06333, {
      firstName: 'Margaret',
      lastName: 'Hughes',
    })
    const detail = buildNextVisitTravelDetail(first, [first, second], { bufferMinutes: 15 })
    expect(detail?.gapMinutes).toBe(15)
    expect(detail?.hasTravelConflict).toBe(true)
    expect(detail?.lateByMinutes).toBeGreaterThan(0)
    expect(travelConflictFromPreviousJobIds([first, second], 15).has(second.id)).toBe(true)
    expect(travelConflictFromPreviousJobIds([first, second], 15).has(first.id)).toBe(false)
  })

  it('detects travel gap conflicts from minutes', () => {
    expect(hasTravelGapConflict(30, 40, 15)).toBe(true)
    expect(hasTravelGapConflict(60, 40, 15)).toBe(false)
    expect(hasTravelGapConflict(-5, 40, 0)).toBe(false)
  })

  it('adds minutes to HH:mm labels', () => {
    expect(addMinutesToHm('11:00', 40)).toBe('11:40')
    expect(gapMinutesBetweenJobs(
      job('a', '2026-06-15T10:00:00.000Z', null, null, { firstName: 'A', lastName: 'A' }, '2026-06-15T11:00:00.000Z'),
      job('b', '2026-06-15T11:30:00.000Z', null, null, { firstName: 'B', lastName: 'B' }),
    )).toBe(30)
  })

  it('falls back to job coordinates when service user coords are missing', () => {
    const withJobCoords = job('su-1', '2026-06-15T09:00:00.000Z', null, null, {
      firstName: 'Ada',
      lastName: 'Lovelace',
    })
    withJobCoords.latitude = 51.5074
    withJobCoords.longitude = -0.1278
    expect(jobGeoCoordinates(withJobCoords)).toEqual({ lat: 51.5074, lng: -0.1278 })
  })

  it('sums row travel distance across consecutive visits', () => {
    const first = job('su-1', '2026-06-15T08:00:00.000Z', 51.5074, -0.1278, {
      firstName: 'Danish',
      lastName: 'Ali',
    })
    const second = job('su-2', '2026-06-15T10:00:00.000Z', 51.5074, -0.06333, {
      firstName: 'Margaret',
      lastName: 'Hughes',
    })
    const third = job('su-3', '2026-06-15T12:00:00.000Z', 51.52, -0.1, {
      firstName: 'George',
      lastName: 'Morrison',
    })
    const totalKm = computeRowTravelDistanceKm([first, second, third])
    const legOne = buildNextVisitTravelDetail(first, [first, second, third])?.distanceKm ?? 0
    const legTwo = buildNextVisitTravelDetail(second, [first, second, third])?.distanceKm ?? 0
    expect(totalKm).toBeCloseTo(legOne + legTwo, 5)
    expect(formatTravelDistanceKm(totalKm)).toMatch(/km$/)
  })
})
