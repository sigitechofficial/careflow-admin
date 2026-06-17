import * as React from 'react'
import { ChevronDown, ChevronRight, Loader2, Pencil, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { ScheduleRunRow, ScheduleRunStatus, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { computeScheduleRunStats } from '@/features/scheduling/utils/schedule-run-stats.util'
import { scheduleRunAccentColor } from '@/features/scheduling/utils/schedule-run-board.util'
import { employeesLabel, formatJobTimeRange, serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import { Button } from '@/shared/ui/button'

const RUN_STATUS_LABELS: Record<ScheduleRunStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

function runCarerLabel(run: ScheduleRunRow): string {
  if (!run.employee) return 'Unassigned'
  return [run.employee.firstName, run.employee.lastName].filter(Boolean).join(' ') || 'Carer'
}

function runIsEditable(run: ScheduleRunRow): boolean {
  return run.status !== 'CANCELLED' && run.status !== 'COMPLETED'
}

type Props = {
  runs: ScheduleRunRow[]
  unassignedJobs: TimelineJob[]
  isLoading?: boolean
  travelBufferMinutes?: number
  onJobClick: (job: TimelineJob) => void
  onEditRun: (run: ScheduleRunRow) => void
  onAddToRun: (runId: string) => void
}

export function ScheduleRunsTable({
  runs,
  unassignedJobs,
  isLoading,
  travelBufferMinutes = 0,
  onJobClick,
  onEditRun,
  onAddToRun,
}: Props) {
  const [expandedRunIds, setExpandedRunIds] = React.useState<Set<string>>(new Set())

  const activeRuns = React.useMemo(
    () => runs.filter((run) => run.status !== 'CANCELLED'),
    [runs],
  )

  const toggleExpanded = (runId: string) => {
    setExpandedRunIds((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) next.delete(runId)
      else next.add(runId)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading runs…
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
            <tr className="border-b border-border text-left">
              <th className="w-8 px-2 py-2.5" aria-hidden />
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Run</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Carer</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground text-right">Visits</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Rostered</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Travel distance</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Travel time</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Wait time</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeRuns.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                  No runs for this day. Create a run (e.g. AM Run 1) and add visits from the rota board or
                  here.
                </td>
              </tr>
            ) : (
              activeRuns.map((run) => {
                const jobs = [...(run.jobs ?? [])].sort(
                  (a, b) => (a.runSequence ?? 0) - (b.runSequence ?? 0),
                )
                const stats = computeScheduleRunStats(jobs, travelBufferMinutes)
                const accent = scheduleRunAccentColor(run.id)
                const expanded = expandedRunIds.has(run.id)
                const editable = runIsEditable(run)

                return (
                  <React.Fragment key={run.id}>
                    <tr className="border-b border-border/70 hover:bg-muted/20">
                      <td className="px-2 py-2.5 align-middle">
                        {jobs.length > 0 ? (
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => toggleExpanded(run.id)}
                            aria-expanded={expanded}
                            aria-label={expanded ? 'Collapse visits' : 'Expand visits'}
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <button
                          type="button"
                          className="group flex max-w-[14rem] items-center gap-2 text-left"
                          onClick={() => onEditRun(run)}
                          disabled={!editable}
                        >
                          <span
                            className="h-8 w-1 shrink-0 rounded-full"
                            style={{ backgroundColor: accent.border }}
                            aria-hidden
                          />
                          <span>
                            <span className="block font-semibold text-foreground group-hover:underline">
                              {run.name}
                            </span>
                            {run.description ? (
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {run.description}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2.5 align-middle text-foreground">{runCarerLabel(run)}</td>
                      <td className="px-3 py-2.5 align-middle">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                            run.status === 'PUBLISHED' && 'border-sky-200 bg-sky-50 text-sky-900',
                            run.status === 'DRAFT' && 'border-border bg-muted text-muted-foreground',
                            run.status === 'IN_PROGRESS' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
                            run.status === 'COMPLETED' && 'border-border bg-muted text-muted-foreground',
                          )}
                        >
                          {RUN_STATUS_LABELS[run.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-middle text-right tabular-nums">{stats.visitCount}</td>
                      <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                        {stats.rosteredDisplayLabel}
                      </td>
                      <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                        {stats.travelDistanceLabel}
                      </td>
                      <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                        <span>{stats.travelMinutes > 0 ? stats.travelTimeDisplayLabel : '—'}</span>
                        {stats.travelPercentDisplayLabel ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {stats.travelPercentDisplayLabel}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                        {stats.waitMinutes > 0 ? stats.waitDisplayLabel : '—'}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => onEditRun(run)}
                            disabled={!editable}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          {editable ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => onAddToRun(run.id)}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Add visit
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>

                    {expanded
                      ? jobs.map((job) => (
                          <tr
                            key={job.id}
                            className="border-b border-border/50 bg-muted/15 hover:bg-muted/25"
                          >
                            <td />
                            <td colSpan={9} className="px-3 py-2">
                              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pl-4 text-sm">
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                    style={{ backgroundColor: accent.border }}
                                  >
                                    {job.runSequence ?? '·'}
                                  </span>
                                  <button
                                    type="button"
                                    className="font-medium text-foreground hover:underline"
                                    onClick={() => onJobClick(job)}
                                  >
                                    {serviceUserLabel(job.serviceUser)}
                                  </button>
                                </span>
                                <span className="text-muted-foreground">{formatJobTimeRange(job)}</span>
                                <span className="text-muted-foreground">{employeesLabel(job)}</span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="ml-auto h-7"
                                  onClick={() => onJobClick(job)}
                                >
                                  Open
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      : null}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>

        {unassignedJobs.length > 0 ? (
          <div className="border-t border-amber-300/80 bg-amber-50/40 dark:bg-amber-950/15">
            <div className="border-b border-amber-200/80 px-4 py-2 dark:border-amber-900">
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Unassigned visits</p>
              <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
                {unassignedJobs.length} visit{unassignedJobs.length === 1 ? '' : 's'} not on a run
              </p>
            </div>
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-amber-200/60 text-left dark:border-amber-900">
                  <th className="px-3 py-2 font-medium text-muted-foreground">Service user</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Time</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Carers</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {unassignedJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-amber-200/40 last:border-0 hover:bg-amber-100/40 dark:border-amber-900/40 dark:hover:bg-amber-950/25"
                  >
                    <td className="px-3 py-2.5">{serviceUserLabel(job.serviceUser)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatJobTimeRange(job)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{employeesLabel(job)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => onJobClick(job)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )
}
