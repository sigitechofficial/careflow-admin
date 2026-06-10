import * as React from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, List, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { listCarePlanFormsForRules } from '@/features/care-pathway/api/care-plan-recommendation-rules.api'
import { ScheduleJobAllocateDialog } from '@/features/scheduling/components/ScheduleJobAllocateDialog'
import { useScheduleList } from '@/features/scheduling/hooks/useScheduling'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  employeesLabel,
  formatDateTimeLocal,
  jobNeedsAlert,
  jobNeedsCarerAssignment,
  jobStatusLabel,
  serviceUserLabel,
  todayIso,
} from '@/features/scheduling/utils/scheduling-format'
import {
  buildCarePlanFormNameMap,
  formatLinkedCarePlanLabels,
  jobAttentionReason,
  timelineJobLinkedCarePlanIds,
  timelineJobVisitPlanSlot,
} from '@/features/scheduling/utils/scheduling-visit-plan.util'

export default function ScheduleListPage() {
  const hasApi = !!getApiBaseUrl()
  const search = useSearch({ strict: false }) as { date?: string }
  const [date, setDate] = React.useState(search.date ?? todayIso())
  const [allocateJobId, setAllocateJobId] = React.useState<string | null>(null)
  const [allocateOpen, setAllocateOpen] = React.useState(false)

  React.useEffect(() => {
    if (search.date) setDate(search.date)
  }, [search.date])

  const { data, isLoading, isError, refetch } = useScheduleList(date, hasApi)

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

  const jobs = data?.jobs ?? []
  const attentionCount = jobs.filter((job) => jobNeedsAlert(job) || jobAttentionReason(job)).length
  const allocateJob = allocateJobId ? jobs.find((j) => j.id === allocateJobId) ?? null : null

  const openAllocate = (job: TimelineJob) => {
    setAllocateJobId(job.id)
    setAllocateOpen(true)
  }

  if (!hasApi) {
    return <p className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL.</p>
  }

  return (
    <div className="mx-auto max-w-6xl p-5 md:p-6 space-y-4">
      <PageHeader
        title="List View of Schedule"
        description="Tabular list of scheduled jobs for a selected day."
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Scheduling', href: '/scheduling/view' },
          { label: 'List view' },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 border border-border rounded-md px-3 text-sm bg-background"
        />
        <Button variant="outline" size="sm" asChild>
          <Link to="/scheduling/view" search={{ date }}>
            Grid view
          </Link>
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center gap-2 text-sm font-semibold">
          <List className="h-4 w-4" />
          Jobs ({jobs.length})
          {attentionCount > 0 ? (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
              <AlertCircle className="h-3 w-3" aria-hidden />
              {attentionCount} need attention
            </span>
          ) : null}
          {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
        </div>
        {isError && (
          <p className="p-4 text-sm text-destructive">Failed to load jobs. Check schedule_timelines.read permission.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium text-muted-foreground">Start</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Visit slot</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Service user</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Care plans</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Carers</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Run</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                    No jobs for this date. Build a schedule or generate rota from a visit plan.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const attention = jobAttentionReason(job)
                  const alert = jobNeedsAlert(job) || Boolean(attention)
                  return (
                    <tr
                      key={job.id}
                      className={cn(
                        'border-b last:border-0 hover:bg-muted/20',
                        alert && 'bg-amber-50/50 dark:bg-amber-950/20',
                      )}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDateTimeLocal(job.scheduledStartDateTime)}
                      </td>
                      <td className="px-3 py-2">
                        {timelineJobVisitPlanSlot(job) ?? (
                          <span className="text-muted-foreground">{job.jobName}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{serviceUserLabel(job.serviceUser)}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate">
                        {formatLinkedCarePlanLabels(timelineJobLinkedCarePlanIds(job), carePlanNameById)}
                      </td>
                      <td className="px-3 py-2">
                        {employeesLabel(job)}
                        {attention ? (
                          <p className="text-xs text-amber-800 dark:text-amber-200 mt-0.5">{attention}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{job.scheduleRun?.name ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={cn(alert && 'font-semibold text-amber-800 dark:text-amber-200')}>
                          {jobStatusLabel(job.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={jobNeedsCarerAssignment(job) ? 'default' : 'outline'}
                          onClick={() => openAllocate(job)}
                        >
                          {jobNeedsCarerAssignment(job) ? 'Assign carers' : 'Manage carers'}
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
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
