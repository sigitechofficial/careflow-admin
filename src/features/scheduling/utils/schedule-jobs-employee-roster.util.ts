import type { EmployeeListRow } from '@/features/employees/api/employees.api'
import type { EmployeeBrief, EmployeeDayRow, TimelineJob } from '@/features/scheduling/types/scheduling.types'

function employeeBriefFromListRow(row: EmployeeListRow): EmployeeBrief {  return {
    id: row.id,
    firstName: row.firstName ?? undefined,
    lastName: row.lastName ?? undefined,
    role: row.role,
    jobTitle: row.jobTitle,
    isBankStaff: false,
    isAgencyStaff: false,
  }
}

function employeeBriefFromAllocation(
  employee: NonNullable<TimelineJob['allocations'][number]['employee']>,
): EmployeeBrief {
  return {
    id: employee.id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    isBankStaff: false,
    isAgencyStaff: false,
  }
}

/** Combine timeline rows with the full employee directory so every carer appears on the gantt. */
export function mergeScheduleJobsEmployeeRoster(
  timelineRows: EmployeeDayRow[],
  catalog: EmployeeListRow[],
  jobs: TimelineJob[],
): EmployeeDayRow[] {
  const byId = new Map<string, EmployeeDayRow>()

  for (const row of timelineRows) {
    byId.set(row.employee.id, {
      ...row,
      allocations: row.allocations.map((allocation) => ({ ...allocation })),
    })
  }

  for (const job of jobs) {
    for (const allocation of job.allocations ?? []) {
      const employee = allocation.employee
      if (!employee?.id) continue

      let row = byId.get(employee.id)
      if (!row) {
        row = {
          employee: employeeBriefFromAllocation(employee),
          allocations: [],
          totalMinutes: 0,
          dayPattern: null,
        }
        byId.set(employee.id, row)
      }

      const existing = row.allocations.find((entry) => entry.job.id === job.id)
      if (existing) {
        // Day-runs is the live board payload (check-in method, actual start).
        existing.job = job
        continue
      }
      row.allocations.push({
        id: allocation.id,
        status: allocation.status,
        job,
      })
      row.totalMinutes += job.durationMinutes ?? 0
    }
  }

  for (const row of catalog) {
    if (byId.has(row.id)) continue
    byId.set(row.id, {
      employee: employeeBriefFromListRow(row),
      allocations: [],
      totalMinutes: 0,
      dayPattern: null,
    })
  }

  return [...byId.values()]
}
