import { apiJson } from '@/shared/api/api-client'
import { buildQueryString, unwrapEnvelope } from '@/shared/api/envelope'
import type { JobRun, JobRunList, RunStatusFilter, SystemJobsOverview } from '@/features/system-jobs/types'

const BASE = '/system-jobs'

/**
 * Run-now waits for the job to finish. Heavy jobs (rolling rota) can take minutes, so allow far
 * longer than the default API timeout; if it still times out the run carries on server-side.
 */
export const RUN_NOW_TIMEOUT_MS = 10 * 60 * 1000

function jobPath(name: string): string {
  return `${BASE}/${encodeURIComponent(name)}`
}

/** Normalise a list response: `{ items }` per the contract, but tolerate a bare array. */
function toRunList(data: unknown): JobRunList {
  if (Array.isArray(data)) return { items: data as JobRun[] }
  const items = (data as { items?: unknown } | null)?.items
  return { items: Array.isArray(items) ? (items as JobRun[]) : [] }
}

export async function fetchSystemJobs(): Promise<SystemJobsOverview> {
  const data = unwrapEnvelope<SystemJobsOverview>(await apiJson<unknown>(BASE, { method: 'GET' }))
  return { ...data, items: Array.isArray(data?.items) ? data.items : [] }
}

export async function fetchJobRuns(
  name: string,
  params: { limit: number; status: RunStatusFilter },
): Promise<JobRunList> {
  const query = buildQueryString({ limit: params.limit, status: params.status === 'all' ? undefined : params.status })
  return toRunList(unwrapEnvelope<unknown>(await apiJson<unknown>(`${jobPath(name)}/runs${query}`, { method: 'GET' })))
}

/**
 * Runs the job now (source `manual`). Resolves with the finished (or still running) run.
 * The API rate-limits this to one call per job per minute (429).
 */
export async function runJobNow(name: string): Promise<JobRun> {
  return unwrapEnvelope<JobRun>(
    await apiJson<unknown>(
      `${jobPath(name)}/run`,
      { method: 'POST' },
      // Never retry a job trigger automatically: a retried POST could start a second run.
      { timeoutMs: RUN_NOW_TIMEOUT_MS, retry: { maxRetries: 0 } },
    ),
  )
}
