import { Car } from 'lucide-react'
import { ScheduleJobRequiredCarersIcon } from '@/features/scheduling/components/ScheduleJobRequiredCarersIcon'
import { cn } from '@/shared/lib/utils'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { TimeSensitiveClock } from '@/features/scheduling/components/TimeSensitiveClock'
import {
  buildRunVisitLabelLines,
  type ScheduleRunsDisplayPreferences,
} from '@/features/scheduling/utils/schedule-runs-display-preferences.util'
import { resolveJobTimeCritical } from '@/features/scheduling/utils/schedule-job-time-critical.util'
import {
  timeSensitiveClockStatus,
  timeSensitiveHoverTitle,
} from '@/features/scheduling/utils/schedule-job-time-sensitive.util'

type Props = {
  job: TimelineJob
  preferences: ScheduleRunsDisplayPreferences
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  className?: string
  lineClassName?: string
  compact?: boolean
}

export function RunVisitDisplayLabels({
  job,
  preferences,
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
  className,
  lineClassName,
  compact,
}: Props) {
  const lines = buildRunVisitLabelLines(job, preferences, {
    visitPlanSlotsByServiceUser,
    acceptedCarePlansByServiceUser,
  })
  const showRequiredCarersIcon = preferences.showDoubleUpIcon && job.requiredCarers > 1
  const showTravel = preferences.showTravelMethodIcons && Boolean(job.scheduleRunId)
  const timeCritical = resolveJobTimeCritical(job, visitPlanSlotsByServiceUser)
  const sensitiveClock = timeSensitiveClockStatus(job, visitPlanSlotsByServiceUser)
  const showLeadingIcons = Boolean(sensitiveClock || timeCritical) || showRequiredCarersIcon || showTravel

  return (
    <div className={cn('flex min-w-0 items-start gap-1.5', className)}>
      {showLeadingIcons ? (
        <span className="flex shrink-0 items-center gap-0.5 pt-0.5">
          {sensitiveClock || timeCritical ? (
            <TimeSensitiveClock
              status={sensitiveClock ?? 'due'}
              title={timeSensitiveHoverTitle(job, visitPlanSlotsByServiceUser)}
            />
          ) : null}
          {showRequiredCarersIcon ? (
            <ScheduleJobRequiredCarersIcon requiredCarers={job.requiredCarers} className="h-3 w-3" />
          ) : null}
          {showTravel ? (
            <Car className="h-3 w-3 opacity-70" aria-label="Run visit" />
          ) : null}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        {lines.map((line, index) => (
          <span
            key={`${index}-${line}`}
            className={cn(
              'block truncate',
              compact ? 'text-xs' : 'text-sm',
              index === 0 ? 'font-medium text-foreground' : 'text-muted-foreground',
              lineClassName,
            )}
            title={lines.join('\n')}
          >
            {line}
          </span>
        ))}
      </span>
    </div>
  )
}
