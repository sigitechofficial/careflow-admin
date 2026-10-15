import * as React from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { AlertTriangle, Eye, FilterX, RefreshCw, Timer } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/misc'
import { extractApiErrorMessage, toastError, toastInfo, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { formatDurationMs } from '@/shared/lib/time-format'
import { useAuthStore } from '@/features/auth/store'
import { useRunJobNow, useSystemJobs } from '@/features/system-jobs/hooks/useSystemJobs'
import {
  validateSystemJobsSearch,
  type JobHealthFilter,
  type SystemJob,
  type SystemJobsSearch,
} from '@/features/system-jobs/types'
import {
  HEALTH_FILTER_LABELS,
  countJobs,
  describeRunOutcome,
  filterJobs,
  isRateLimitError,
  isTimeoutError,
  runNowWarning,
  serverClockOffsetMs,
} from '@/features/system-jobs/lib/system-jobs-format'
import { CronModeBanner, RefreshBar } from '@/features/system-jobs/components/CronModeBanner'
import { JobSummaryCards } from '@/features/system-jobs/components/JobSummaryCards'
import { JobsTable } from '@/features/system-jobs/components/JobsTable'
import { JobDetailSheet } from '@/features/system-jobs/components/JobDetailSheet'
import { RunNowDialog } from '@/features/system-jobs/components/RunNowDialog'
import { HealthLegend } from '@/features/system-jobs/components/HealthLegend'

export default function SystemJobsPage() {
  const navigate = useNavigate()
  const search = useRouterState({
    select: s => validateSystemJobsSearch(s.location.search as Record<string, unknown>),
  })
  const healthFilter: JobHealthFilter = search.health ?? 'all'
  const canManage = useAuthStore(s => s.can('system_jobs.manage'))

  const query = useSystemJobs()
  const runner = useRunJobNow()
  const [confirmJob, setConfirmJob] = React.useState<SystemJob | null>(null)

  const items = React.useMemo(() => query.data?.items ?? [], [query.data])
  const counts = React.useMemo(() => countJobs(items), [items])
  const visibleJobs = React.useMemo(() => filterJobs(items, healthFilter), [items, healthFilter])

  // Relative times use the API clock (offset from the last fetch) so a skewed laptop clock doesn't mislead.
  const offsetMs = serverClockOffsetMs(query.data?.serverTime, query.dataUpdatedAt)
  const now = new Date(Date.now() + offsetMs)

  const setSearch = React.useCallback(
    (patch: Partial<SystemJobsSearch>) => {
      const next: SystemJobsSearch = { ...search, ...patch }
      void navigate({
        to: '/system-jobs',
        search: {
          ...(next.job ? { job: next.job } : {}),
          ...(next.health && next.health !== 'all' ? { health: next.health } : {}),
        } as Record<string, string>,
        replace: patch.health !== undefined,
      })
    },
    [navigate, search],
  )

  const selectedJob = search.job ? (items.find(j => j.name === search.job) ?? null) : null

  const confirmRun = async (job: SystemJob) => {
    setConfirmJob(null)
    // Quick jobs answer in a second or two (the button spins meanwhile); heavy ones get a heads-up.
    if (runNowWarning(job.name)) {
      toastInfo(`Running ${job.label}…`, 'This can take several minutes. You can keep using the page.')
    }
    try {
      const run = await runner.run(job.name)
      const outcome = describeRunOutcome(job.label, run, formatDurationMs)
      if (outcome.tone === 'success') toastSuccess(outcome.title, outcome.description)
      else if (outcome.tone === 'error') toastError(outcome.title, outcome.description)
      else toastInfo(outcome.title, outcome.description)
    } catch (e) {
      if (isRateLimitError(e)) {
        toastWarning(`${job.label} was run very recently`, extractApiErrorMessage(e))
      } else if (isTimeoutError(e)) {
        toastInfo(`${job.label} is still running`, 'It is taking a while. Check the run history for the result.')
      } else {
        toastError(`Could not run ${job.label}`, extractApiErrorMessage(e))
      }
    }
  }

  return (
    <div className="min-w-0 space-y-4" data-testid="system-jobs-page">
      <PageHeader
        title="System jobs"
        description="Background jobs that keep rotas, alerts and reports running."
        icon={<Timer className="h-4 w-4 text-muted-foreground" aria-hidden />}
      />

      {query.data ? <CronModeBanner cronMode={query.data.cronMode} /> : null}

      {query.isLoading ? (
        <div role="status" aria-busy="true" aria-label="Loading system jobs" className="space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-card p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      ) : query.isError && !query.data ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center"
          data-testid="system-jobs-error"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-destructive">Could not load the system jobs</p>
            <p className="text-sm text-muted-foreground">{extractApiErrorMessage(query.error)}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
            loading={query.isFetching}
            leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          <RefreshBar
            serverTime={query.data?.serverTime}
            updatedAt={query.dataUpdatedAt}
            fetching={query.isFetching}
            stale={query.isError}
            onRefresh={() => void query.refetch()}
          />

          <JobSummaryCards counts={counts} active={healthFilter} onSelect={h => setSearch({ health: h })} />

          {!canManage ? (
            <p
              className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground"
              data-testid="system-jobs-read-only"
            >
              <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              You have read-only access. Running a job by hand needs the System jobs manage permission (Super Admin).
            </p>
          ) : null}

          {healthFilter !== 'all' ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm" role="status">
              <span className="text-muted-foreground">
                Showing <span className="font-medium text-foreground">{HEALTH_FILTER_LABELS[healthFilter].toLowerCase()}</span>{' '}
                jobs ({visibleJobs.length} of {items.length})
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSearch({ health: 'all' })}
                leftIcon={<FilterX className="h-3.5 w-3.5" aria-hidden />}
              >
                Show all jobs
              </Button>
            </div>
          ) : null}

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
              The API did not report any background jobs.
            </div>
          ) : visibleJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
              No {HEALTH_FILTER_LABELS[healthFilter].toLowerCase()} jobs right now.
            </div>
          ) : (
            <JobsTable
              jobs={visibleJobs}
              now={now}
              canManage={canManage}
              isRunPending={runner.isPending}
              onViewHistory={job => setSearch({ job: job.name })}
              onRunNow={setConfirmJob}
            />
          )}

          <HealthLegend />
        </>
      )}

      <JobDetailSheet
        jobName={search.job ?? null}
        job={selectedJob}
        listLoading={query.isLoading}
        now={now}
        canManage={canManage}
        runPending={search.job ? runner.isPending(search.job) : false}
        onRunNow={setConfirmJob}
        onClose={() => setSearch({ job: undefined })}
      />

      <RunNowDialog job={confirmJob} onCancel={() => setConfirmJob(null)} onConfirm={job => void confirmRun(job)} />
    </div>
  )
}
