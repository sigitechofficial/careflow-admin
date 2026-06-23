import { describe, expect, it } from 'vitest'
import type { EmployeeListRow } from '@/features/employees/api/employees.api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import type { EmployeeDayRow, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { ScheduleJobsBoard } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { applyScheduleJobsServiceUserFilter } from '@/features/scheduling/utils/schedule-jobs-service-user-filter.util'

const PAT_ID = 'su-pat'
const CASEY_ID = 'carer-casey'
const OTHER_CARER_ID = 'carer-other'

function makeJob(id: string, serviceUserId: string, allocations: TimelineJob['allocations'] = []): TimelineJob {
  return {
    id,
    jobName: `Job ${id}`,
    status: 'UNALLOCATED',
    serviceUserId,
    serviceUser: {
      id: serviceUserId,
      firstName: 'Pat',
      lastName: 'Client',
      locationId: null,
      location: null,
    },
    scheduledStartDateTime: '2026-06-24T07:00:00.000Z',
    scheduledEndDateTime: '2026-06-24T08:00:00.000Z',
    requiredCarers: 1,
    allocations,
  }
}

function makeRow(id: string, firstName: string, job?: TimelineJob): EmployeeDayRow {
  return {
    employee: {
      id,
      firstName,
      lastName: 'Carer',
      role: null,
      jobTitle: null,
    },
    allocations: job
      ? [
          {
            id: `alloc-${job.id}`,
            status: 'CONFIRMED',
            job,
          },
        ]
      : [],
    totalMinutes: job ? 60 : 0,
    dayPattern: {
      isAvailable: true,
      startTime: '09:00',
      endTime: '17:00',
      isPartial: false,
    },
  }
}

function visitPlanSlotWithCasey(): VisitPlanSlot {
  return {
    id: 'slot-morning',
    slotCode: 'MORNING',
    medicationRoundCode: 'MORNING',
    label: 'Morning',
    isEnabled: true,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    plannedStartTime: '07:00',
    plannedEndTime: '08:00',
    requiredCarers: 1,
    assignedEmployeeIds: [CASEY_ID],
    carerAssignments: [{ employeeId: CASEY_ID, dayOfWeek: null, role: 'LEAD', sortOrder: 0 }],
  } as VisitPlanSlot
}

describe('applyScheduleJobsServiceUserFilter', () => {
  it('keeps carers allocated to the filtered service user', () => {
    const patJob = makeJob('pat-job', PAT_ID, [
      {
        id: 'alloc-1',
        status: 'CONFIRMED',
        employeeId: CASEY_ID,
        employee: { id: CASEY_ID, firstName: 'Casey', lastName: 'Demo-Carer' },
      },
    ])
    patJob.status = 'ALLOCATED'
    const caseyRow = makeRow(CASEY_ID, 'Casey', patJob)
    const otherRow = makeRow(OTHER_CARER_ID, 'Other')
    const board: ScheduleJobsBoard = {
      employeeRows: [caseyRow, otherRow],
      carers: [caseyRow],
      unassignedJobs: [],
      cancelledJobs: [],
      allJobs: [patJob],
    }

    const result = applyScheduleJobsServiceUserFilter(board, [PAT_ID])

    expect(result.employeeRows.map((row) => row.employee.id)).toEqual([CASEY_ID])
    expect(result.employeeRows[0]?.allocations).toHaveLength(1)
    expect(result.allJobs).toHaveLength(1)
  })

  it('includes visit-plan assigned carers when the visit is still unallocated on the rota', () => {
    const patJob = makeJob('pat-job', PAT_ID)
    const caseyRow = makeRow(CASEY_ID, 'Casey')
    const board: ScheduleJobsBoard = {
      employeeRows: [caseyRow, makeRow(OTHER_CARER_ID, 'Other')],
      carers: [],
      unassignedJobs: [patJob],
      cancelledJobs: [],
      allJobs: [patJob],
    }
    const visitPlanSlotsByServiceUser = new Map<string, VisitPlanSlot[]>([
      [PAT_ID, [visitPlanSlotWithCasey()]],
    ])

    const result = applyScheduleJobsServiceUserFilter(board, [PAT_ID], {
      visitPlanSlotsByServiceUser,
    })

    expect(result.employeeRows.map((row) => row.employee.id)).toContain(CASEY_ID)
    expect(result.unassignedJobs).toHaveLength(1)
    expect(result.employeeRows.find((row) => row.employee.id === CASEY_ID)?.allocations).toHaveLength(0)
  })

  it('can add a planned carer from the employee catalog when location filters removed them from the roster', () => {
    const patJob = makeJob('pat-job', PAT_ID)
    const board: ScheduleJobsBoard = {
      employeeRows: [makeRow(OTHER_CARER_ID, 'Other')],
      carers: [],
      unassignedJobs: [patJob],
      cancelledJobs: [],
      allJobs: [patJob],
    }
    const visitPlanSlotsByServiceUser = new Map<string, VisitPlanSlot[]>([
      [PAT_ID, [visitPlanSlotWithCasey()]],
    ])
    const employeeCatalogById = new Map<string, EmployeeListRow>([
      [
        CASEY_ID,
        {
          id: CASEY_ID,
          isActive: true,
          fullName: 'Casey Demo-Carer',
          firstName: 'Casey',
          lastName: 'Demo-Carer',
          photoUrl: null,
          status: null,
          jobTitle: null,
          role: null,
          grade: null,
          contractType: null,
          visaTypeId: null,
          isInCountry: true,
        },
      ],
    ])

    const result = applyScheduleJobsServiceUserFilter(board, [PAT_ID], {
      visitPlanSlotsByServiceUser,
      employeeCatalogById,
    })

    expect(result.employeeRows.map((row) => row.employee.id)).toEqual([CASEY_ID])
    expect(result.employeeRows[0]?.employee.firstName).toBe('Casey')
  })
})
