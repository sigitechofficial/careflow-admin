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
  rowTravelPairs,
  travelBetween,
  travelConflictFromPreviousJobIds,
} from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import { drivingLegKey, useDrivingTravelStore } from '@/features/scheduling/utils/driving-travel.store'

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
  it('formats distances in miles', () => {
    expect(formatTravelDistanceKm(0.042)).toBe('< 0.1 mi')
    expect(formatTravelDistanceKm(10)).toBe('6.2 mi')
    expect(formatTravelDistanceKm(32)).toBe('19.9 mi')
    expect(formatTravelDistanceKm(28.51)).toBe('17.7 mi')
  })

  it('computes London sample distance (~4.5 km)', () => {
    const km = haversineDistanceKm(
      { lat: 51.5074, lng: -0.1278 },
      { lat: 51.5074, lng: -0.06333 },
    )
    expect(km).toBeGreaterThan(4)
    expect(km).toBeLessThan(5.5)
  })

  it('estimates road miles and minutes like the API (careflow-api visit-travel-distance.util.spec)', () => {
    // Keep in step with the API: 10 km straight line × 1.35 = 13.5 road km ≈ 8.4 mi, 29 min at 28 km/h.
    useDrivingTravelStore.setState({ legs: {}, version: 0 })
    const chingford = { lat: 51.632, lng: 0.001 }
    const tenKmSouth = { lat: 51.5421, lng: 0.001 }
    const leg = travelBetween(chingford, tenKmSouth)
    expect(leg.travelSource).toBe('ESTIMATE')
    expect(formatTravelDistanceKm(leg.distanceKm)).toBe('8.4 mi')
    expect(leg.travelMinutes).toBe(29)
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
    expect(detail?.distanceLabel).toMatch(/mi$/)
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
    expect(formatTravelDistanceKm(totalKm)).toMatch(/mi$/)
  })

  it('uses the Google driving route once it has arrived, the estimate until then', () => {
    const first = job('su-1', '2026-06-15T09:00:00.000Z', 51.5074, -0.1278, { firstName: 'Enid', lastName: 'M' }, '2026-06-15T09:30:00.000Z')
    const second = job('su-2', '2026-06-15T10:00:00.000Z', 51.52, -0.1, { firstName: 'Joan', lastName: 'W' })
    const rowJobs = [first, second]
    const from = jobGeoCoordinates(first)!
    const to = jobGeoCoordinates(second)!

    useDrivingTravelStore.setState({ legs: {}, version: 0 })
    expect(buildNextVisitTravelDetail(first, rowJobs)?.travelSource).toBe('ESTIMATE')
    expect(rowTravelPairs(rowJobs)).toEqual([{ from, to }])

    useDrivingTravelStore.setState({
      legs: { [drivingLegKey(from, to)]: { km: 4.2, minutes: 17, source: 'GOOGLE' } },
      version: 1,
    })
    const detail = buildNextVisitTravelDetail(first, rowJobs)
    expect(detail).toMatchObject({ distanceKm: 4.2, travelMinutes: 17, travelSource: 'GOOGLE' })
    useDrivingTravelStore.setState({ legs: {}, version: 0 })
  })
})
