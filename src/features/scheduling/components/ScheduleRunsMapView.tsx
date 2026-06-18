import * as React from 'react'
import { Loader2, Map } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { ScheduleRunRouteMap } from '@/features/scheduling/components/ScheduleRunRouteMap'
import type { ScheduleRunRow, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { ScheduleRunsDisplayPreferences } from '@/features/scheduling/utils/schedule-runs-display-preferences.util'
import { runVisitDisplayName } from '@/features/scheduling/utils/schedule-runs-display-preferences.util'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { scheduleRunAccentColor } from '@/features/scheduling/utils/schedule-run-board.util'
import { computeScheduleRunStats } from '@/features/scheduling/utils/schedule-run-stats.util'

type Props = {
  runs: ScheduleRunRow[]
  isLoading?: boolean
  travelBufferMinutes?: number
  selectedRunId: string | null
  onSelectRun: (runId: string) => void
  displayPreferences?: ScheduleRunsDisplayPreferences
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
}

export function ScheduleRunsMapView({
  runs,
  isLoading,
  travelBufferMinutes = 0,
  selectedRunId,
  onSelectRun,
  displayPreferences,
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
}: Props) {
  const activeRuns = React.useMemo(
    () => runs.filter((run) => run.status !== 'CANCELLED'),
    [runs],
  )

  const selectedRun =
    activeRuns.find((run) => run.id === selectedRunId) ?? activeRuns[0] ?? null

  React.useEffect(() => {
    if (selectedRunId || activeRuns.length === 0) return
    onSelectRun(activeRuns[0]!.id)
  }, [activeRuns, onSelectRun, selectedRunId])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading runs…
      </div>
    )
  }

  if (activeRuns.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground">
        <Map className="h-10 w-10 opacity-30" aria-hidden />
        <p>No runs for this day. Create a run and add visits to view the route map.</p>
      </div>
    )
  }

  const jobs = [...(selectedRun?.jobs ?? [])].sort(
    (a, b) => (a.runSequence ?? 0) - (b.runSequence ?? 0),
  )
  const stats = computeScheduleRunStats(jobs, travelBufferMinutes)
  const stopNameForJob = React.useCallback(
    (job: TimelineJob) =>
      displayPreferences
        ? runVisitDisplayName(job, displayPreferences, {
            visitPlanSlotsByServiceUser,
            acceptedCarePlansByServiceUser,
          })
        : job.serviceUser.preferredName ||
          [job.serviceUser.firstName, job.serviceUser.lastName].filter(Boolean).join(' ') ||
          job.serviceUser.id,
    [acceptedCarePlansByServiceUser, displayPreferences, visitPlanSlotsByServiceUser],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <aside className="shrink-0 border-b border-border lg:w-56 lg:border-b-0 lg:border-r">
        <p className="border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Runs
        </p>
        <div className="max-h-48 overflow-y-auto lg:max-h-none">
          {activeRuns.map((run) => {
            const accent = scheduleRunAccentColor(run.id)
            const selected = run.id === selectedRun?.id
            const visitCount = (run.jobs ?? []).length
            return (
              <button
                key={run.id}
                type="button"
                onClick={() => onSelectRun(run.id)}
                className={cn(
                  'flex w-full items-start gap-2 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0',
                  selected ? 'bg-primary/5' : 'hover:bg-muted/40',
                )}
              >
                <span
                  className="mt-1 h-8 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: accent.border }}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{run.name}</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {visitCount} visit{visitCount === 1 ? '' : 's'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4">
        {selectedRun ? (
          <>
            <div className="mb-3 shrink-0">
              <h3 className="text-base font-semibold text-foreground">{selectedRun.name}</h3>
              <p className="text-xs text-muted-foreground">
                {stats.visitCount} visit{stats.visitCount === 1 ? '' : 's'} ·{' '}
                {stats.travelDistanceLabel} travel · {stats.rosteredDisplayLabel} rostered
              </p>
            </div>
            <div className="min-h-0 flex-1">
              <ScheduleRunRouteMap jobs={jobs} height={480} className="h-full" stopNameForJob={stopNameForJob} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
