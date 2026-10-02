import * as React from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJobRuns, fetchSystemJobs, runJobNow } from '@/features/system-jobs/api/system-jobs.api'
import { systemJobsKeys } from '@/features/system-jobs/keys'
import type { RunStatusFilter } from '@/features/system-jobs/types'

/** The jobs list refreshes itself every 30 s while the page is open. */
export const SYSTEM_JOBS_REFRESH_MS = 30 * 1000

/** Run history page size (the API default for `limit`). */
export const RUN_HISTORY_PAGE_SIZE = 50

/** Upper bound for "Load more": the API validates `limit` as 1–200. */
export const RUN_HISTORY_MAX_LIMIT = 200

export function useSystemJobs() {
  return useQuery({
    queryKey: systemJobsKeys.list(),
    queryFn: fetchSystemJobs,
    staleTime: 15 * 1000,
    refetchInterval: SYSTEM_JOBS_REFRESH_MS,
    refetchOnWindowFocus: true,
  })
}

export function useJobRuns(name: string | null, status: RunStatusFilter, limit: number) {
  return useQuery({
    queryKey: systemJobsKeys.runs(name ?? '', status, limit),
    queryFn: () => fetchJobRuns(name!, { status, limit }),
    enabled: !!name,
    staleTime: 10 * 1000,
    placeholderData: keepPreviousData,
    // Poll faster while a run is in progress so it settles without a manual refresh.
    refetchInterval: query =>
      query.state.data?.items.some(r => r.status === 'running') ? 10 * 1000 : SYSTEM_JOBS_REFRESH_MS,
  })
}

/**
 * Run a job now. Several jobs can be run at once, so the hook tracks the set of job names with a
 * request in flight (the mutation's own `isPending` only reflects the latest call).
 */
export function useRunJobNow() {
  const qc = useQueryClient()
  const [pending, setPending] = React.useState<ReadonlySet<string>>(() => new Set())
  const mutation = useMutation({
    mutationFn: (name: string) => runJobNow(name),
    onSettled: (_data, _error, name) => {
      void qc.invalidateQueries({ queryKey: systemJobsKeys.list() })
      void qc.invalidateQueries({ queryKey: systemJobsKeys.runsRoot(name) })
    },
  })
  const { mutateAsync } = mutation

  const run = React.useCallback(
    async (name: string) => {
      setPending(prev => new Set(prev).add(name))
      try {
        return await mutateAsync(name)
      } finally {
        setPending(prev => {
          const next = new Set(prev)
          next.delete(name)
          return next
        })
      }
    },
    [mutateAsync],
  )

  return { run, pending, isPending: (name: string) => pending.has(name) }
}

/** Re-render every `intervalMs` (for ticking "updated 12 s ago" / server clock text). */
export function useNow(intervalMs: number): number {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
