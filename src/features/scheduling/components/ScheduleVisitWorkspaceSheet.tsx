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
import { VisitRefDisplay } from '@/features/scheduling/components/VisitRefDisplay'
import { getScheduledJob } from '@/features/scheduling/api/scheduling.api'
import { schedulingKeys } from '@/features/scheduling/keys'
import { serviceUserLabel, formatJobTimeRange } from '@/features/scheduling/utils/scheduling-format'
import { timelineJobVisitPlanSlot } from '@/features/scheduling/utils/scheduling-visit-plan.util'

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

  const visitRef = freshJobQuery.data?.visitRef ?? job.visitRef
  const visitId =
    freshJobQuery.data?.visits?.[0]?.id ?? job.visits?.[0]?.id ?? null
  const returnTo = `/scheduling/schedule-jobs?date=${encodeURIComponent(date)}`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="xl" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle>Visit workspace</SheetTitle>
          <SheetDescription asChild>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p>
                {serviceUserLabel(job.serviceUser)}
                {timelineJobVisitPlanSlot(job) ? ` · ${timelineJobVisitPlanSlot(job)}` : ''} ·{' '}
                {formatJobTimeRange(job)}
              </p>
              <VisitRefDisplay visitRef={visitRef} visitId={visitId} showEmpty size="md" />
            </div>
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4">
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
