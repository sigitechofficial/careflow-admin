import type { ScheduleCarerOperationalFilter, ScheduleJobOperationalFilter } from '@/features/scheduling/utils/schedule-job-board-filter.util'
import type { ScheduleJobsRequiredCarersFilterValue } from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'
import type { ScheduleJobsLayout } from '@/features/scheduling/utils/schedule-jobs-layout.util'
import type { ScheduleJobsBoardRowAxis } from '@/features/scheduling/utils/schedule-jobs-board-axis.util'

export function parseCommaSeparatedFilterIds(value?: string | null): string[] {
  if (!value?.trim()) return []
  return value.split(',').map((id) => id.trim()).filter(Boolean)
}

export type ScheduleJobsUrlSearchParams = {
  date: string
  locationIds: string[]
  serviceUserIds: string[]
  requiredCarersFilters: ScheduleJobsRequiredCarersFilterValue[]
  jobOperationalFilters?: ScheduleJobOperationalFilter[]
  carerOperationalFilters?: ScheduleCarerOperationalFilter[]
  layout?: ScheduleJobsLayout
  rowAxis?: ScheduleJobsBoardRowAxis
}

export function buildScheduleJobsSearch(params: ScheduleJobsUrlSearchParams) {
  return {
    date: params.date,
    ...(params.locationIds.length ? { locationId: params.locationIds.join(',') } : {}),
    ...(params.serviceUserIds.length ? { serviceUserId: params.serviceUserIds.join(',') } : {}),
    ...(params.requiredCarersFilters.length
      ? { requiredCarers: params.requiredCarersFilters.join(',') }
      : {}),
    ...(params.jobOperationalFilters?.length
      ? { op: params.jobOperationalFilters.join(',') }
      : {}),
    ...(params.carerOperationalFilters?.length
      ? { carerOp: params.carerOperationalFilters.join(',') }
      : {}),
    ...(params.layout && params.layout !== 'board' ? { layout: params.layout } : {}),
    ...(params.rowAxis && params.rowAxis !== 'carers' ? { rowAxis: params.rowAxis } : {}),
  }
}
