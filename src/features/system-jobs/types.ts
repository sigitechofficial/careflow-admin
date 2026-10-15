/**
 * System jobs (scheduled background work) — shapes of the `/system-jobs` admin API.
 * See the scheduled-jobs contract: `GET /system-jobs`, `GET /system-jobs/:name/runs`,
 * `POST /system-jobs/:name/run`. All responses are unwrapped from the Nest envelope.
 */

/** `external` = Azure triggers jobs; `internal` = fallback, the API runs its own `@Cron` handlers. */
export type CronMode = 'internal' | 'external'

/** Where the job is triggered from in Azure. */
export type JobTrigger = 'function' | 'container-job'

export type JobHealth = 'ok' | 'late' | 'failing' | 'never-run' | 'running'

export type JobRunStatus = 'running' | 'success' | 'failed' | 'skipped'

/** Who started a run: the in-API scheduler, an Azure Function, a Container Apps Job or a person. */
export type JobRunSource = 'internal' | 'function' | 'container-job' | 'manual'

export interface JobRun {
  id: string
  jobName: string
  periodKey: string
  source: JobRunSource | string
  status: JobRunStatus | string
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  summary: unknown
  error: string | null
  /** Display name of the person who ran it now, or null for scheduled runs. */
  triggeredBy: string | null
}

export interface JobSchedule {
  cron: string
  human: string
}

export interface SystemJob {
  name: string
  label: string
  description: string
  trigger: JobTrigger | string
  schedule: JobSchedule
  expectedIntervalMinutes: number
  lastRun: JobRun | null
  lastSuccessAt: string | null
  nextExpectedAt: string | null
  health: JobHealth | string
  runs24h: number
  failures24h: number
  /**
   * Share of finished runs in the last 24 h that did not fail; null when none finished.
   * The API sends a percentage (0–100, 1 dp); a 0–1 fraction is tolerated too.
   */
  successRate24h: number | null
}

export interface SystemJobsOverview {
  cronMode: CronMode | string
  serverTime: string
  items: SystemJob[]
}

export interface JobRunList {
  items: JobRun[]
}

/** Run-history status filter in the detail drawer (`all` = no `status` query param). */
export type RunStatusFilter = 'all' | JobRunStatus

export const RUN_STATUS_FILTERS: readonly RunStatusFilter[] = ['all', 'success', 'failed', 'running', 'skipped'] as const

export function isRunStatusFilter(value: unknown): value is RunStatusFilter {
  return typeof value === 'string' && (RUN_STATUS_FILTERS as readonly string[]).includes(value)
}

/** Summary-card filter for the jobs table. */
export type JobHealthFilter = 'all' | 'healthy' | 'late' | 'failing'

export const JOB_HEALTH_FILTERS: readonly JobHealthFilter[] = ['all', 'healthy', 'late', 'failing'] as const

export function isJobHealthFilter(value: unknown): value is JobHealthFilter {
  return typeof value === 'string' && (JOB_HEALTH_FILTERS as readonly string[]).includes(value)
}

/** Search params of `/system-jobs`: `?job=<name>` opens the history drawer, `?health=` filters the table. */
export interface SystemJobsSearch {
  job?: string
  health?: JobHealthFilter
}

const JOB_NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

/** Job names are kebab-case IDs (`rolling-rota`); anything else in the URL is ignored. */
export function isJobName(value: unknown): value is string {
  return typeof value === 'string' && JOB_NAME_RE.test(value)
}

export function validateSystemJobsSearch(raw: Record<string, unknown>): SystemJobsSearch {
  return {
    job: isJobName(raw.job) ? raw.job : undefined,
    health: isJobHealthFilter(raw.health) && raw.health !== 'all' ? raw.health : undefined,
  }
}
