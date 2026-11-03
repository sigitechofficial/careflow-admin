import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  ScheduleVisitWorkspaceContent,
  type ScheduleVisitWorkspaceTab,
} from '@/features/scheduling/components/ScheduleVisitWorkspaceContent'
import { ScheduleVisitRefResetRow } from '@/features/scheduling/components/ScheduleVisitResetDeliveryButton'
import { getScheduledJob } from '@/features/scheduling/api/scheduling.api'
import { schedulingKeys } from '@/features/scheduling/keys'
import { serviceUserLabel, formatJobTimeRange } from '@/features/scheduling/utils/scheduling-format'
import { timelineJobVisitPlanSlot } from '@/features/scheduling/utils/scheduling-visit-plan.util'
import { formatTimezoneUtcOffset } from '@/features/settings/organisation-timezone'
import { cn } from '@/shared/lib/utils'
import {
  formatOrganisationIsoDate,
} from '@/shared/lib/organisation-display-format.store'
import { getSyncedOperationalTimeZone } from '@/shared/lib/operational-day.util'
import { ScheduleJobStatusBadge } from '@/features/scheduling/components/schedule-filters/ScheduleJobStatusBadge'
import { JobTimebankNote } from '@/features/timebank/components/TimebankNotes'

/** Cancelled reads grey in lists; in the workspace header it must stand out (dark mode too). */
const HEADER_CANCELLED_CLASS =
  'border-red-300 bg-red-100 text-red-900 dark:border-red-500 dark:bg-red-900/70 dark:text-red-50'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: TimelineJob | null
  date: string
  defaultTab?: ScheduleVisitWorkspaceTab
  onCompleteVisit?: (job: TimelineJob) => void
  onMarkIncomplete?: (job: TimelineJob) => void
  onAddNotes?: (job: TimelineJob) => void
  onAllocate?: (job: TimelineJob) => void
}

export function ScheduleVisitWorkspaceSheet({
  open,
  onOpenChange,
  job,
  date,
  defaultTab,
  onCompleteVisit,
  onMarkIncomplete,
  onAddNotes,
  onAllocate,
}: Props) {
  const queryClient = useQueryClient()
  const jobId = job?.id

  // Every time the workspace opens, refetch the latest server data for this
  // job (tasks, observations, medication, …) — no stale cache on open.
  useEffect(() => {
    if (!open || !jobId) return
    void queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey.includes(jobId),
    })
  }, [open, jobId, queryClient])

  const freshJobQuery = useQuery({
    queryKey: schedulingKeys.job(jobId ?? ''),
    queryFn: () => getScheduledJob(jobId!),
    enabled: Boolean(open && jobId),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  if (!job) return null

  const liveJob = freshJobQuery.data ? { ...job, ...freshJobQuery.data } : job
  const visitRef = liveJob.visitRef ?? job.visitRef
  const visitId = liveJob.visits?.[0]?.id ?? job.visits?.[0]?.id ?? null
  const returnTo = `/scheduling/schedule-jobs?date=${encodeURIComponent(date)}`
  const operationalTimezone = getSyncedOperationalTimeZone()
  const timezoneHint = `${operationalTimezone} (${formatTimezoneUtcOffset(operationalTimezone)})`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="xl" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle className="flex flex-wrap items-center gap-2">
            Visit workspace
            <ScheduleJobStatusBadge
              status={liveJob.status}
              className={cn(
                'px-2.5 py-0.5 text-xs',
                liveJob.status === 'CANCELLED' || liveJob.status === 'CALLED_OFF' ? HEADER_CANCELLED_CLASS : undefined,
              )}
            />
            <span
              className="inline-flex items-center rounded border border-dashed border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground"
              title="Visit times, clock in/out, and log timestamps use the organisation operational timezone"
              data-testid="visit-workspace-timezone-hint"
            >
              Times in {timezoneHint}
            </span>
          </SheetTitle>
          <SheetDescription asChild>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p>
                {serviceUserLabel(job.serviceUser)}
                {timelineJobVisitPlanSlot(job) ? ` · ${timelineJobVisitPlanSlot(job)}` : ''} ·{' '}
                {formatOrganisationIsoDate(date)} · {formatJobTimeRange(job)}
              </p>
              <ScheduleVisitRefResetRow job={liveJob} visitRef={visitRef} visitId={visitId} />
            </div>
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4">
          <div className="mb-3 empty:hidden">
            <JobTimebankNote scheduledJobId={job.id} />
          </div>
          <ScheduleVisitWorkspaceContent
            job={job}
            date={date}
            returnTo={returnTo}
            defaultTab={defaultTab}
            layout="sheet"
            onCompleteVisit={onCompleteVisit ? () => onCompleteVisit(job) : undefined}
            onMarkIncomplete={onMarkIncomplete ? () => onMarkIncomplete(job) : undefined}
            onAddNotes={onAddNotes ? () => onAddNotes(job) : undefined}
            onAllocate={onAllocate ? () => onAllocate(job) : undefined}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
