import { describe, expect, it } from 'vitest'
import type { EmployeeDayRow, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  scheduleJobsDayPeriodBandsFromTimeSlots,
  buildScheduleJobsBoard,
  jobBlockLayoutPx,
  jobBlockTone,
  SCHEDULE_JOBS_HOUR_WIDTH,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'

function makeJob(id: string, status: TimelineJob['status'] = 'UNALLOCATED'): TimelineJob {
  return {
    id,
    jobName: `Job ${id}`,
    status,
    serviceUserId: 'su-1',
    serviceUser: { id: 'su-1', firstName: 'Ada', lastName: 'Lovelace', locationId: null, location: null },
    scheduledStartDateTime: '2026-06-18T09:00:00.000Z',
    scheduledEndDateTime: '2026-06-18T10:00:00.000Z',
    requiredCarers: 1,
    allocations: [],
  }
}

describe('buildScheduleJobsBoard', () => {
  it('puts cancelled jobs on the cancelled row, not unassigned', () => {
    const cancelled = makeJob('cancelled', 'CANCELLED')
    const open = makeJob('open', 'UNALLOCATED')
    const board = buildScheduleJobsBoard([], [cancelled, open], [])

    expect(board.cancelledJobs.map((job) => job.id)).toEqual(['cancelled'])
    expect(board.unassignedJobs.map((job) => job.id)).toEqual(['open'])
    expect(board.allJobs).toHaveLength(2)
  })

  it('prefers day-runs check-in over a stale employee allocation job', () => {
    const stale = {
      ...makeJob('harry', 'IN_PROGRESS'),
      checkIn: null,
    }
    const live = {
      ...makeJob('harry', 'IN_PROGRESS'),
      checkIn: { method: 'MANUAL', methodLabel: 'Manual' },
    }
    const row: EmployeeDayRow = {
      employee: {
        id: 'carer-1',
        firstName: 'Alice',
        lastName: 'Carer',
        role: null,
        jobTitle: null,
      },
      allocations: [{ id: 'alloc-1', status: 'CONFIRMED', job: stale }],
      totalMinutes: 60,
    }

    const board = buildScheduleJobsBoard([row], [live], [])
    expect(board.employeeRows[0]?.allocations[0]?.job.checkIn?.methodLabel).toBe('Manual')
  })

  it('removes cancelled jobs from carer allocations', () => {
    const cancelled = makeJob('cancelled', 'CALLED_OFF')
    const row: EmployeeDayRow = {
      employee: {
        id: 'carer-1',
        firstName: 'Alice',
        lastName: 'Carer',
        role: null,
        jobTitle: null,
      },
      allocations: [{ id: 'alloc-1', status: 'CONFIRMED', job: cancelled }],
      totalMinutes: 60,
    }

    const board = buildScheduleJobsBoard([row], [cancelled], [])

    expect(board.employeeRows[0]?.allocations).toHaveLength(0)
    expect(board.cancelledJobs.map((job) => job.id)).toEqual(['cancelled'])
  })

  it('uses the cancelled tone for cancelled and called-off jobs', () => {
    expect(jobBlockTone(makeJob('a', 'CANCELLED'))).toBe('cancelled')
    expect(jobBlockTone(makeJob('b', 'CALLED_OFF'))).toBe('cancelled')
  })

  it('uses orange when an allocated carer is on leave or cover is needed', () => {
    const onLeave = { ...makeJob('leave', 'ALLOCATED'), carersOnLeave: ['carer-1'] }
    const needsCover = { ...makeJob('cover', 'ALLOCATED'), needsCover: true }
    expect(jobBlockTone(onLeave)).toBe('orange')
    expect(jobBlockTone(needsCover)).toBe('orange')
  })

  it('uses unableToStart tone when a completed visit recorded care not delivered', () => {
    const job = {
      ...makeJob('uts', 'COMPLETED'),
      careNotDelivered: { reasonCode: 'CLIENT_NOT_HOME', reasonLabel: 'Client not at home' },
    }
    expect(jobBlockTone(job)).toBe('unableToStart')
  })

  it('uses completed tone for completed visits without care-not-delivered', () => {
    expect(jobBlockTone(makeJob('done', 'COMPLETED'))).toBe('completed')
  })
})

describe('jobBlockLayoutPx', () => {
  it('sizes the bar from visit duration, not label length', () => {
    const job: Pick<TimelineJob, 'scheduledStartDateTime' | 'scheduledEndDateTime' | 'durationMinutes'> = {
      scheduledStartDateTime: '2026-06-18T08:00:00.000Z',
      scheduledEndDateTime: '2026-06-18T09:00:00.000Z',
      durationMinutes: 60,
    }
    const layout = jobBlockLayoutPx(job)
    expect(layout.widthPx).toBe(SCHEDULE_JOBS_HOUR_WIDTH)
    expect(layout.startMin).toBe(8 * 60)
    expect(layout.endMin).toBe(9 * 60)
  })
})

describe('scheduleJobsDayPeriodBandsFromTimeSlots', () => {
  const slot = (code: string, name: string, windowStart: string | null, windowEnd: string | null, sortOrder: number) => ({
    code,
    name,
    windowStart,
    windowEnd,
    sortOrder,
    isActive: true,
  })
  const settings = [
    slot('MORNING', 'Morning', '07:00', '11:00', 1),
    slot('MIDDAY', 'Midday', '11:00', '14:00', 2),
    slot('AFTERNOON', 'Afternoon', '14:00', '17:00', 3),
    slot('EVENING', 'Evening', '17:00', '20:00', 4),
    slot('NIGHT', 'Night', '20:00', '07:00', 5),
    slot('QA_MED_BREAKFAST', 'QA-MED Breakfast', '23:35', '23:45', 6),
  ]
  const summary = (bands: ReturnType<typeof scheduleJobsDayPeriodBandsFromTimeSlots>) =>
    bands?.map((b) => `${b.label} ${b.startHour}-${b.endHour} ${b.period}`)

  it('follows the time slot windows, with Night split around midnight', () => {
    expect(summary(scheduleJobsDayPeriodBandsFromTimeSlots(settings))).toEqual([
      'Night 0-7 night',
      'Morning 7-11 morning',
      'Midday 11-14 midday',
      'Afternoon 14-17 afternoon',
      'Evening 17-20 evening',
      'Night 20-24 night',
    ])
  })

  it('gives each band its own id so either Night part can be zoomed', () => {
    const ids = scheduleJobsDayPeriodBandsFromTimeSlots(settings)!.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('night-0')
    expect(ids).toContain('night-20')
  })

  it('marks hours no slot covers and skips slots without a window or switched off', () => {
    const bands = scheduleJobsDayPeriodBandsFromTimeSlots([
      slot('MORNING', 'Morning', '07:00', '12:00', 1),
      slot('LUNCH', 'Lunch', null, null, 2),
      { ...slot('EVENING', 'Evening', '17:00', '20:00', 3), isActive: false },
    ])
    expect(summary(bands)).toEqual(['No time slot 0-7 morning', 'Morning 7-12 morning', 'No time slot 12-24 midday'])
  })

  it('returns null when no time slot has a window, so the board keeps its fallback bands', () => {
    expect(scheduleJobsDayPeriodBandsFromTimeSlots([slot('MORNING', 'Morning', null, null, 1)])).toBeNull()
  })
})
