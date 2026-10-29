import * as React from 'react'
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react'
import { useRunCarerPreview } from '@/features/scheduling/hooks/useScheduleRuns'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import { useScheduleJobsDisplayFormat } from '@/features/scheduling/context/schedule-jobs-display-format.context'

type RunCarerPreview = NonNullable<ReturnType<typeof useRunCarerPreview>['data']>

function hours(value: number | null | undefined): string {
  if (value == null) return '—'
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}h`
}

/** Run outcome summary for a toast: on the visits, sent to a manager, could not. */
export function runCarerOutcomeText(result: {
  synced?: number
  approvalRequested?: unknown[]
  warnings?: unknown[]
}): { tone: 'success' | 'warning'; text: string } {
  const on = result.synced ?? 0
  const waiting = result.approvalRequested?.length ?? 0
  const failed = result.warnings?.length ?? 0
  const parts = [`${on} visit${on === 1 ? '' : 's'} allocated to the carer`]
  if (waiting) parts.push(`${waiting} sent to a manager (over the weekly hours)`)
  if (failed) parts.push(`${failed} could not be allocated`)
  return { tone: waiting || failed ? 'warning' : 'success', text: `${parts.join(' · ')}.` }
}

type Props = {
  employeeId: string
  employeeName?: string | null
  /** The run's visits, in run order. */
  jobs: TimelineJob[]
  /** The run carer takes the place of whoever holds a one-carer visit. */
  replaceExisting?: boolean
  /** Changing the run's carer: the previous one comes off the visits first. */
  releaseEmployeeId?: string | null
}

/**
 * What saving would do once a carer is chosen: the carer's weekly hours with these visits, and
 * for each visit whether the carer goes on it, waits for a manager, or can't be allocated.
 * Nothing is saved.
 */
export function RunCarerPreviewPanel({ employeeId, employeeName, jobs, replaceExisting, releaseEmployeeId }: Props) {
  const displayFormat = useScheduleJobsDisplayFormat()
  const input = React.useMemo(
    () =>
      employeeId && jobs.length
        ? {
            employeeId,
            visitIds: jobs.map((j) => j.id),
            replaceExisting: replaceExisting || undefined,
            releaseEmployeeId: releaseEmployeeId || undefined,
          }
        : null,
    [employeeId, jobs, replaceExisting, releaseEmployeeId],
  )
  const preview = useRunCarerPreview(input)
  if (!input) return null

  const jobById = new Map(jobs.map((j) => [j.id, j]))
  const visitLabel = (jobId: string) => {
    const job = jobById.get(jobId)
    if (!job) return 'Visit'
    return `${displayFormat.formatTime(job.scheduledStartDateTime)}–${displayFormat.formatTime(
      job.scheduledEndDateTime ?? job.scheduledStartDateTime,
    )} · ${serviceUserLabel(job.serviceUser)}`
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3 text-xs" data-testid="run-carer-preview">
      <p className="text-sm font-medium text-foreground">
        What happens when you save{employeeName ? ` — ${employeeName}` : ''}
      </p>
      {preview.isLoading ? (
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Checking the carer&apos;s weekly hours and the visits…
        </p>
      ) : preview.isError || !preview.data ? (
        <p className="text-muted-foreground">Couldn&apos;t check the visits. Saving still checks each one.</p>
      ) : (
        <PreviewBody data={preview.data} visitLabel={visitLabel} formatDate={displayFormat.formatDate} />
      )}
    </div>
  )
}

function PreviewBody({
  data,
  visitLabel,
  formatDate,
}: {
  data: RunCarerPreview
  visitLabel: (jobId: string) => string
  formatDate: (iso: string) => string
}) {
  return (
    <>
      {data.weeks.map((w) => {
        const over = w.limitHours != null && w.afterHours > w.limitHours
        return (
          <p key={w.weekStart} className={over ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}>
            Week of {formatDate(w.weekStart)}: {hours(w.beforeHours)} now → {hours(w.afterHours)} with this run · limit{' '}
            {hours(w.limitHours)}
            {w.extraHours ? ` (incl. ${hours(w.extraHours)} extra)` : ''}
            {over ? ' — over the limit' : ''}
          </p>
        )
      })}
      <ul className="space-y-1">
        {data.visits.map((v) => (
          <li key={v.jobId} className="flex items-start gap-1.5">
            {v.outcome === 'BLOCKED' ? (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden />
            ) : v.outcome === 'NEEDS_APPROVAL' ? (
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
            ) : (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
            )}
            <span>
              <span className="text-foreground">{visitLabel(v.jobId)}</span> —{' '}
              {v.outcome === 'ALREADY' ? (
                <span className="text-muted-foreground">already on this visit</span>
              ) : v.outcome === 'ALLOCATE' ? (
                <span className="text-emerald-700 dark:text-emerald-400">
                  goes on this visit
                  {v.replaceNames.length ? `, taking the place of ${v.replaceNames.join(', ')}` : ''}
                  {v.overWeeklyHours ? ' (goes over the weekly hours)' : ''}
                </span>
              ) : v.outcome === 'NEEDS_APPROVAL' ? (
                <span className="text-amber-700 dark:text-amber-400">
                  over the weekly hours: a manager must approve first
                  {v.replaceNames.length ? ` — ${v.replaceNames.join(', ')} stays on it until then` : ''}
                </span>
              ) : (
                <span className="text-destructive">won&apos;t be allocated: {v.message}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
