import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  anchorPreVisitGapSegmentPosition,
  buildBetweenJobsRotaGapSegments,
  buildFirstJobRotaGapSegments,
  formatGapDurationMinutes,
  formatGapTimeRange,
  formatTravelBreakdown,
  rotaGapDisplayModeIncludesIdle,
  rotaGapDisplayModeIncludesTravel,
  splitPreVisitGapMinutes,
} from '@/features/scheduling/utils/schedule-job-rota-gap.util'

function job(
  id: string,
  startHm: string,
  endHm: string,
  lat?: number,
  lng?: number,
): TimelineJob {
  const date = '2026-06-19'
  return {
    id,
    jobName: `Job ${id}`,
    status: 'SCHEDULED',
    serviceUserId: `su-${id}`,
    serviceUser: {
      id: `su-${id}`,
      firstName: 'Test',
      lastName: id,
      latitude: lat ?? null,
      longitude: lng ?? null,
    },
    scheduledStartDateTime: `${date}T${startHm}:00.000Z`,
    scheduledEndDateTime: `${date}T${endHm}:00.000Z`,
    requiredCarers: 1,
    allocations: [],
  }
}

describe('schedule-job-rota-gap.util', () => {
  it('splitPreVisitGapMinutes separates idle wait from travel drive time', () => {
    expect(
      splitPreVisitGapMinutes({
        windowStartMin: 60,
        visitStartMin: 120,
        travelMinutes: 20,
        bufferMinutes: 5,
      }),
    ).toEqual({
      idleMinutes: 35,
      travelMinutes: 25,
      departMin: 95,
    })
  })

  it('buildFirstJobRotaGapSegments shows travel only before first visit (no idle)', () => {
    const segments = buildFirstJobRotaGapSegments({
      jobs: [job('a', '09:00', '09:30', 51.5074, -0.1278)],
      dayPattern: { isAvailable: true, startTime: '08:00', endTime: '17:00', isPartial: false },
      carerCoordinates: { lat: 51.5, lng: -0.12 },
      displayMode: 'both',
      bufferMinutes: 0,
    })

    expect(segments).toHaveLength(1)
    expect(segments[0]?.kind).toBe('travel')
  })

  it('buildFirstJobRotaGapSegments shows nothing when carer home coordinates are missing', () => {
    const segments = buildFirstJobRotaGapSegments({
      jobs: [job('a', '09:00', '09:30', 51.5074, -0.1278)],
      dayPattern: { isAvailable: true, startTime: '08:00', endTime: '17:00', isPartial: false },
      displayMode: 'both',
    })

    expect(segments).toHaveLength(0)
  })

  it('anchorPreVisitGapSegmentPosition places idle and travel before destination visit', () => {
    const travel = anchorPreVisitGapSegmentPosition({
      visitStartMin: 600,
      travelWindowMinutes: 25,
      idleMinutes: 35,
      kind: 'travel',
    })
    expect(travel).toEqual({ startMin: 575, endMin: 600 })

    const idle = anchorPreVisitGapSegmentPosition({
      visitStartMin: 600,
      travelWindowMinutes: 25,
      idleMinutes: 35,
      kind: 'idle',
    })
    expect(idle).toEqual({ startMin: 540, endMin: 575 })
  })

  it('buildBetweenJobsRotaGapSegments respects display mode filters', () => {
    const jobs = [
      job('a', '09:00', '09:30', 51.5074, -0.1278),
      job('b', '10:30', '11:00', 51.52, -0.11),
    ]

    expect(
      buildBetweenJobsRotaGapSegments({ jobs, displayMode: 'none' }),
    ).toHaveLength(0)
    expect(
      buildBetweenJobsRotaGapSegments({ jobs, displayMode: 'travel' }).every((s) => s.kind === 'travel'),
    ).toBe(true)
    expect(
      buildBetweenJobsRotaGapSegments({ jobs, displayMode: 'idle' }).every((s) => s.kind === 'idle'),
    ).toBe(true)
  })

  it('rotaGapDisplayModeIncludes helpers', () => {
    expect(rotaGapDisplayModeIncludesIdle('both')).toBe(true)
    expect(rotaGapDisplayModeIncludesIdle('travel')).toBe(false)
    expect(rotaGapDisplayModeIncludesTravel('idle')).toBe(false)
    expect(rotaGapDisplayModeIncludesTravel('both')).toBe(true)
  })

  it('formatGapTimeRange and formatGapDurationMinutes label blocks', () => {
    expect(formatGapTimeRange(480, 540)).toBe('08:00–09:00')
    expect(formatGapDurationMinutes(480, 'idle')).toBe('480 min')
    expect(formatGapDurationMinutes(3, 'travel')).toBe('3 min')
  })

  it('formatTravelBreakdown splits a travel block into drive and buffer', () => {
    expect(formatTravelBreakdown(44, 15)).toBe('44 min drive + 15 min buffer')
    expect(formatTravelBreakdown(44)).toBe('44 min drive')
  })
})
