import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  buildScheduleJobTravelConnectors,
  insetTravelConnectorEndpoints,
  scheduleJobTravelLabelY,
  SCHEDULE_JOB_TRAVEL_CONNECTOR_CARD_GAP_PX,
  SCHEDULE_JOB_TRAVEL_LABEL_BLOCK_HEIGHT_PX,
  SCHEDULE_JOB_TRAVEL_LABEL_BLOCK_TOP_PX,
} from '@/features/scheduling/utils/schedule-job-travel-connector.util'
import {
  buildScheduleJobsFullDayViewport,
  jobBlockLayoutPxInViewport,
} from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'
import { SCHEDULE_JOBS_ROW_HEIGHT } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

function job(
  id: string,
  start: string,
  end: string,
  lat: number,
  lng: number,
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
    scheduledEndDateTime: end,
    requiredCarers: 1,
    allocations: [],
  }
}

describe('schedule-job-travel-connector', () => {
  it('builds a connector between consecutive visits with distance and time label', () => {
    const viewport = buildScheduleJobsFullDayViewport()
    const first = job(
      'su-1',
      '2026-06-24T07:00:00',
      '2026-06-24T10:00:00',
      51.5074,
      -0.1278,
      { firstName: 'Enid', lastName: 'Morrison' },
    )
    const second = job(
      'su-2',
      '2026-06-24T11:15:00',
      '2026-06-24T12:15:00',
      51.5074,
      -0.06333,
      { firstName: 'George', lastName: 'Morrison' },
    )

    const connectors = buildScheduleJobTravelConnectors([first, second], viewport, {
      jobLaneHeight: 40,
      rowHeightPx: SCHEDULE_JOBS_ROW_HEIGHT,
    })

    expect(connectors).toHaveLength(1)
    expect(connectors[0]?.fromJobId).toBe('su-1')
    expect(connectors[0]?.toJobId).toBe('su-2')
    expect(connectors[0]?.toX).toBeGreaterThan(connectors[0]?.fromX ?? 0)
    expect(connectors[0]?.label).toMatch(/km|m/)
    expect(connectors[0]?.label).toMatch(/min/)
  })

  it('skips completed source visits', () => {
    const viewport = buildScheduleJobsFullDayViewport()
    const first = job(
      'su-1',
      '2026-06-24T07:00:00',
      '2026-06-24T10:00:00',
      51.5074,
      -0.1278,
      { firstName: 'Enid', lastName: 'Morrison' },
    )
    first.status = 'COMPLETED'
    const second = job(
      'su-2',
      '2026-06-24T11:15:00',
      '2026-06-24T12:15:00',
      51.5074,
      -0.06333,
      { firstName: 'George', lastName: 'Morrison' },
    )

    expect(
      buildScheduleJobTravelConnectors([first, second], viewport, {
        jobLaneHeight: 40,
        rowHeightPx: SCHEDULE_JOBS_ROW_HEIGHT,
      }),
    ).toHaveLength(0)
  })

  it('centers travel labels vertically between visit cards', () => {
    expect(
      scheduleJobTravelLabelY({
        jobLaneHeight: 40,
      }),
    ).toBe(SCHEDULE_JOB_TRAVEL_LABEL_BLOCK_TOP_PX + SCHEDULE_JOB_TRAVEL_LABEL_BLOCK_HEIGHT_PX / 2)
  })

  it('insets connector endpoints away from job card edges', () => {
    const viewport = buildScheduleJobsFullDayViewport()
    const first = job(
      'su-1',
      '2026-06-24T07:00:00',
      '2026-06-24T10:00:00',
      51.5074,
      -0.1278,
      { firstName: 'Enid', lastName: 'Morrison' },
    )
    const second = job(
      'su-2',
      '2026-06-24T11:15:00',
      '2026-06-24T12:15:00',
      51.5074,
      -0.06333,
      { firstName: 'George', lastName: 'Morrison' },
    )
    const firstLayout = jobBlockLayoutPxInViewport(first, viewport)!
    const secondLayout = jobBlockLayoutPxInViewport(second, viewport)!
    const connector = buildScheduleJobTravelConnectors([first, second], viewport, {
      jobLaneHeight: 40,
      rowHeightPx: SCHEDULE_JOBS_ROW_HEIGHT,
    })[0]

    expect(connector?.fromX).toBeGreaterThan(firstLayout.leftPx + firstLayout.widthPx)
    expect(connector?.toX).toBeLessThan(secondLayout.leftPx)
    expect(connector?.fromX).toBe(
      firstLayout.leftPx + firstLayout.widthPx + SCHEDULE_JOB_TRAVEL_CONNECTOR_CARD_GAP_PX,
    )
    expect(connector?.toX).toBe(secondLayout.leftPx - SCHEDULE_JOB_TRAVEL_CONNECTOR_CARD_GAP_PX)
  })

  it('returns null when cards are too close for inset connector', () => {
    expect(insetTravelConnectorEndpoints(100, 120)).toBeNull()
  })
})
