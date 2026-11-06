import * as React from 'react'
import { Calendar, Filter, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { ScheduleJobAllocateDialog } from '@/features/scheduling/components/ScheduleJobAllocateDialog'
import { ScheduleJobCancelDialog } from '@/features/scheduling/components/ScheduleJobCancelDialog'
import {
  useHousekeepingDayJobs,
  useHousekeepingJobsNeedingAttention,
  useHousekeepingJobsNotStarted,
} from '@/features/scheduling/hooks/useScheduling'
import {
  useCompleteHousekeepingJob,
} from '@/features/scheduling/hooks/useSchedulingMutations'
import type { HousekeepingJob, PaginationMeta } from '@/features/scheduling/types/scheduling.types'
import {
  employeesLabel,
  formatDateTimeLocal,
  formatJobTimeRange,
  jobNeedsCarerAssignment,
  serviceUserLabel,
  todayIso,
} from '@/features/scheduling/utils/scheduling-format'

type TabId = 'jobs-not-started' | 'jobs-needing-attention' | 'day-jobs'

function TableFooter({ meta }: { meta?: PaginationMeta }) {
  const total = meta?.total ?? 0
  const page = meta?.page ?? 1
  const limit = meta?.limit ?? 50
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-muted-foreground">
      <div>
        Showing {from} to {to} of {total} entries
      </div>
    </div>
  )
}

function TableHeader({ cols }: { cols: { label: string; filter?: boolean }[] }) {
  return (
    <thead>
      <tr className="border-b border-border bg-muted/40">
        {cols.map(col => (
          <th key={col.label} className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">
            <div className="flex items-center gap-1">
              {col.label}
              {col.filter && <Filter className="h-3 w-3 opacity-60" />}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  )
}

function Tabs({ tab, setTab }: { tab: TabId; setTab: (t: TabId) => void }) {
  const tabs: { id: TabId; label: string }[] = [
    { id: 'jobs-not-started', label: 'Jobs Not Started' },
    { id: 'jobs-needing-attention', label: 'Jobs Needing Attention' },
    { id: 'day-jobs', label: 'Day Jobs' },
  ]
  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          className={cn(
            'text-base px-5 py-3 border-b-2 -mb-px transition-colors font-medium',
            tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function JobActions({
  job,
  onAssign,
}: {
  job: HousekeepingJob
  onAssign: (job: HousekeepingJob) => void
}) {
  const complete = useCompleteHousekeepingJob()
  const [cancelOpen, setCancelOpen] = React.useState(false)
  return (
    <>
      <div className="flex items-center gap-2 justify-end flex-wrap">
        <Button
          size="sm"
          variant={jobNeedsCarerAssignment(job) ? 'default' : 'outline'}
          onClick={() => onAssign(job)}
        >
          {jobNeedsCarerAssignment(job) ? 'Assign carers' : 'Manage carers'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={complete.isPending}
          onClick={() => setCancelOpen(true)}
        >
          Cancel Job
        </Button>
        <Button
          size="sm"
          disabled={complete.isPending}
          onClick={() =>
            complete.mutate(
              { jobId: job.id },
              {
                onSuccess: () => toastSuccess('Job completed'),
                onError: e => toastApiError(e, 'Could not complete job'),
              },
            )
          }
        >
          Complete Job
        </Button>
      </div>
      <ScheduleJobCancelDialog open={cancelOpen} onOpenChange={setCancelOpen} job={job} />
    </>
  )
}

function JobRow({
  job,
  showStatus,
  showId,
  onAssign,
}: {
  job: HousekeepingJob
  showStatus: boolean
  showId: boolean
  onAssign: (job: HousekeepingJob) => void
}) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      {showId && <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap font-mono text-xs">{job.id.slice(0, 8)}…</td>}
      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatDateTimeLocal(job.scheduledStartDateTime)}</td>
      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{job.jobName}</td>
      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{serviceUserLabel(job.serviceUser)}</td>
      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{employeesLabel(job)}</td>
      {showStatus && <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{job.status}</td>}
      <td className="px-3 py-2.5">
        <JobActions job={job} onAssign={onAssign} />
      </td>
    </tr>
  )
}

export default function ManageScheduleJobsPage() {
  const hasApi = !!getApiBaseUrl()
  const [tab, setTab] = React.useState<TabId>('jobs-not-started')
  const [dayDate, setDayDate] = React.useState(todayIso())
  const [allocateJobId, setAllocateJobId] = React.useState<string | null>(null)
  const [allocateOpen, setAllocateOpen] = React.useState(false)
  const page = 1

  const notStarted = useHousekeepingJobsNotStarted(page, hasApi && tab === 'jobs-not-started')

  const needingAttention = useHousekeepingJobsNeedingAttention(page, hasApi && tab === 'jobs-needing-attention')

  const dayJobs = useHousekeepingDayJobs(dayDate, page, hasApi && tab === 'day-jobs')

  const openAllocate = (job: HousekeepingJob) => {
    setAllocateJobId(job.id)
    setAllocateOpen(true)
  }

  const refetchActiveTab = () => {
    if (tab === 'jobs-not-started') void notStarted.refetch()
    else if (tab === 'jobs-needing-attention') void needingAttention.refetch()
    else void dayJobs.refetch()
  }

  const allocateJob = React.useMemo(() => {
    if (!allocateJobId) return null
    const pools = [
      notStarted.data?.rows ?? [],
      needingAttention.data?.rows ?? [],
      dayJobs.data?.jobs ?? [],
    ]
    for (const pool of pools) {
      const found = pool.find((j) => j.id === allocateJobId)
      if (found) return found
    }
    return null
  }, [allocateJobId, notStarted.data, needingAttention.data, dayJobs.data])

  const loading =
    (tab === 'jobs-not-started' && notStarted.isLoading) ||
    (tab === 'jobs-needing-attention' && needingAttention.isLoading) ||
    (tab === 'day-jobs' && dayJobs.isLoading)

  if (!hasApi) {
    return <p className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL to load housekeeping data.</p>
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="p-5 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Scheduled Jobs Housekeeping
          </div>
          <p className="text-sm text-muted-foreground">Review, complete, and manage scheduled jobs from the live API.</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Tabs tab={tab} setTab={setTab} />
        <div className="p-4 sm:p-5">
          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loadingâ€¦
            </div>
          )}

          {!loading && tab === 'jobs-not-started' && (
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <TableHeader
                    cols={[
                      { label: 'Job Id' },
                      { label: 'Scheduled Start', filter: true },
                      { label: 'Job Name' },
                      { label: 'Service User' },
                      { label: 'Employees', filter: true },
                      { label: 'Status' },
                      { label: 'Actions' },
                    ]}
                  />
                  <tbody>
                    {(notStarted.data?.rows ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-12 text-center text-sm text-muted-foreground">
                          No record found.
                        </td>
                      </tr>
                    ) : (
                      (notStarted.data?.rows ?? []).map((job) => (
                        <JobRow key={job.id} job={job} showStatus showId onAssign={openAllocate} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <TableFooter meta={notStarted.data?.meta} />
            </div>
          )}

          {!loading && tab === 'jobs-needing-attention' && (
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <TableHeader
                    cols={[
                      { label: 'Scheduled Start', filter: true },
                      { label: 'Job Name' },
                      { label: 'Service User' },
                      { label: 'Employees', filter: true },
                      { label: 'Attention' },
                      { label: 'Actions' },
                    ]}
                  />
                  <tbody>
                    {(needingAttention.data?.rows ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-12 text-center text-sm text-muted-foreground">
                          No record found.
                        </td>
                      </tr>
                    ) : (
                      (needingAttention.data?.rows ?? []).map(job => (
                        <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                            {formatDateTimeLocal(job.scheduledStartDateTime)}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{job.jobName}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{serviceUserLabel(job.serviceUser)}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{employeesLabel(job)}</td>
                          <td className="px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400 max-w-[200px]">
                            {(job.attentionReasons ?? []).join('; ') || job.status}
                          </td>
                          <td className="px-3 py-2.5">
                            <JobActions job={job} onAssign={openAllocate} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <TableFooter meta={needingAttention.data?.meta} />
            </div>
          )}

          {!loading && tab === 'day-jobs' && (
            <div className="rounded-lg border border-border bg-background p-4 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  Select Date <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dayDate}
                    onChange={e => setDayDate(e.target.value)}
                    className="h-10 w-[180px] border border-input rounded-md px-3 pr-10 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Calendar className="h-4 w-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <TableHeader
                    cols={[
                      { label: 'Job Id' },
                      { label: 'Run' },
                      { label: 'Scheduled Time' },
                      { label: 'Actual Time' },
                      { label: 'Service User' },
                      { label: 'Status' },
                      { label: 'Actions' },
                    ]}
                  />
                  <tbody>
                    {(dayJobs.data?.jobs ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-12 text-center text-sm text-muted-foreground">
                          No record found for this date.
                        </td>
                      </tr>
                    ) : (
                      (dayJobs.data?.jobs ?? []).map(job => (
                        <tr key={job.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{job.id.slice(0, 8)}â€¦</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{job.scheduleRun?.name ?? 'â€”'}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{formatJobTimeRange(job)}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {job.actualStartDateTime
                              ? `${formatDateTimeLocal(job.actualStartDateTime)}${job.actualEndDateTime ? ` â€“ ${formatDateTimeLocal(job.actualEndDateTime)}` : ''}`
                              : 'â€”'}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{serviceUserLabel(job.serviceUser)}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{job.status}</td>
                          <td className="px-3 py-2.5">
                            <JobActions job={job} onAssign={openAllocate} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <TableFooter meta={dayJobs.data?.meta} />
            </div>
          )}
        </div>
      </div>

      <ScheduleJobAllocateDialog
        open={allocateOpen}
        onOpenChange={(open) => {
          setAllocateOpen(open)
          if (!open) setAllocateJobId(null)
        }}
        job={allocateJob}
        onAllocated={refetchActiveTab}
      />
    </div>
  )
}
