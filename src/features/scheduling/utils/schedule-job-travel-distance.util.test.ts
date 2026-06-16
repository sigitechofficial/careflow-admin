import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  buildNextVisitTravelDetail,
  estimateTravelMinutesFromStraightLineKm,
  formatTravelDistanceKm,
  haversineDistanceKm,
} from '@/features/scheduling/utils/schedule-job-travel-distance.util'

function job(
  id: string,
  start: string,
  lat: number | null,
  lng: number | null,
  name: { firstName: string; lastName: string },
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
    scheduledEndDateTime: null,
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
    const first = job('su-1', '2026-06-15T09:00:00.000Z', 51.5074, -0.1278, {
      firstName: 'Danish',
      lastName: 'Ali',
    })
    const second = job('su-2', '2026-06-15T11:00:00.000Z', 51.5074, -0.06333, {
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
})
