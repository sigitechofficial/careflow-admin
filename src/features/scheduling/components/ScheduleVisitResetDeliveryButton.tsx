import * as React from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { isScheduleJobDeliveryResettable } from '@/features/scheduling/types/schedule-job-context-actions.types'
import { ScheduleJobResetDeliveryDialog } from '@/features/scheduling/components/ScheduleJobResetDeliveryDialog'
import { VisitRefDisplay } from '@/features/scheduling/components/VisitRefDisplay'

type ButtonProps = {
  job: TimelineJob | null
  className?: string
}

/** Office reset control — hide when the visit has no delivery to wipe. */
export function ScheduleVisitResetDeliveryButton({ job, className }: ButtonProps) {
  const [open, setOpen] = React.useState(false)
  if (!job || !isScheduleJobDeliveryResettable(job)) return null

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn('shrink-0 text-destructive hover:text-destructive', className)}
        onClick={() => setOpen(true)}
        data-testid="visit-workspace-reset-delivery"
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Reset to planned
      </Button>
      <ScheduleJobResetDeliveryDialog open={open} onOpenChange={setOpen} job={job} />
    </>
  )
}

type RowProps = {
  job: TimelineJob | null
  visitRef?: string | null
  visitId?: string | null
  size?: 'sm' | 'md'
  className?: string
}

/** Visit ID / EMONITORED ref with reset trailing — stays visible across tabs. */
export function ScheduleVisitRefResetRow({
  job,
  visitRef,
  visitId,
  size = 'md',
  className,
}: RowProps) {
  return (
    <div className={cn('flex items-start justify-between gap-2', className)}>
      <VisitRefDisplay
        visitRef={visitRef}
        visitId={visitId}
        showEmpty
        size={size}
        className="min-w-0"
      />
      <ScheduleVisitResetDeliveryButton job={job} />
    </div>
  )
}
