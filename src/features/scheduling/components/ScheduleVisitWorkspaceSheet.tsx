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
  if (!job) return null

  const returnTo = `/scheduling/schedule-jobs?date=${encodeURIComponent(date)}`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="xl" className="flex w-full flex-col overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle>Visit workspace</SheetTitle>
          <SheetDescription>
            {serviceUserLabel(job.serviceUser)}
            {timelineJobVisitPlanSlot(job) ? ` · ${timelineJobVisitPlanSlot(job)}` : ''} ·{' '}
            {formatJobTimeRange(job)}
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
