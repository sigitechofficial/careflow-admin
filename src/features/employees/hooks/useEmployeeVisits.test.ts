import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  classifyEmployeeVisit,
  employeeVisitDurationMinutes,
  employeeVisitDurationVariance,
  employeeVisitOutcomeLabel,
  employeeVisitSlotLabel,
  formatDurationMinutes,
  visitDurationVarianceExportFields,
} from '@/features/employees/hooks/useEmployeeVisits'

function job(partial: Partial<TimelineJob> & Pick<TimelineJob, 'id' | 'scheduledStartDateTime'>): TimelineJob {
  return {
    jobName: 'Morning — George',
    status: 'ALLOCATED',
    serviceUserId: 'su-1',
    serviceUser: {
      id: 'su-1',
      firstName: 'George',
      lastName: 'Morrison',
      preferredName: 'George',
      serviceUserNumber: 'SU-1',
    },
    scheduledEndDateTime: null,
    requiredCarers: 1,
    allocations: [],
    ...partial,
  }
}

describe('employeeVisitSlotLabel', () => {
  it('prefers visit plan slot label over jobName with client suffix', () => {
    expect(
      employeeVisitSlotLabel(
        job({
          id: '1',
          scheduledStartDateTime: '2026-07-07T06:00:00.000Z',
          visitPlan: {
            slotId: 'slot-1',
            slotCode: 'MORNING',
            label: 'Morning',
            linkedCarePlanFormIds: [],
          },
        }),
      ),
    ).toBe('Morning')
  })

  it('strips service user first name from jobName when visit plan missing', () => {
    expect(
      employeeVisitSlotLabel(
        job({
          id: '1',
          scheduledStartDateTime: '2026-07-07T06:00:00.000Z',
          jobName: 'Evening — George',
        }),
      ),
    ).toBe('Evening')
  })
})

describe('employeeVisitOutcomeLabel', () => {
  it('names missed and cancelled clearly', () => {
    expect(
      employeeVisitOutcomeLabel(
        job({ id: '1', scheduledStartDateTime: '2026-07-01T06:00:00.000Z', status: 'MISSED' }),
        'other',
      ),
    ).toBe('Missed')
    expect(
      employeeVisitOutcomeLabel(
        job({ id: '1', scheduledStartDateTime: '2026-07-01T06:00:00.000Z', status: 'CANCELLED' }),
        'other',
      ),
    ).toBe('Cancelled')
  })

  it('labels past unfinished allocated visits as Not completed', () => {
    expect(
      employeeVisitOutcomeLabel(
        job({ id: '1', scheduledStartDateTime: '2026-07-01T06:00:00.000Z', status: 'ALLOCATED' }),
        'other',
      ),
    ).toBe('Not completed')
  })
})

describe('classifyEmployeeVisit', () => {
  it('puts past allocated jobs in other', () => {
    const now = new Date('2026-07-16T12:00:00.000Z')
    expect(
      classifyEmployeeVisit(
        job({
          id: '1',
          scheduledStartDateTime: '2026-07-07T06:00:00.000Z',
          scheduledEndDateTime: '2026-07-07T07:00:00.000Z',
          status: 'ALLOCATED',
        }),
        now,
      ),
    ).toBe('other')
  })
})

describe('employeeVisitDurationMinutes', () => {
  it('prefers actual duration when both ends exist', () => {
    expect(
      employeeVisitDurationMinutes(
        job({
          id: '1',
          scheduledStartDateTime: '2026-07-07T06:00:00.000Z',
          scheduledEndDateTime: '2026-07-07T07:00:00.000Z',
          durationMinutes: 60,
          actualStartDateTime: '2026-07-07T06:05:00.000Z',
          actualEndDateTime: '2026-07-07T06:50:00.000Z',
        }),
      ),
    ).toBe(45)
  })

  it('formats duration labels', () => {
    expect(formatDurationMinutes(45)).toBe('45m')
    expect(formatDurationMinutes(90)).toBe('1h 30m')
    expect(formatDurationMinutes(null)).toBe('—')
  })
})

describe('employeeVisitDurationVariance', () => {
  it('flags exceeded when actual is longer than planned', () => {
    const variance = employeeVisitDurationVariance(
      job({
        id: '1',
        scheduledStartDateTime: '2026-07-07T06:00:00.000Z',
        scheduledEndDateTime: '2026-07-07T07:00:00.000Z',
        durationMinutes: 60,
        actualStartDateTime: '2026-07-07T06:00:00.000Z',
        actualEndDateTime: '2026-07-07T07:15:00.000Z',
      }),
    )
    expect(variance.kind).toBe('exceeded')
    expect(variance.deltaMinutes).toBe(15)
    expect(visitDurationVarianceExportFields(variance)).toEqual({
      durationVariance: 'Exceeded',
      varianceMinutes: '+15',
    })
  })

  it('flags short only when under planned by more than 15 minutes', () => {
    const short = employeeVisitDurationVariance(
      job({
        id: '1',
        scheduledStartDateTime: '2026-07-07T06:00:00.000Z',
        scheduledEndDateTime: '2026-07-07T07:00:00.000Z',
        durationMinutes: 60,
        actualStartDateTime: '2026-07-07T06:00:00.000Z',
        actualEndDateTime: '2026-07-07T06:40:00.000Z',
      }),
    )
    expect(short.kind).toBe('short')
    expect(visitDurationVarianceExportFields(short)).toEqual({
      durationVariance: 'Short',
      varianceMinutes: '-20',
    })

    const withinTolerance = employeeVisitDurationVariance(
      job({
        id: '1',
        scheduledStartDateTime: '2026-07-07T06:00:00.000Z',
        scheduledEndDateTime: '2026-07-07T07:00:00.000Z',
        durationMinutes: 60,
        actualStartDateTime: '2026-07-07T06:00:00.000Z',
        actualEndDateTime: '2026-07-07T06:50:00.000Z',
      }),
    )
    expect(withinTolerance.kind).toBe('on_time')
    expect(visitDurationVarianceExportFields(withinTolerance)).toEqual({
      durationVariance: 'On time',
      varianceMinutes: '-10',
    })
  })

  it('is unknown without actual check-in/out', () => {
    const variance = employeeVisitDurationVariance(
      job({
        id: '1',
        scheduledStartDateTime: '2026-07-07T06:00:00.000Z',
        scheduledEndDateTime: '2026-07-07T07:00:00.000Z',
        durationMinutes: 60,
      }),
    )
    expect(variance.kind).toBe('unknown')
    expect(visitDurationVarianceExportFields(variance)).toEqual({
      durationVariance: 'Not assessed',
      varianceMinutes: '',
    })
  })
})
