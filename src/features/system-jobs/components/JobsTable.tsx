import { History, Play } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { formatDateTimeGb, formatDurationMs, formatRelativeTime } from '@/shared/lib/time-format'
import type { SystemJob } from '@/features/system-jobs/types'
import {
  describeNextExpected,
  formatSuccessRate,
  normalizeSuccessRate,
  runNowAvailability,
  sourceLabel,
  successRateTone,
} from '@/features/system-jobs/lib/system-jobs-format'
import {
  Hint,
  InfoHint,
  JobHealthBadge,
  RunStatusBadge,
  TriggerBadge,
} from '@/features/system-jobs/components/SystemJobsBadges'

export interface JobsTableProps {
  jobs: SystemJob[]
  /** "Now" on the server clock, for relative times. */
  now: Date
  canManage: boolean
  isRunPending: (name: string) => boolean
  onViewHistory: (job: SystemJob) => void
  onRunNow: (job: SystemJob) => void
}

const RATE_TONE_CLASS = {
  good: 'text-success',
  mixed: 'text-warning',
  bad: 'text-destructive',
  none: 'text-muted-foreground',
} as const

/** Desktop table (xl and up) + stacked cards below; both read the same rows. */
export function JobsTable(props: JobsTableProps) {
  const { jobs } = props
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm xl:block">
        <table className="w-full text-sm" aria-label="System jobs" data-testid="system-jobs-table">
          <thead className="whitespace-nowrap border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5">Job</th>
              <th scope="col" className="px-3 py-2.5">Runs on</th>
              <th scope="col" className="px-3 py-2.5">Schedule</th>
              <th scope="col" className="px-3 py-2.5">Health</th>
              <th scope="col" className="px-3 py-2.5">Last run</th>
              <th scope="col" className="px-3 py-2.5">Next expected</th>
              <th scope="col" className="px-3 py-2.5">Last 24 h</th>
              <th scope="col" className="px-4 py-2.5 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.map(job => (
              <JobRow key={job.name} job={job} {...props} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 md:grid-cols-2 xl:hidden" aria-label="System jobs" data-testid="system-jobs-cards">
        {jobs.map(job => (
          <JobCard key={job.name} job={job} {...props} />
        ))}
      </ul>
    </>
  )
}

type RowProps = Omit<JobsTableProps, 'jobs'> & { job: SystemJob }

function JobRow({ job, now, canManage, isRunPending, onViewHistory, onRunNow }: RowProps) {
  return (
    <tr className="align-top hover:bg-muted/30" data-testid={`system-job-row-${job.name}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="font-medium text-foreground">{job.label}</span>
          {job.description ? <InfoHint label={`About ${job.label}`} content={job.description} /> : null}
        </div>
        <code className="text-xs text-muted-foreground">{job.name}</code>
      </td>
      <td className="px-3 py-3">
        <TriggerBadge trigger={job.trigger} />
      </td>
      <td className="px-3 py-3">
        <ScheduleText job={job} />
      </td>
      <td className="px-3 py-3">
        <JobHealthBadge health={job.health} />
      </td>
      <td className="px-3 py-3">
        <LastRunCell job={job} now={now} />
      </td>
      <td className="px-3 py-3">
        <NextExpectedText job={job} now={now} />
      </td>
      <td className="px-3 py-3">
        <SuccessRateCell job={job} />
      </td>
      <td className="px-4 py-3">
        <JobActions
          job={job}
          canManage={canManage}
          pending={isRunPending(job.name)}
          onViewHistory={onViewHistory}
          onRunNow={onRunNow}
          className="justify-end"
        />
      </td>
    </tr>
  )
}

function JobCard({ job, now, canManage, isRunPending, onViewHistory, onRunNow }: RowProps) {
  return (
    <li
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
      data-testid={`system-job-card-${job.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">{job.label}</h3>
          <code className="break-all text-xs text-muted-foreground">{job.name}</code>
        </div>
        <JobHealthBadge health={job.health} />
      </div>
      {job.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{job.description}</p> : null}
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Runs on</dt>
        <dd className="min-w-0">
          <TriggerBadge trigger={job.trigger} />
        </dd>
        <dt className="text-muted-foreground">Schedule</dt>
        <dd className="min-w-0">
          <ScheduleText job={job} />
        </dd>
        <dt className="text-muted-foreground">Last run</dt>
        <dd className="min-w-0">
          <LastRunCell job={job} now={now} />
        </dd>
        <dt className="text-muted-foreground">Next</dt>
        <dd className="min-w-0">
          <NextExpectedText job={job} now={now} />
        </dd>
        <dt className="text-muted-foreground">Last 24 h</dt>
        <dd className="min-w-0">
          <SuccessRateCell job={job} />
        </dd>
      </dl>
      <JobActions
        job={job}
        canManage={canManage}
        pending={isRunPending(job.name)}
        onViewHistory={onViewHistory}
        onRunNow={onRunNow}
        className="mt-auto [&>*]:flex-1"
      />
    </li>
  )
}

function ScheduleText({ job }: { job: SystemJob }) {
  const human = job.schedule?.human || job.schedule?.cron || '—'
  const cron = job.schedule?.cron
  if (!cron) return <span className="text-foreground">{human}</span>
  return (
    <Hint content={<span>Cron (UTC): <code>{cron}</code></span>}>
      <button
        type="button"
        className="rounded-sm text-left text-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${human}. Cron expression ${cron}, UTC`}
      >
        {human}
      </button>
    </Hint>
  )
}

function LastRunCell({ job, now }: { job: SystemJob; now: Date }) {
  const run = job.lastRun
  if (!run) return <span className="text-muted-foreground">Never</span>
  const when = run.finishedAt ?? run.startedAt
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <time dateTime={when} title={formatDateTimeGb(when)} className="text-foreground">
          {formatRelativeTime(run.startedAt, now)}
        </time>
        <RunStatusBadge status={run.status} size="sm" />
      </div>
      <p className="text-xs text-muted-foreground">
        {run.status === 'running' ? 'in progress' : formatDurationMs(run.durationMs)} · {sourceLabel(run.source)}
      </p>
    </div>
  )
}

function NextExpectedText({ job, now }: { job: SystemJob; now: Date }) {
  const next = describeNextExpected(job.nextExpectedAt, now)
  return (
    <time
      dateTime={job.nextExpectedAt ?? undefined}
      title={job.nextExpectedAt ? formatDateTimeGb(job.nextExpectedAt) : undefined}
      className={cn(next.overdue ? 'font-medium text-warning' : 'text-foreground')}
    >
      {next.text}
    </time>
  )
}

function SuccessRateCell({ job }: { job: SystemJob }) {
  const pct = normalizeSuccessRate(job.successRate24h, job.runs24h, job.failures24h)
  const tone = successRateTone(pct)
  return (
    <div className="space-y-0.5">
      <span className={cn('font-medium tabular-nums', RATE_TONE_CLASS[tone])}>{formatSuccessRate(pct)}</span>
      <p className="text-xs text-muted-foreground">
        {job.runs24h ?? 0} {job.runs24h === 1 ? 'run' : 'runs'}
        {job.failures24h ? (
          <span className="text-destructive">
            {' '}
            · {job.failures24h} failed
          </span>
        ) : null}
      </p>
    </div>
  )
}

export function JobActions({
  job,
  canManage,
  pending,
  onViewHistory,
  onRunNow,
  className,
}: {
  job: SystemJob
  canManage: boolean
  pending: boolean
  onViewHistory: (job: SystemJob) => void
  onRunNow: (job: SystemJob) => void
  className?: string
}) {
  const availability = runNowAvailability(job, { canManage, pending })
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onViewHistory(job)}
        leftIcon={<History className="h-3.5 w-3.5" aria-hidden />}
        aria-label={`View history for ${job.label}`}
      >
        History
      </Button>
      {availability.visible ? (
        <RunNowButton
          label={job.label}
          pending={pending}
          disabled={availability.disabled}
          reason={availability.reason}
          onClick={() => onRunNow(job)}
        />
      ) : null}
    </div>
  )
}

export function RunNowButton({
  label,
  pending,
  disabled,
  reason,
  onClick,
  size = 'sm',
}: {
  label: string
  pending: boolean
  disabled: boolean
  reason: string | null
  onClick: () => void
  size?: 'sm' | 'default'
}) {
  const button = (
    <Button
      size={size}
      variant="subtle"
      onClick={onClick}
      disabled={disabled}
      loading={pending}
      leftIcon={pending ? undefined : <Play className="h-3.5 w-3.5" aria-hidden />}
      aria-label={pending ? `${label} is running` : `Run ${label} now`}
    >
      {pending ? 'Running…' : 'Run now'}
    </Button>
  )
  if (!disabled || !reason || pending) return button
  // Disabled buttons do not fire pointer events: wrap so the reason still shows on hover/focus.
  return (
    <Hint content={reason}>
      <span
        tabIndex={0}
        className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&>button]:w-full"
        aria-label={`Run ${label} now is unavailable: ${reason}`}
      >
        {button}
      </span>
    </Hint>
  )
}
