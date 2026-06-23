import { describe, expect, it } from 'vitest'
import type { EmployeeDayRow, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
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
