import * as React from 'react'
import { AlertTriangle, Check, ChevronDown, Copy, History, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import { Skeleton } from '@/shared/ui/misc'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { cn } from '@/shared/lib/utils'
import { extractApiErrorMessage, toastError, toastSuccess } from '@/shared/lib/toast'
import {
  formatDateTimeGb,
  formatDateTimeSecondsGb,
  formatDurationMs,
  formatRelativeTime,
  formatShortDateTimeSecondsGb,
  formatTimeSecondsGb,
  isSameUkDay,
} from '@/shared/lib/time-format'
import {
  RUN_HISTORY_MAX_LIMIT,
  RUN_HISTORY_PAGE_SIZE,
  useJobRuns,
} from '@/features/system-jobs/hooks/useSystemJobs'
import { RUN_STATUS_FILTERS, type JobRun, type RunStatusFilter, type SystemJob } from '@/features/system-jobs/types'
import {
  describeNextExpected,
  formatInterval,
  formatSuccessRate,
  formatSummaryJson,
  normalizeSuccessRate,
  runNowAvailability,
  runStatusMeta,
  sourceLabel,
} from '@/features/system-jobs/lib/system-jobs-format'
import {
  JobHealthBadge,
  RunStatusBadge,
  TriggerBadge,
} from '@/features/system-jobs/components/SystemJobsBadges'
import { RunNowButton } from '@/features/system-jobs/components/JobsTable'

const STATUS_FILTER_LABELS: Record<RunStatusFilter, string> = {
  all: 'All statuses',
  success: 'Success',
  failed: 'Failed',
  running: 'Running',
  skipped: 'Skipped',
}

export interface JobDetailSheetProps {
  /** Job name from `?job=`; null = closed. */
  jobName: string | null
  /** The job from the list (null while loading or when the name is unknown). */
  job: SystemJob | null
  listLoading: boolean
  now: Date
  canManage: boolean
  runPending: boolean
  onRunNow: (job: SystemJob) => void
  onClose: () => void
}

export function JobDetailSheet({
  jobName,
  job,
  listLoading,
  now,
  canManage,
  runPending,
  onRunNow,
  onClose,
}: JobDetailSheetProps) {
  return (
    <Sheet open={!!jobName} onOpenChange={open => (!open ? onClose() : undefined)}>
      <SheetContent
        side="right"
        size="xl"
        className="w-full max-w-full sm:w-[760px]"
        data-testid="system-jobs-detail"
        // Focus the panel itself, not the first badge: a focused badge pops its tooltip over the title.
        onOpenAutoFocus={e => {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement | null)?.focus()
        }}
      >
        <SheetHeader className="pr-12">
          <SheetTitle className="leading-snug">{job?.label ?? jobName ?? 'Job'}</SheetTitle>
          <SheetDescription>{job?.description || 'Run history for this background job.'}</SheetDescription>
          {job ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <JobHealthBadge health={job.health} />
              <TriggerBadge trigger={job.trigger} />
              {(() => {
                const a = runNowAvailability(job, { canManage, pending: runPending })
                return a.visible ? (
                  <RunNowButton
                    label={job.label}
                    pending={runPending}
                    disabled={a.disabled}
                    reason={a.reason}
                    onClick={() => onRunNow(job)}
                  />
                ) : null
              })()}
            </div>
          ) : null}
        </SheetHeader>
        <SheetBody className="space-y-5 px-4 sm:px-6">
          {job ? (
            <JobInfo job={job} now={now} />
          ) : listLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground" role="alert">
              No job called <code>{jobName}</code> was found. It may have been renamed or removed.
            </p>
          )}
          {jobName && (job || !listLoading) ? <RunHistory key={jobName} jobName={jobName} now={now} /> : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

function JobInfo({ job, now }: { job: SystemJob; now: Date }) {
  const pct = normalizeSuccessRate(job.successRate24h, job.runs24h, job.failures24h)
  const next = describeNextExpected(job.nextExpectedAt, now)
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2" data-testid="system-jobs-detail-info">
      <InfoItem label="Job ID">
        <code className="break-all text-xs">{job.name}</code>
      </InfoItem>
      <InfoItem label="Schedule">
        {job.schedule?.human || '—'}
        {job.schedule?.cron ? (
          <span className="block text-xs text-muted-foreground">
            Cron (UTC): <code>{job.schedule.cron}</code>
          </span>
        ) : null}
      </InfoItem>
      <InfoItem label="Expected">{formatInterval(job.expectedIntervalMinutes)}</InfoItem>
      <InfoItem label="Last success">
        {job.lastSuccessAt ? (
          <time dateTime={job.lastSuccessAt} title={formatDateTimeGb(job.lastSuccessAt)}>
            {formatRelativeTime(job.lastSuccessAt, now)}
            <span className="block text-xs text-muted-foreground">{formatDateTimeGb(job.lastSuccessAt)}</span>
          </time>
        ) : (
          'Never'
        )}
      </InfoItem>
      <InfoItem label="Next expected">
        <span className={cn(next.overdue && 'font-medium text-warning')}>{next.text}</span>
        {job.nextExpectedAt ? (
          <span className="block text-xs text-muted-foreground">{formatDateTimeGb(job.nextExpectedAt)}</span>
        ) : null}
      </InfoItem>
      <InfoItem label="Last 24 hours">
        {formatSuccessRate(pct)} success
        <span className="block text-xs text-muted-foreground">
          {job.runs24h ?? 0} runs · {job.failures24h ?? 0} failed
        </span>
      </InfoItem>
    </dl>
  )
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 min-w-0 text-foreground">{children}</dd>
    </div>
  )
}

/* ─── Run history ───────────────────────────────────────────────────────── */

function RunHistory({ jobName, now }: { jobName: string; now: Date }) {
  const [status, setStatus] = React.useState<RunStatusFilter>('all')
  const [limit, setLimit] = React.useState(RUN_HISTORY_PAGE_SIZE)
  const query = useJobRuns(jobName, status, limit)
  const items = query.data?.items ?? []
  const canLoadMore = items.length >= limit && limit < RUN_HISTORY_MAX_LIMIT
  const filterId = `system-jobs-run-status-${jobName}`

  return (
    <section aria-labelledby="system-jobs-history-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="system-jobs-history-title" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="h-4 w-4 text-muted-foreground" aria-hidden />
          Run history
        </h3>
        <div className="flex items-center gap-2">
          <Label htmlFor={filterId} className="text-xs text-muted-foreground">
            Status
          </Label>
          <Select
            value={status}
            onValueChange={v => {
              setStatus(v as RunStatusFilter)
              setLimit(RUN_HISTORY_PAGE_SIZE)
            }}
          >
            <SelectTrigger id={filterId} className="h-8 w-36" aria-label="Filter runs by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RUN_STATUS_FILTERS.map(s => (
                <SelectItem key={s} value={s}>
                  {STATUS_FILTER_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isLoading ? (
        <div role="status" aria-busy="true" aria-label="Loading run history" className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : query.isError && !query.data ? (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-destructive">
            Could not load the run history. {extractApiErrorMessage(query.error)}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
            loading={query.isFetching}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}
          >
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {status === 'all' ? 'No runs recorded yet.' : `No ${STATUS_FILTER_LABELS[status].toLowerCase()} runs.`}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <div
            className="hidden grid-cols-[1.25rem_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid"
            aria-hidden
          >
            <span />
            <span>Started</span>
            <span>Finished</span>
            <span>Duration</span>
            <span>Source</span>
            <span>Status</span>
            <span>Triggered by</span>
          </div>
          <ul className="divide-y divide-border" aria-label="Runs" data-testid="system-jobs-runs">
            {items.map(run => (
              <RunItem key={run.id} run={run} now={now} />
            ))}
          </ul>
        </div>
      )}

      {items.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Showing {items.length} {items.length === 1 ? 'run' : 'runs'}
            {query.isFetching && !query.isLoading ? ' · updating…' : ''}
          </span>
          {canLoadMore ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setLimit(l => Math.min(RUN_HISTORY_MAX_LIMIT, l + RUN_HISTORY_PAGE_SIZE))}
              loading={query.isFetching && query.isPlaceholderData}
            >
              Load more
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function RunItem({ run, now }: { run: JobRun; now: Date }) {
  const [open, setOpen] = React.useState(false)
  const panelId = `run-${run.id}`
  const summary = formatSummaryJson(run.summary)
  const statusLabel = runStatusMeta(run.status).label
  return (
    <li data-testid={`system-jobs-run-${run.id}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${statusLabel} run started ${formatDateTimeSecondsGb(run.startedAt)}. ${open ? 'Hide' : 'Show'} details`}
        className={cn(
          'grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-3 py-2.5 text-left text-sm',
          'sm:grid-cols-[1.25rem_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)]',
          'hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          run.status === 'failed' && 'bg-destructive/[0.03]',
        )}
      >
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
        {/* Phone: started + status on the first line, the rest underneath. */}
        <span className="min-w-0">
          <span className="block truncate tabular-nums text-foreground" title={formatDateTimeSecondsGb(run.startedAt)}>
            {formatShortDateTimeSecondsGb(run.startedAt)}
          </span>
          <span className="block text-xs text-muted-foreground sm:hidden">
            {formatRelativeTime(run.startedAt, now)} · {run.status === 'running' ? 'in progress' : formatDurationMs(run.durationMs)} ·{' '}
            {sourceLabel(run.source)}
            {run.triggeredBy ? ` · ${run.triggeredBy}` : ''}
          </span>
        </span>
        <span
          className="hidden min-w-0 truncate tabular-nums text-foreground sm:block"
          title={run.finishedAt ? formatDateTimeSecondsGb(run.finishedAt) : undefined}
        >
          {run.finishedAt ? (
            isSameUkDay(run.startedAt, run.finishedAt) ? (
              formatTimeSecondsGb(run.finishedAt)
            ) : (
              formatShortDateTimeSecondsGb(run.finishedAt)
            )
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
        <span className="hidden tabular-nums text-foreground sm:block">
          {run.status === 'running' ? <span className="text-muted-foreground">running</span> : formatDurationMs(run.durationMs)}
        </span>
        <span className="hidden min-w-0 truncate text-foreground sm:block">{sourceLabel(run.source)}</span>
        <span className="justify-self-end sm:justify-self-start">
          <RunStatusBadge status={run.status} size="sm" />
        </span>
        <span className="hidden min-w-0 truncate text-foreground sm:block">
          {run.triggeredBy ?? <span className="text-muted-foreground">Schedule</span>}
        </span>
      </button>
      {open ? (
        <div id={panelId} className="space-y-3 border-t border-border bg-muted/20 px-3 py-3 text-sm">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Period</dt>
            <dd className="min-w-0 break-all font-mono text-foreground">{run.periodKey || '—'}</dd>
            <dt className="text-muted-foreground">Run ID</dt>
            <dd className="min-w-0 break-all font-mono text-foreground">{run.id}</dd>
            <dt className="text-muted-foreground">Started</dt>
            <dd className="min-w-0 text-foreground">{formatDateTimeSecondsGb(run.startedAt)}</dd>
            <dt className="text-muted-foreground">Finished</dt>
            <dd className="min-w-0 text-foreground">{run.finishedAt ? formatDateTimeSecondsGb(run.finishedAt) : '—'}</dd>
          </dl>
          {run.error ? <CodeBlock title="Error" text={run.error} tone="error" /> : null}
          {summary ? (
            <CodeBlock title="Summary" text={summary} />
          ) : (
            <p className="text-xs text-muted-foreground">No summary recorded for this run.</p>
          )}
        </div>
      ) : null}
    </li>
  )
}

function CodeBlock({ title, text, tone }: { title: string; text: string; tone?: 'error' }) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(id)
  }, [copied])

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toastSuccess(`${title} copied`)
    } catch {
      toastError('Could not copy', 'Your browser blocked clipboard access. Select the text and copy it instead.')
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-xs font-medium', tone === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
          {title}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => void onCopy()}
          leftIcon={copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          aria-label={`Copy ${title.toLowerCase()}`}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre
        className={cn(
          'max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border p-3 font-mono text-xs leading-relaxed',
          tone === 'error'
            ? 'border-destructive/30 bg-destructive/5 text-destructive'
            : 'border-border bg-background text-foreground',
        )}
      >
        {text}
      </pre>
    </div>
  )
}
