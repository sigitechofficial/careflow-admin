import { describe, expect, it } from 'vitest'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  buildScheduleJobsServiceUserRows,
  scheduleJobBlockDisplayLabel,
  scheduleJobBlockLabelForServiceUserRow,
  scheduleJobBlockLabelLines,
  serviceUserRowSubtitle,
} from '@/features/scheduling/utils/schedule-jobs-board-axis.util'

function job(partial: Partial<TimelineJob> & Pick<TimelineJob, 'id' | 'serviceUserId'>): TimelineJob {
  return {
    id: partial.id,
    jobName: partial.jobName ?? 'Visit',
    status: partial.status ?? 'ALLOCATED',
    serviceUserId: partial.serviceUserId,
    serviceUser: partial.serviceUser ?? {
      id: partial.serviceUserId,
      firstName: 'Alex',
      lastName: 'Smith',
    },
    scheduledStartDateTime: partial.scheduledStartDateTime ?? '2026-06-24T08:00:00.000Z',
    scheduledEndDateTime: partial.scheduledEndDateTime ?? '2026-06-24T09:00:00.000Z',
    requiredCarers: partial.requiredCarers ?? 1,
    allocations: partial.allocations ?? [],
    visitPlan: partial.visitPlan ?? null,
  }
}

describe('serviceUserRowSubtitle', () => {
  it('shows branch from nested location.name with visit count', () => {
    expect(
      serviceUserRowSubtitle(
        {
          id: 'su-1',
          firstName: 'Doris',
          lastName: 'Clarke',
          locationId: 'loc-1',
          location: { id: 'loc-1', name: 'Merton - Merton' },
        },
        2,
      ),
    ).toBe('Merton · 2 visits today')
  })

  it('shows No visits today when the day row is empty', () => {
    expect(
      serviceUserRowSubtitle(
        {
          id: 'su-1',
          firstName: 'Harry',
          lastName: 'Max',
        },
        0,
      ),
    ).toBe('No visits today')
  })
})

describe('buildScheduleJobsServiceUserRows', () => {
  it('groups jobs by service user and sorts by name then start time', () => {
    const rows = buildScheduleJobsServiceUserRows([
      job({
        id: 'j2',
        serviceUserId: 'su-b',
        serviceUser: { id: 'su-b', firstName: 'Bob', lastName: 'Lee' },
        scheduledStartDateTime: '2026-06-24T17:00:00.000Z',
      }),
      job({
        id: 'j1',
        serviceUserId: 'su-a',
        serviceUser: { id: 'su-a', firstName: 'Alex', lastName: 'Smith' },
        scheduledStartDateTime: '2026-06-24T13:00:00.000Z',
      }),
      job({
        id: 'j0',
        serviceUserId: 'su-a',
        serviceUser: { id: 'su-a', firstName: 'Alex', lastName: 'Smith' },
        scheduledStartDateTime: '2026-06-24T08:00:00.000Z',
      }),
    ])

    expect(rows.map((row) => row.serviceUser.id)).toEqual(['su-a', 'su-b'])
    expect(rows[0]?.jobs.map((j) => j.id)).toEqual(['j0', 'j1'])
  })

  it('keeps week-roster service users with no visits on the selected day', () => {
    const rows = buildScheduleJobsServiceUserRows(
      [
        job({
          id: 'j-today',
          serviceUserId: 'su-enid',
          serviceUser: { id: 'su-enid', firstName: 'Enid', lastName: 'Morrison' },
        }),
      ],
      [
        job({
          id: 'j-week',
          serviceUserId: 'su-harry',
          serviceUser: { id: 'su-harry', firstName: 'Harry', lastName: 'Max' },
          scheduledStartDateTime: '2026-07-20T10:00:00.000Z',
        }),
      ],
    )

    expect(rows.map((row) => row.serviceUser.id)).toEqual(['su-enid', 'su-harry'])
    expect(rows.find((row) => row.serviceUser.id === 'su-harry')?.jobs).toEqual([])
  })
})

describe('scheduleJobBlockLabelForServiceUserRow', () => {
  it('shows assigned carers with time and slot on service user rows', () => {
    const label = scheduleJobBlockLabelForServiceUserRow(
      job({
        id: 'j1',
        serviceUserId: 'su-a',
        visitPlan: {
          slotId: 's1',
          slotCode: 'morning',
          label: 'Morning',
          linkedCarePlanFormIds: [],
        },
        allocations: [
          {
            id: 'a1',
            employeeId: 'e1',
            status: 'CONFIRMED',
            employee: { id: 'e1', firstName: 'Tufail', lastName: 'Khan' },
          },
        ],
      }),
    )
    expect(label).toContain('Tufail Khan')
    expect(label).toContain('Morning')
  })
})

describe('scheduleJobBlockLabelLines', () => {
  it('shows carers first on service user rows', () => {
    const lines = scheduleJobBlockLabelLines(
      job({
        id: 'j1',
        serviceUserId: 'su-a',
        visitPlan: {
          slotId: 's1',
          slotCode: 'morning',
          label: 'Morning',
          linkedCarePlanFormIds: [],
        },
        allocations: [
          {
            id: 'a1',
            employeeId: 'e1',
            status: 'CONFIRMED',
            employee: { id: 'e1', firstName: 'Tufail', lastName: 'Khan' },
          },
        ],
      }),
      'service-user-row',
    )
    expect(lines).toEqual(['Tufail Khan', expect.stringMatching(/Morning/)])
  })

  it('shows client first on carer rows', () => {
    const lines = scheduleJobBlockLabelLines(
      job({
        id: 'j1',
        serviceUserId: 'su-a',
        serviceUser: { id: 'su-a', firstName: 'Michael', lastName: 'Patel', serviceUserNumber: 'SU-TEST-P03' },
        visitPlan: {
          slotId: 's1',
          slotCode: 'morning',
          label: 'Morning',
          linkedCarePlanFormIds: [],
        },
      }),
      'carer-row',
    )
    expect(lines[0]).toBe('Michael Patel (SU-TEST-P03)')
    expect(lines[1]).toContain('Morning')
  })
})

describe('scheduleJobBlockDisplayLabel', () => {
  it('shows assigned carers on service user rows without time', () => {
    const label = scheduleJobBlockDisplayLabel(
      job({
        id: 'j1',
        serviceUserId: 'su-a',
        allocations: [
          {
            id: 'a1',
            employeeId: 'e1',
            status: 'CONFIRMED',
            employee: { id: 'e1', firstName: 'Tufail', lastName: 'Khan' },
          },
        ],
      }),
      'service-user-row',
    )
    expect(label).toBe('Tufail K.')
  })

  it('shows client name on carer rows without time', () => {
    const label = scheduleJobBlockDisplayLabel(
      job({
        id: 'j1',
        serviceUserId: 'su-a',
        serviceUser: { id: 'su-a', firstName: 'David', lastName: 'Thompson', serviceUserNumber: 'SU-TEST-P07' },
      }),
      'carer-row',
    )
    expect(label).toBe('David Thompson')
  })

  it('shows unassigned when no carers on service user rows', () => {
    const label = scheduleJobBlockDisplayLabel(
      job({ id: 'j1', serviceUserId: 'su-a', allocations: [] }),
      'service-user-row',
    )
    expect(label).toBe('Unassigned')
  })
})
