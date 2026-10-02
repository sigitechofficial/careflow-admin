/** Pure helpers for the System jobs screen (labels, health mapping, filters, formatting). No React. */

import { ApiError } from '@/shared/api/api-client'
import { formatRelativeTime } from '@/shared/lib/time-format'
import type {
  JobHealth,
  JobHealthFilter,
  JobRun,
  JobRunSource,
  JobRunStatus,
  JobTrigger,
  SystemJob,
} from '@/features/system-jobs/types'

/** Badge variants available in `@/shared/ui/badge` that this screen uses. */
export type JobBadgeVariant = 'success' | 'info' | 'warning' | 'destructive' | 'muted' | 'outline'

export interface HealthMeta {
  health: JobHealth | 'unknown'
  label: string
  variant: JobBadgeVariant
  /** One-line explanation for tooltips and the legend. */
  explanation: string
}

export const HEALTH_META: Record<JobHealth, HealthMeta> = {
  ok: {
    health: 'ok',
    label: 'Healthy',
    variant: 'success',
    explanation: 'The last run succeeded and the job is running on schedule.',
  },
  running: {
    health: 'running',
    label: 'Running',
    variant: 'info',
    explanation: 'A run is in progress right now. Runs stuck for more than 60 minutes are marked as failed.',
  },
  late: {
    health: 'late',
    label: 'Late',
    variant: 'warning',
    explanation:
      'No successful run within twice the expected interval (plus 15 minutes for daily jobs). Azure may not be triggering it.',
  },
  failing: {
    health: 'failing',
    label: 'Failing',
    variant: 'destructive',
    explanation: 'The most recent finished run failed. Open the history to see the error.',
  },
  'never-run': {
    health: 'never-run',
    label: 'Never run',
    variant: 'muted',
    explanation: 'No runs recorded yet. Normal just after a deployment, until the job is triggered for the first time.',
  },
}

/** Legend / display order: most urgent first. */
export const HEALTH_ORDER: readonly JobHealth[] = ['failing', 'late', 'running', 'never-run', 'ok'] as const

export function healthMeta(health: string | null | undefined): HealthMeta {
  if (health && health in HEALTH_META) return HEALTH_META[health as JobHealth]
  return {
    health: 'unknown',
    label: health ? String(health) : 'Unknown',
    variant: 'outline',
    explanation: 'The server reported a status this screen does not recognise.',
  }
}

export interface RunStatusMeta {
  label: string
  variant: JobBadgeVariant
}

const RUN_STATUS_META: Record<JobRunStatus, RunStatusMeta> = {
  success: { label: 'Success', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  running: { label: 'Running', variant: 'info' },
  skipped: { label: 'Skipped', variant: 'muted' },
}

export function runStatusMeta(status: string | null | undefined): RunStatusMeta {
  if (status && status in RUN_STATUS_META) return RUN_STATUS_META[status as JobRunStatus]
  return { label: status ? String(status) : 'Unknown', variant: 'outline' }
}

const TRIGGER_LABELS: Record<JobTrigger, string> = {
  function: 'Azure Function',
  'container-job': 'Container Job',
}

/** "Runs on" label: `Azure Function` / `Container Job`. */
export function triggerLabel(trigger: string | null | undefined): string {
  if (trigger && trigger in TRIGGER_LABELS) return TRIGGER_LABELS[trigger as JobTrigger]
  return trigger ? String(trigger) : '—'
}

export function triggerDescription(trigger: string | null | undefined): string {
  if (trigger === 'function') return 'An Azure Functions timer calls the API on this schedule.'
  if (trigger === 'container-job') return 'An Azure Container Apps Job runs this in its own container on this schedule.'
  return 'Trigger type not recognised.'
}

const SOURCE_LABELS: Record<JobRunSource, string> = {
  internal: 'API scheduler',
  function: 'Azure Function',
  'container-job': 'Container Job',
  manual: 'Manual',
}

/** Who started a run. */
export function sourceLabel(source: string | null | undefined): string {
  if (source && source in SOURCE_LABELS) return SOURCE_LABELS[source as JobRunSource]
  return source ? String(source) : '—'
}

/* ─── Summary cards & filtering ─────────────────────────────────────────── */

export interface JobCounts {
  total: number
  /** `ok` + `running` — nothing needs attention. */
  healthy: number
  late: number
  failing: number
  neverRun: number
  running: number
}

export function countJobs(items: readonly Pick<SystemJob, 'health'>[]): JobCounts {
  const counts: JobCounts = { total: items.length, healthy: 0, late: 0, failing: 0, neverRun: 0, running: 0 }
  for (const job of items) {
    switch (job.health) {
      case 'ok':
        counts.healthy += 1
        break
      case 'running':
        counts.healthy += 1
        counts.running += 1
        break
      case 'late':
        counts.late += 1
        break
      case 'failing':
        counts.failing += 1
        break
      case 'never-run':
        counts.neverRun += 1
        break
      default:
        break
    }
  }
  return counts
}

export function jobMatchesFilter(job: Pick<SystemJob, 'health'>, filter: JobHealthFilter): boolean {
  switch (filter) {
    case 'healthy':
      return job.health === 'ok' || job.health === 'running'
    case 'late':
      return job.health === 'late'
    case 'failing':
      return job.health === 'failing'
    default:
      return true
  }
}

export function filterJobs<T extends Pick<SystemJob, 'health'>>(items: readonly T[], filter: JobHealthFilter): T[] {
  return items.filter(job => jobMatchesFilter(job, filter))
}

export const HEALTH_FILTER_LABELS: Record<JobHealthFilter, string> = {
  all: 'All jobs',
  healthy: 'Healthy',
  late: 'Late',
  failing: 'Failing',
}

/* ─── Numbers & times ───────────────────────────────────────────────────── */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Success rate as a percentage (0–100), or null when nothing ran in the window.
 * The API may send a fraction (0–1) or a percentage; when runs/failures are known the reading
 * closest to `(runs − failures) / runs` wins (so `1` means 100 % unless the counts say 1 %).
 */
export function normalizeSuccessRate(
  rate: number | null | undefined,
  runs?: number | null,
  failures?: number | null,
): number | null {
  const computed =
    isFiniteNumber(runs) && runs > 0 && isFiniteNumber(failures)
      ? Math.min(100, Math.max(0, ((runs - failures) / runs) * 100))
      : null
  if (!isFiniteNumber(rate)) return computed
  if (rate > 1) return Math.min(100, rate)
  if (rate < 0) return 0
  const asFraction = rate * 100
  if (computed === null) return asFraction
  return Math.abs(asFraction - computed) <= Math.abs(rate - computed) ? asFraction : rate
}

/** `98.5%`, `100%`, `—` (no runs). */
export function formatSuccessRate(percent: number | null): string {
  if (percent === null) return '—'
  const rounded = Math.round(percent * 10) / 10
  return `${rounded.toLocaleString('en-GB', { maximumFractionDigits: 1 })}%`
}

/** Colour band for the 24 h success rate. */
export function successRateTone(percent: number | null): 'good' | 'mixed' | 'bad' | 'none' {
  if (percent === null) return 'none'
  if (percent >= 99) return 'good'
  if (percent >= 90) return 'mixed'
  return 'bad'
}

/** Milliseconds to add to the browser clock to get the API clock (from `serverTime`). */
export function serverClockOffsetMs(serverTime: string | null | undefined, receivedAtMs: number): number {
  if (!serverTime || !receivedAtMs) return 0
  const server = new Date(serverTime).getTime()
  if (!Number.isFinite(server)) return 0
  return server - receivedAtMs
}

/** Overdue by more than this before "Next expected" reads as overdue (triggers are not to-the-second). */
const OVERDUE_GRACE_MS = 60 * 1000

export interface NextExpected {
  text: string
  overdue: boolean
}

/** `in 4 minutes`, `overdue (5 minutes ago)`, or `—` when the API gives no estimate. */
export function describeNextExpected(nextExpectedAt: string | null | undefined, now: Date): NextExpected {
  if (!nextExpectedAt) return { text: '—', overdue: false }
  const at = new Date(nextExpectedAt).getTime()
  if (!Number.isFinite(at)) return { text: '—', overdue: false }
  if (now.getTime() - at > OVERDUE_GRACE_MS) {
    return { text: `overdue (${formatRelativeTime(nextExpectedAt, now)})`, overdue: true }
  }
  if (at <= now.getTime()) return { text: 'due now', overdue: false }
  return { text: formatRelativeTime(nextExpectedAt, now), overdue: false }
}

/** Seconds/minutes since the last successful fetch, e.g. `12 s ago`. */
export function formatUpdatedAgo(updatedAtMs: number, nowMs: number): string {
  if (!updatedAtMs) return 'not yet'
  const sec = Math.max(0, Math.round((nowMs - updatedAtMs) / 1000))
  if (sec < 5) return 'just now'
  if (sec < 60) return `${sec} s ago`
  const min = Math.floor(sec / 60)
  return min === 1 ? '1 min ago' : `${min} min ago`
}

/** `every 5 minutes` style interval text from minutes. */
export function formatInterval(minutes: number | null | undefined): string {
  if (!isFiniteNumber(minutes) || minutes <= 0) return '—'
  if (minutes < 60) return minutes === 1 ? 'every minute' : `every ${minutes} minutes`
  if (minutes % 1440 === 0) return minutes === 1440 ? 'daily' : `every ${minutes / 1440} days`
  if (minutes % 60 === 0) return minutes === 60 ? 'hourly' : `every ${minutes / 60} hours`
  return `every ${minutes} minutes`
}

/** Pretty-printed run summary for the history drawer; `null` when there is nothing to show. */
export function formatSummaryJson(summary: unknown): string | null {
  if (summary === null || summary === undefined) return null
  if (typeof summary === 'string') {
    const trimmed = summary.trim()
    if (!trimmed) return null
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2)
    } catch {
      return summary
    }
  }
  try {
    return JSON.stringify(summary, null, 2)
  } catch {
    return String(summary)
  }
}

/* ─── Run now ───────────────────────────────────────────────────────────── */

/** Extra confirmation text for jobs that do a lot of work when run by hand. */
const RUN_NOW_WARNINGS: Record<string, string> = {
  'rolling-rota': 'Generates rota for the whole rolling window; existing visits are skipped.',
}

export function runNowWarning(jobName: string | null | undefined): string | null {
  if (!jobName) return null
  return RUN_NOW_WARNINGS[jobName] ?? null
}

export interface RunNowAvailability {
  /** Show the button at all (manage permission). */
  visible: boolean
  disabled: boolean
  /** Why it is disabled (tooltip / screen-reader text). */
  reason: string | null
}

export function runNowAvailability(
  job: Pick<SystemJob, 'health' | 'lastRun'>,
  opts: { canManage: boolean; pending: boolean },
): RunNowAvailability {
  if (!opts.canManage) {
    return { visible: false, disabled: true, reason: 'Needs the System jobs manage permission.' }
  }
  if (opts.pending) return { visible: true, disabled: true, reason: 'Running now…' }
  if (job.health === 'running' || job.lastRun?.status === 'running') {
    return { visible: true, disabled: true, reason: 'A run is already in progress.' }
  }
  return { visible: true, disabled: false, reason: null }
}

export function isRateLimitError(e: unknown): boolean {
  return e instanceof ApiError && e.status === 429
}

/** fetch() aborted by our own deadline (`AbortSignal.timeout`) — the run carries on server-side. */
export function isTimeoutError(e: unknown): boolean {
  return (
    typeof DOMException !== 'undefined' &&
    e instanceof DOMException &&
    (e.name === 'TimeoutError' || e.name === 'AbortError')
  )
}

export type RunOutcomeTone = 'success' | 'error' | 'info'

/** Toast copy for the run returned by `POST /system-jobs/:name/run`. */
export function describeRunOutcome(
  label: string,
  run: Partial<JobRun> | null | undefined,
  formatDuration: (ms: number | null | undefined) => string,
): { tone: RunOutcomeTone; title: string; description?: string } {
  const status = run?.status
  const took = isFiniteNumber(run?.durationMs) ? `Took ${formatDuration(run?.durationMs)}.` : undefined
  if (status === 'success') return { tone: 'success', title: `${label} finished`, description: took }
  if (status === 'failed') {
    const error = run?.error?.trim()
    return {
      tone: 'error',
      title: `${label} failed`,
      description: error ? (error.length > 240 ? `${error.slice(0, 240)}…` : error) : took,
    }
  }
  if (status === 'skipped') {
    return { tone: 'info', title: `${label} skipped`, description: took ?? 'Nothing to do for this run.' }
  }
  if (status === 'running') {
    return { tone: 'info', title: `${label} started`, description: 'Still running — the history updates automatically.' }
  }
  return { tone: 'info', title: `${label} triggered`, description: 'Check the run history for the result.' }
}
