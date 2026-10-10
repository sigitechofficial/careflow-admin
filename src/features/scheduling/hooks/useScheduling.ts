import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getEmployeesDayTimeline,
  getScheduledJob,
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
    staleTime: 0,
    refetchOnMount: 'always',
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
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useScheduleReportTypes(enabled = true) {
  return useQuery({
    queryKey: schedulingKeys.reportTypes(),
    queryFn: ({ signal }) => getScheduleReportTypes({ signal }),
    enabled,
  })
}

export type ScheduleReportParams = {
  dateFrom: string
  dateTo: string
  page: number
  limit: number
  locationId?: string
}

export function useScheduleReport(endpoint: string, params: ScheduleReportParams, enabled = true) {
  return useQuery({
    queryKey: schedulingKeys.report(endpoint, params),
    queryFn: ({ signal }) => getScheduleReport(endpoint, params, { signal }),
    enabled: enabled && Boolean(endpoint),
    // Keep the old page while paging, but never show another report's rows (different shape).
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[2] === endpoint ? prev : undefined),
  })
}

/** Every page of a report (for CSV export), capped so a huge range cannot run away. */
export function useScheduleReportAllPages() {
  return useMutation({
    mutationFn: async ({
      endpoint,
      params,
      rowsOf,
    }: {
      endpoint: string
      params: Omit<ScheduleReportParams, 'page' | 'limit'>
      rowsOf: (data: unknown) => unknown[]
    }) => {
      const limit = 200
      const rows: unknown[] = []
      let first: unknown
      for (let page = 1; page <= 50; page++) {
        const res = await getScheduleReport(endpoint, { ...params, page, limit })
        if (page === 1) first = res.data
        rows.push(...rowsOf(res.data))
        if (!res.meta?.hasNextPage) break
      }
      return { first, rows }
    },
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

/**
 * Imperative loader for one scheduled job (e.g. opening the visit workspace sheet
 * from another module's list). Always fetches fresh data; shares the job cache key.
 */
export function useFetchScheduledJob() {
  const queryClient = useQueryClient()
  return React.useCallback(
    (jobId: string) =>
      queryClient.fetchQuery({
        queryKey: schedulingKeys.job(jobId),
        queryFn: () => getScheduledJob(jobId),
        staleTime: 0,
      }),
    [queryClient],
  )
}
