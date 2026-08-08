import type { EcmOperationalPeriod } from '@/features/ecm/utils/ecm-operational-period.util'
import { buildEcmPeriodSearch } from '@/features/ecm/utils/ecm-period-url-state.util'
import type { ScheduleCarerOperationalFilter, ScheduleJobOperationalFilter } from '@/features/scheduling/utils/schedule-job-board-filter.util'
import type { ScheduleJobsRequiredCarersFilterValue } from '@/features/scheduling/utils/schedule-jobs-required-carers-filter.util'
import type { ScheduleJobsLayout } from '@/features/scheduling/utils/schedule-jobs-layout.util'
import type { ScheduleJobsBoardRowAxis } from '@/features/scheduling/utils/schedule-jobs-board-axis.util'

export function parseCommaSeparatedFilterIds(value?: string | null): string[] {
  if (!value?.trim()) return []
  return value.split(',').map((id) => id.trim()).filter(Boolean)
}

export type ScheduleJobsUrlSearchParams = {
  period: EcmOperationalPeriod
  /** Board focus day (clamped into period on read). */
  date: string
  locationIds: string[]
  serviceUserIds: string[]
  employeeIds?: string[]
  requiredCarersFilters: ScheduleJobsRequiredCarersFilterValue[]
  jobOperationalFilters?: ScheduleJobOperationalFilter[]
  carerOperationalFilters?: ScheduleCarerOperationalFilter[]
  layout?: ScheduleJobsLayout
  rowAxis?: ScheduleJobsBoardRowAxis
}

/** Shared filter params preserved when navigating Board ↔ List (ECM period + focus day). */
export type ScheduleSharedFilterSearch = {
  period?: string
  from?: string
  to?: string
  date: string
  locationId?: string
  serviceUserId?: string
  employeeId?: string
  requiredCarers?: string
}

export function buildScheduleSharedFilterSearch(params: {
  period: EcmOperationalPeriod
  date: string
  locationIds: string[]
  serviceUserIds: string[]
  employeeIds?: string[]
  requiredCarersFilters: ScheduleJobsRequiredCarersFilterValue[]
}): ScheduleSharedFilterSearch {
  return {
    ...buildEcmPeriodSearch(params.period),
    date: params.date,
    ...(params.locationIds.length ? { locationId: params.locationIds.join(',') } : {}),
    ...(params.serviceUserIds.length ? { serviceUserId: params.serviceUserIds.join(',') } : {}),
    ...(params.employeeIds?.length ? { employeeId: params.employeeIds.join(',') } : {}),
    ...(params.requiredCarersFilters.length
      ? { requiredCarers: params.requiredCarersFilters.join(',') }
      : {}),
  }
}

export function buildScheduleJobsSearch(params: ScheduleJobsUrlSearchParams) {
  return {
    ...buildScheduleSharedFilterSearch(params),
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
