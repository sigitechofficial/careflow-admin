import * as React from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ClipboardList, Loader2, Sun, User, AlertCircle } from 'lucide-react'
import { ScheduleJobRequiredCarersIcon } from '@/features/scheduling/components/ScheduleJobRequiredCarersIcon'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-elements'
import { listCarePlanFormsForRules } from '@/features/care-pathway/api/care-plan-recommendation-rules.api'
import { useScheduleDayRuns } from '@/features/scheduling/hooks/useScheduling'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  employeesLabel,
  formatJobTimeRange,
  jobNeedsAlert,
  serviceUserLabel,
  todayIso,
} from '@/features/scheduling/utils/scheduling-format'
import { ScheduleJobAllocateDialog } from '@/features/scheduling/components/ScheduleJobAllocateDialog'
import { ScheduleRunsPanel } from '@/features/scheduling/components/ScheduleRunsPanel'
import {
  buildCarePlanFormNameMap,
  formatLinkedCarePlanLabels,
  jobAttentionReason,
  timelineJobLinkedCarePlanIds,
  timelineJobVisitPlanSlot,
} from '@/features/scheduling/utils/scheduling-visit-plan.util'

type JobCardProps = {
  job: TimelineJob
  carePlanNameById: Map<string, string>
  onAssign: (job: TimelineJob) => void
}

function visitColor(job: TimelineJob): 'green' | 'yellow' | 'red' {
  if (job.status === 'NEEDS_ATTENTION' || job.underAllocated) return 'red'
  if (['COMPLETED', 'ALLOCATED', 'IN_PROGRESS'].includes(job.status)) return 'green'
  return 'yellow'
}

function VisitCard({ job, carePlanNameById, onAssign }: JobCardProps) {
  const color = visitColor(job)
  const bg =
    color === 'green' ? 'bg-[#86efac]' : color === 'red' ? 'bg-[#fecaca]' : 'bg-[#fde047]'
  const border =
    color === 'green' ? 'border-green-400' : color === 'red' ? 'border-red-400' : 'border-yellow-400'
  const alert = jobNeedsAlert(job)
  const attention = jobAttentionReason(job)
  const slotLabel = timelineJobVisitPlanSlot(job)
  const carePlans = formatLinkedCarePlanLabels(timelineJobLinkedCarePlanIds(job), carePlanNameById)
  const carers = employeesLabel(job)

  return (
    <button
      type="button"
      className={cn(
        'relative rounded p-2 min-w-[150px] max-w-[200px] border transition-all overflow-hidden shrink-0 text-left cursor-pointer hover:brightness-95',
        bg,
        border,
      )}
      title={attention ? `${attention} — click to assign carers` : 'Click to manage carers'}
      onClick={() => onAssign(job)}
    >
      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
        {serviceUserLabel(job.serviceUser)}
      </p>
      {slotLabel ? (
        <p className="text-[10px] font-medium text-slate-700 dark:text-slate-200 leading-tight mt-0.5 truncate">{slotLabel}</p>
      ) : null}
      <p className="text-[10px] text-slate-700 dark:text-slate-200 leading-tight mt-0.5">{formatJobTimeRange(job)}</p>
      <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-tight truncate flex items-center gap-1 mt-0.5">
        <ClipboardList className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate">{carePlans}</span>
      </p>
      <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-tight truncate flex items-center gap-1 mt-0.5">
        <User className="h-3 w-3 shrink-0" aria-hidden />
        <span className="truncate">{carers}</span>
      </p>
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        {job.requiredCarers > 1 ? (
          <ScheduleJobRequiredCarersIcon requiredCarers={job.requiredCarers} className="h-3 w-3 text-slate-600 dark:text-slate-300" />
        ) : null}
        {alert ? <AlertCircle className="h-3 w-3 text-red-600" aria-hidden /> : null}
        {job.scheduleRun ? (
          <span
            className="text-[9px] font-semibold text-slate-800 dark:text-slate-100 bg-white/70 px-1 rounded"
            title={`In run: ${job.scheduleRun.name}`}
          >
            Run {job.runSequence ?? '·'}
          </span>
        ) : null}
        {attention ? (
          <span className="text-[9px] font-semibold uppercase tracking-wide text-red-800 bg-red-100/80 px-1 rounded">
            Attention
          </span>
        ) : null}
      </div>
    </button>
  )
}

function JobCard({ job, carePlanNameById, onAssign }: JobCardProps) {
  const alert = jobNeedsAlert(job)
  const attention = jobAttentionReason(job)
  const slotLabel = timelineJobVisitPlanSlot(job)
  const carePlans = formatLinkedCarePlanLabels(timelineJobLinkedCarePlanIds(job), carePlanNameById)
  const carers = employeesLabel(job)

  return (
    <button
      type="button"
      className={cn(
        'relative w-full rounded-sm border-l-2 px-2 py-1.5 transition-colors overflow-hidden text-left cursor-pointer hover:brightness-95',
        alert ? 'bg-amber-50/80 border-amber-500' : 'bg-slate-200/80 border-slate-400 dark:border-border',
      )}
      title={attention ? `${attention} — click to assign carers` : 'Click to manage carers'}
      onClick={() => onAssign(job)}
    >
      <p className="relative text-xs font-semibold text-slate-800 dark:text-slate-100 leading-tight truncate">
        {serviceUserLabel(job.serviceUser)}
      </p>
      {slotLabel ? (
        <p className="text-[10px] font-medium text-slate-700 dark:text-slate-200 truncate">{slotLabel}</p>
      ) : (
        <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">{job.jobName}</p>
      )}
      <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5">{formatJobTimeRange(job)}</p>
      <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">{carePlans}</p>
      <div className="relative flex items-center justify-between mt-0.5 gap-1">
        <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">{carers}</p>
        <div className="flex items-center gap-1 shrink-0">
          {job.requiredCarers > 1 ? (
            <ScheduleJobRequiredCarersIcon requiredCarers={job.requiredCarers} className="h-3 w-3 text-slate-500 dark:text-slate-400" />
          ) : null}
          {alert ? <AlertCircle className="h-3 w-3 text-red-500" aria-hidden /> : null}
        </div>
      </div>
      {attention ? (
        <p className="text-[10px] font-medium text-amber-800 mt-0.5">{attention}</p>
      ) : null}
    </button>
  )
}

export default function ViewSchedulePage() {
  const hasApi = !!getApiBaseUrl()
  const search = useSearch({ strict: false }) as { date?: string }
  const [date, setDate] = React.useState(search.date ?? todayIso())
  const [allocateJobId, setAllocateJobId] = React.useState<string | null>(null)
  const [allocateOpen, setAllocateOpen] = React.useState(false)

  React.useEffect(() => {
    if (search.date) setDate(search.date)
  }, [search.date])

  const { data, isLoading, isError, refetch } = useScheduleDayRuns(date, hasApi, { limit: 300 })

  const openAllocate = (job: TimelineJob) => {
    setAllocateJobId(job.id)
    setAllocateOpen(true)
  }

  const carePlanFormsQuery = useQuery({
    queryKey: ['care-plan-forms-catalog'],
    queryFn: listCarePlanFormsForRules,
    enabled: hasApi,
    staleTime: 5 * 60_000,
  })

  const carePlanNameById = React.useMemo(
    () => buildCarePlanFormNameMap(carePlanFormsQuery.data ?? []),
    [carePlanFormsQuery.data],
  )

  const runs = data?.runs ?? []
  const unassigned = data?.unassignedJobs ?? []
  const allJobs = [...runs.flatMap((r) => r.jobs), ...unassigned]
  const attentionJobs = allJobs.filter((job) => jobNeedsAlert(job) || jobAttentionReason(job))
  const allocateJob = allocateJobId ? allJobs.find((j) => j.id === allocateJobId) ?? null : null

  const staffForRun = (jobs: TimelineJob[]) => {
    const names = new Set<string>()
    for (const job of jobs) {
      for (const a of job.allocations ?? []) {
        const n = [a.employee?.firstName, a.employee?.lastName].filter(Boolean).join(' ')
        if (n) names.add(n)
      }
    }
    return [...names]
  }

  if (!hasApi) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL to load the schedule.</div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-5 md:p-6">
      <div className="flex flex-col h-full min-h-0 w-full bg-background space-y-4">
        <PageHeader
          title="View Schedule"
          description="Build, review, and manage daily schedules and runs."
          breadcrumb={[
            { label: 'Home', href: '/' },
            { label: 'Scheduling' },
            { label: 'View Schedule' },
          ]}
        />

        {attentionJobs.length > 0 && !isLoading ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">
                  {attentionJobs.length} job{attentionJobs.length === 1 ? '' : 's'} need attention
                </p>
                <p className="mt-0.5 text-xs opacity-90">
                  Click a highlighted job to assign carers directly on the rota, or update the visit plan for future
                  visits.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="border-b border-border px-4 py-2 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 rounded-md border border-border px-3 text-sm bg-background"
            />
            <Button size="sm" variant="secondary" asChild>
              <Link to="/scheduling/build">Build Schedule</Link>
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Refresh
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link to="/scheduling/jobs">Housekeeping</Link>
            </Button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" asChild>
                <Link to="/scheduling/report">Reports</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/scheduling/list" search={{ date }}>
                  List view
                </Link>
              </Button>
            </div>
          </div>
          <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
            {isLoading && (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule…
              </span>
            )}
            {isError && <span className="text-destructive">Failed to load schedule. Check API and permissions.</span>}
            {!isLoading && !isError && (
              <span>
                {data?.date ?? date}: {allJobs.length} job(s), {runs.length} run(s)
                {attentionJobs.length > 0 ? ` · ${attentionJobs.length} need attention` : ''}
              </span>
            )}
          </div>
        </div>

        <ScheduleRunsPanel date={date} unassignedJobs={unassigned} onChanged={() => void refetch()} />

        <div className="flex flex-1 min-h-[480px] overflow-hidden bg-card rounded-xl border border-border shadow-sm">
          <div className="w-[250px] shrink-0 border-r border-border bg-card overflow-y-auto">
            <div className="px-2 py-2 text-xs font-semibold text-muted-foreground border-b">All jobs</div>
            <div className="p-2 space-y-1">
              {allJobs.length === 0 && !isLoading && (
                <p className="text-xs text-muted-foreground p-2">No jobs for this date.</p>
              )}
              {allJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  carePlanNameById={carePlanNameById}
                  onAssign={openAllocate}
                />
              ))}
            </div>
          </div>

          <div className="w-[180px] shrink-0 border-r border-border bg-card overflow-y-auto">
            <div className="px-3 py-2 text-center font-semibold text-sm border-b bg-muted/40">Runs</div>
            <div className="divide-y divide-border">
              {runs.map(({ run, jobs }) => (
                <div key={run.id} className="px-3 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sun className="h-5 w-5 text-yellow-400 shrink-0" />
                    <span className="text-sm font-semibold flex-1 truncate">{run.name}</span>
                    <span className="h-5 min-w-5 px-1 rounded-sm bg-muted text-[10px] font-bold flex items-center justify-center">
                      {run.sortOrder ?? '—'}
                    </span>
                  </div>
                  <div className="space-y-0.5 pl-7">
                    {staffForRun(jobs).map((s) => (
                      <p key={s} className="text-[11px] text-muted-foreground leading-tight">
                        {s}
                      </p>
                    ))}
                    {staffForRun(jobs).length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic">Unallocated</p>
                    )}
                  </div>
                </div>
              ))}
              {unassigned.length > 0 && (
                <div className="px-3 py-3">
                  <p className="text-sm font-semibold">Unassigned</p>
                  <p className="text-[11px] text-muted-foreground">{unassigned.length} job(s)</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 overflow-auto bg-background">
            <div className="sticky top-0 z-10 bg-card border-b px-4 py-2 flex items-center gap-3">
              <Sun className="h-6 w-6 text-yellow-400" />
              <span className="text-sm font-semibold">{date}</span>
            </div>
            <div className="divide-y divide-border">
              {runs.map(({ run, jobs }, idx) => (
                <div key={run.id} className="flex items-stretch min-h-[96px]">
                  <div className="w-14 shrink-0 flex items-center justify-center bg-muted/30 border-r">
                    <span className="text-xs font-bold text-muted-foreground -rotate-90 whitespace-nowrap">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2 flex-1">
                    {jobs.map((job) => (
                      <VisitCard
                        key={job.id}
                        job={job}
                        carePlanNameById={carePlanNameById}
                        onAssign={openAllocate}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ScheduleJobAllocateDialog
        open={allocateOpen}
        onOpenChange={(open) => {
          setAllocateOpen(open)
          if (!open) setAllocateJobId(null)
        }}
        job={allocateJob}
        onAllocated={() => void refetch()}
      />
    </div>
  )
}
