import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getJobsDayTimeline } from '@/features/scheduling/api/scheduling.api'
import { schedulingKeys } from '@/features/scheduling/keys'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  enumerateScheduleIsoDays,
  MAX_SCHEDULE_FILTER_RANGE_DAYS,
  schedulePeriodDayCount,
} from '@/features/scheduling/utils/schedule-period-range.util'

type DayTimeline = Awaited<ReturnType<typeof getJobsDayTimeline>>

/**
 * Loads schedule list jobs across an operational period.
 * Uses one hook + per-day `fetchQuery` so day caches stay shared with the board
 * (avoids variable-length `useQueries`, which can trip React's hook queue).
 */
export function useScheduleListRange(dateFrom: string, dateTo: string, enabled = true) {
  const queryClient = useQueryClient()

  const days = React.useMemo(
    () => enumerateScheduleIsoDays(dateFrom, dateTo, MAX_SCHEDULE_FILTER_RANGE_DAYS),
    [dateFrom, dateTo],
  )

  const fullDayCount = React.useMemo(
    () => schedulePeriodDayCount(dateFrom, dateTo),
    [dateFrom, dateTo],
  )

  const rangeTruncated = fullDayCount > days.length

  const query = useQuery({
    queryKey: [...schedulingKeys.all(), 'list-range', dateFrom, dateTo] as const,
    enabled: enabled && days.length > 0,
    queryFn: async ({ signal }) => {
      const pages = await Promise.all(
        days.map((day) =>
          queryClient.fetchQuery({
            queryKey: schedulingKeys.list(day),
            queryFn: ({ signal: daySignal }) =>
              getJobsDayTimeline(day, { limit: 200 }, { signal: daySignal ?? signal }),
          }),
        ),
      )
      return mergeTimelineJobs(pages)
    },
  })

  return {
    jobs: query.data ?? [],
    days,
    rangeTruncated,
    maxDays: MAX_SCHEDULE_FILTER_RANGE_DAYS,
    fullDayCount,
    isLoading: query.isLoading || query.isFetching,
    isError: query.isError,
    refetch: () => {
      void query.refetch()
    },
  }
}

function mergeTimelineJobs(pages: DayTimeline[]): TimelineJob[] {
  const byId = new Map<string, TimelineJob>()
  for (const page of pages) {
    for (const job of page.jobs ?? []) {
      byId.set(job.id, job)
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.scheduledStartDateTime.localeCompare(b.scheduledStartDateTime),
  )
}
