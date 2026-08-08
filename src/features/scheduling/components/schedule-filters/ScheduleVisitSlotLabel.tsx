import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { scheduleVisitSlotVisual } from '@/features/scheduling/utils/schedule-visit-slot-icon.util'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'

type Props = {
  job: Pick<TimelineJob, 'jobName' | 'scheduledStartDateTime' | 'visitPlan' | 'visits'>
  className?: string
  /** Extra line under the slot (e.g. care plans). */
  subtitle?: ReactNode
}

export function ScheduleVisitSlotLabel({ job, className, subtitle }: Props) {
  const { label, Icon, iconClassName, period } = scheduleVisitSlotVisual(job)

  return (
    <div className={cn('min-w-0', className)}>
      <p className="flex items-center gap-1.5 font-medium text-foreground">
        <Icon
          className={cn('h-3.5 w-3.5 shrink-0', iconClassName)}
          aria-hidden
          data-period={period}
        />
        <span className="truncate">{label}</span>
      </p>
      {subtitle ? <div className="mt-0.5 min-w-0">{subtitle}</div> : null}
    </div>
  )
}
