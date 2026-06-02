import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2, Sun, Users, AlertCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-elements'
import { useScheduleDayRuns } from '@/features/scheduling/hooks/useScheduling'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  formatJobTimeRange,
  jobNeedsAlert,
  serviceUserLabel,
  todayIso,
} from '@/features/scheduling/utils/scheduling-format'

function visitColor(job: TimelineJob): 'green' | 'yellow' {
  if (['COMPLETED', 'ALLOCATED', 'CONFIRMED', 'IN_PROGRESS'].includes(job.status)) return 'green'
  return 'yellow'
}

function VisitCard({ job }: { job: TimelineJob }) {
  const color = visitColor(job)
  const bg = color === 'green' ? 'bg-[#86efac]' : 'bg-[#fde047]'
  const border = color === 'green' ? 'border-green-400' : 'border-yellow-400'
  const alert = jobNeedsAlert(job)
  const group = job.requiredCarers > 1
  return (
    <div className={cn(
      'relative rounded p-1.5 min-w-[120px] max-w-[160px] border cursor-pointer hover:brightness-95 transition-all overflow-hidden shrink-0',
      bg, border,
    )}>
      <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{serviceUserLabel(job.serviceUser)}</p>
      <p className="text-[10px] text-slate-700 leading-tight mt-0.5">{formatJobTimeRange(job)}</p>
      <p className="text-[10px] text-slate-600 leading-tight truncate">{job.jobName}</p>
      <div className="flex items-center gap-1 mt-1">
        {group && <Users className="h-3 w-3 text-slate-600" />}
        {alert && <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0 inline-block" />}
      </div>
    </div>
  )
}

function JobCard({ job }: { job: TimelineJob }) {
  const alert = jobNeedsAlert(job)
  const group = job.requiredCarers > 1
  return (
    <div className="relative rounded-sm bg-slate-200/80 border-l-2 border-slate-400 px-2 py-1.5 cursor-pointer hover:bg-slate-300/60 transition-colors overflow-hidden">
      <p className="relative text-xs font-semibold text-slate-800 leading-tight truncate">
        {serviceUserLabel(job.serviceUser)} â€” {job.jobName}
      </p>
      <div className="relative flex items-center justify-between mt-0.5">
        <p className="text-[11px] text-slate-600">{formatJobTimeRange(job)}</p>
        <div className="flex items-center gap-1">
          {group && <Users className="h-3 w-3 text-slate-500" />}
          {alert && <AlertCircle className="h-3 w-3 text-red-500" />}
        </div>
      </div>
    </div>
  )
}

export default function ViewSchedulePage() {
  const hasApi = !!getApiBaseUrl()
  const [date, setDate] = React.useState(todayIso())

  const { data, isLoading, isError, refetch } = useScheduleDayRuns(date, hasApi, { limit: 300 })

  const runs = data?.runs ?? []
  const unassigned = data?.unassignedJobs ?? []
  const allJobs = [...runs.flatMap(r => r.jobs), ...unassigned]

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

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="border-b border-border px-4 py-2 flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
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
                <Link to="/scheduling/list">List view</Link>
              </Button>
            </div>
          </div>
          <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
            {isLoading && (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading scheduleâ€¦
              </span>
            )}
            {isError && <span className="text-destructive">Failed to load schedule. Check API and permissions.</span>}
            {!isLoading && !isError && (
              <span>
                {data?.date ?? date}: {allJobs.length} job(s), {runs.length} run(s)
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 min-h-[480px] overflow-hidden bg-card rounded-xl border border-border shadow-sm">
          <div className="w-[230px] shrink-0 border-r border-border bg-card overflow-y-auto">
            <div className="px-2 py-2 text-xs font-semibold text-muted-foreground border-b">All jobs</div>
            <div className="p-2 space-y-1">
              {allJobs.length === 0 && !isLoading && (
                <p className="text-xs text-muted-foreground p-2">No jobs for this date.</p>
              )}
              {allJobs.map(job => (
                <JobCard key={job.id} job={job} />
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
                      {run.sortOrder ?? 'â€”'}
                    </span>
                  </div>
                  <div className="space-y-0.5 pl-7">
                    {staffForRun(jobs).map(s => (
                      <p key={s} className="text-[11px] text-muted-foreground leading-tight">{s}</p>
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
                <div key={run.id} className="flex items-stretch min-h-[80px]">
                  <div className="w-14 shrink-0 flex items-center justify-center bg-muted/30 border-r">
                    <span className="text-xs font-bold text-muted-foreground -rotate-90 whitespace-nowrap">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-2 flex-1">
                    {jobs.map(job => (
                      <VisitCard key={job.id} job={job} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
