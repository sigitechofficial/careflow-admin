import type { JobsDayRunsResponse } from '@/features/scheduling/types/scheduling.types'
import { scheduleRunAccentColor } from '@/features/scheduling/utils/schedule-run-board.util'
import { cn } from '@/shared/lib/utils'
import { Route } from 'lucide-react'

type Props = {
  runs: JobsDayRunsResponse['runs']
}

export function ScheduleJobsRunLegend({ runs }: Props) {
  const activeRuns = runs.filter((entry) => entry.jobs.length > 0)
  if (activeRuns.length === 0) return null

  return (
    <div data-schedule-run-legend className="flex flex-wrap items-center gap-2 border-b border-border/80 bg-muted/20 px-3 py-2">
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Route className="h-3 w-3" aria-hidden />
        Runs on board
      </span>
      {activeRuns.map(({ run, jobs }) => {
        const accent = scheduleRunAccentColor(run.id)
        const carerNames = new Set<string>()
        for (const job of jobs) {
          for (const allocation of job.allocations ?? []) {
            const name = [allocation.employee?.firstName, allocation.employee?.lastName]
              .filter(Boolean)
              .join(' ')
            if (name) carerNames.add(name)
          }
        }
        const carerLabel =
          carerNames.size > 0 ? [...carerNames].slice(0, 2).join(', ') : 'Unallocated'
        return (
          <span
            key={run.id}
            className={cn(
              'inline-flex max-w-[min(100%,14rem)] items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium',
            )}
            style={{
              borderColor: accent.border,
              backgroundColor: accent.bg,
              color: accent.text,
            }}
            title={`${jobs.length} visit(s) · ${carerLabel}${run.status ? ` · ${run.status}` : ''}`}
          >
            <span className="truncate font-semibold">{run.name}</span>
            <span className="shrink-0 opacity-80">({jobs.length})</span>
          </span>
        )
      })}
      <span className="text-[10px] text-muted-foreground">
        Visits in a run show the run name and stop number along the bottom of the job card.
      </span>
    </div>
  )
}
