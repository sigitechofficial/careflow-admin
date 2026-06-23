import type { EmployeeDayRow } from '@/features/scheduling/types/scheduling.types'
import { scheduleTimesFitCarerDayPattern } from '@/features/scheduling/utils/schedule-jobs-availability.util'

/** Jobs allocated to a carer row but outside that carer's working pattern for the day. */
export function collectOutsidePatternJobIds(employeeRows: EmployeeDayRow[]): Set<string> {
  const ids = new Set<string>()
  for (const row of employeeRows) {
    if (!row.dayPattern) continue
    for (const allocation of row.allocations) {
      const job = allocation.job
      const check = scheduleTimesFitCarerDayPattern(
        row.dayPattern,
        job.scheduledStartDateTime,
        job.scheduledEndDateTime ?? job.scheduledStartDateTime,
      )
      if (!check.ok) ids.add(job.id)
    }
  }
  return ids
}
