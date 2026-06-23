import { describe, expect, it } from 'vitest'
import {
  buildCarerAvailabilitySegments,
  resolveCarerDayAvailabilityBadge,
  segmentPositionPx,
} from '@/features/scheduling/utils/schedule-jobs-availability.util'
import { SCHEDULE_JOBS_TIMELINE_GRID_WIDTH } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'

function job(start: string, end: string): TimelineJob {
  return {
    id: `job-${start}`,
    jobName: 'Visit',
    status: 'ALLOCATED',
    serviceUserId: 'su-1',
    serviceUser: { id: 'su-1', firstName: 'Margaret', lastName: 'Test' },
    scheduledStartDateTime: `2026-06-15T${start}:00.000Z`,
    scheduledEndDateTime: `2026-06-15T${end}:00.000Z`,
    requiredCarers: 1,
    allocations: [],
  }
}

describe('buildCarerAvailabilitySegments', () => {
  it('returns one free segment for carers with no jobs', () => {
    const segments = buildCarerAvailabilitySegments([])
    expect(segments).toEqual([{ kind: 'free', startMin: 0, endMin: 1440 }])
  })

  it('returns booked and free segments around jobs', () => {
    const segments = buildCarerAvailabilitySegments([job('11:30', '14:30')])
    expect(segments.some((s) => s.kind === 'booked')).toBe(true)
    expect(segments.some((s) => s.kind === 'free' && s.startMin === 0)).toBe(true)
    expect(segments.some((s) => s.kind === 'free' && s.endMin === 1440)).toBe(true)
  })

  it('marks partial patterns as possibly available', () => {
    const segments = buildCarerAvailabilitySegments([], {
      isAvailable: true,
      startTime: '09:00',
      endTime: '17:00',
      isPartial: true,
    })
    expect(segments).toContainEqual({ kind: 'possibly-available', startMin: 540, endMin: 1020 })
  })

  it('marks the full day unavailable when the carer is on leave', () => {
    const segments = buildCarerAvailabilitySegments(
      [],
      { isAvailable: true, startTime: '07:00', endTime: '13:00', isPartial: false },
      undefined,
      { onHoliday: true },
    )
    expect(segments).toEqual([{ kind: 'unavailable', startMin: 0, endMin: 1440 }])
  })

  it('maps segment minutes to pixel positions on the 24h grid', () => {
    const noon = segmentPositionPx({ kind: 'free', startMin: 720, endMin: 780 })
    expect(noon.leftPx).toBe((720 / 1440) * SCHEDULE_JOBS_TIMELINE_GRID_WIDTH)
    expect(noon.widthPx).toBe((60 / 1440) * SCHEDULE_JOBS_TIMELINE_GRID_WIDTH)
  })
})

describe('resolveCarerDayAvailabilityBadge', () => {
  it('returns not available when the pattern blocks the day', () => {
    expect(
      resolveCarerDayAvailabilityBadge({
        isAvailable: false,
        startTime: null,
        endTime: null,
        isPartial: false,
      }),
    ).toEqual({
      kind: 'not-available',
      label: 'Not available',
      title: 'Not available on this day',
    })
  })

  it('returns partial badge with time range', () => {
    expect(
      resolveCarerDayAvailabilityBadge({
        isAvailable: true,
        startTime: '07:00',
        endTime: '13:00',
        isPartial: true,
      }),
    ).toEqual({
      kind: 'partial',
      label: 'Partial · 07:00–13:00',
      title: 'Partially available · 07:00–13:00',
      timeRange: '07:00–13:00',
    })
  })

  it('does not mark bounded full-day patterns as partial (e.g. 09:00–17:00 fully)', () => {
    expect(
      resolveCarerDayAvailabilityBadge({
        isAvailable: true,
        startTime: '09:00',
        endTime: '17:00',
        isPartial: false,
      }),
    ).toBeNull()
  })

  it('skips badge when on leave', () => {
    expect(
      resolveCarerDayAvailabilityBadge(
        { isAvailable: false, startTime: null, endTime: null, isPartial: false },
        true,
      ),
    ).toBeNull()
  })
})
