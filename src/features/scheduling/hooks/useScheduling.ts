import { useQuery } from '@tanstack/react-query'
import {
  getEmployeesDayTimeline,
  getHousekeepingDayJobs,
  getHousekeepingJobsNeedingAttention,
  getHousekeepingJobsNotStarted,
  getJobsDayRuns,
  getJobsDayTimeline,
  getServiceUsersWeekTimeline,
  getScheduleReport,
  getScheduleReportTypes,
  getScheduleStatus,
  listScheduleAreas,
} from '@/features/scheduling/api/scheduling.api'
import { schedulingKeys } from '@/features/scheduling/keys'

export function useScheduleAreas() {
  return useQuery({
    queryKey: schedulingKeys.areas(),
    queryFn: ({ signal }) => listScheduleAreas({ signal }),
  })
}

export function useScheduleStatus(date: string, enabled = true) {
  return useQuery({
    queryKey: schedulingKeys.status(date),
    queryFn: ({ signal }) => getScheduleStatus(date, { signal }),
    enabled: enabled && Boolean(date),
  })
}

export function useScheduleDayRuns(
  date: string,
  enabled = true,
  params: { limit?: number } = {},
) {
  return useQuery({
    queryKey: schedulingKeys.dayRuns(date),
    queryFn: ({ signal }) => getJobsDayRuns(date, { limit: params.limit ?? 200 }, { signal }),
    enabled: enabled && Boolean(date),
  })
}

export function useScheduleServiceUsersWeek(weekStart: string, enabled = true) {
  return useQuery({
    queryKey: schedulingKeys.serviceUsersWeek(weekStart),
    queryFn: ({ signal }) => getServiceUsersWeekTimeline(weekStart, { limit: 300 }, { signal }),
    enabled: enabled && Boolean(weekStart),
    staleTime: 30_000,
  })
}

export function useScheduleList(date: string, enabled = true) {
  return useQuery({
    queryKey: schedulingKeys.list(date),
    queryFn: ({ signal }) => getJobsDayTimeline(date, { limit: 200 }, { signal }),
    enabled: enabled && Boolean(date),
  })
}

export function useScheduleEmployeesDay(
  date: string,
  enabled = true,
  params: { limit?: number } = {},
) {
  return useQuery({
    queryKey: schedulingKeys.employeesDay(date),
    queryFn: ({ signal }) => getEmployeesDayTimeline(date, { limit: params.limit ?? 200 }, { signal }),
    enabled: enabled && Boolean(date),
  })
}

export function useScheduleReportTypes(enabled = true) {
  return useQuery({
    queryKey: schedulingKeys.reportTypes(),
    queryFn: ({ signal }) => getScheduleReportTypes({ signal }),
    enabled,
  })
}

export function useScheduleReport(
  endpoint: string,
  from: string,
  to: string,
  generate: boolean,
  enabled = true,
) {
  return useQuery({
    queryKey: schedulingKeys.report(endpoint, from, to, generate),
    queryFn: ({ signal }) =>
      getScheduleReport(endpoint, { dateFrom: from, dateTo: to, page: 1, limit: 100 }, { signal }),
    enabled: enabled && generate && Boolean(endpoint),
  })
}

export function useHousekeepingJobsNotStarted(page: number, enabled = true) {
  return useQuery({
    queryKey: schedulingKeys.housekeepingNotStarted(page),
    queryFn: () => getHousekeepingJobsNotStarted({ page, limit: 50 }),
    enabled,
  })
}

export function useHousekeepingJobsNeedingAttention(page: number, enabled = true) {
  return useQuery({
    queryKey: schedulingKeys.housekeepingAttention(page),
    queryFn: () => getHousekeepingJobsNeedingAttention({ page, limit: 50 }),
    enabled,
  })
}

export function useHousekeepingDayJobs(date: string, page: number, enabled = true) {
  return useQuery({
    queryKey: schedulingKeys.housekeepingDay(date, page),
    queryFn: () => getHousekeepingDayJobs(date, { page, limit: 50 }),
    enabled: enabled && Boolean(date),
  })
}
