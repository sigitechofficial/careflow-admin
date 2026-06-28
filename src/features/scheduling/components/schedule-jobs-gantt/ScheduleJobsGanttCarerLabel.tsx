import * as React from 'react'
import { Ban, CalendarOff, Car, Clock, UserX } from 'lucide-react'
import { useScheduleJobsDisplayFormat } from '@/features/scheduling/context/schedule-jobs-display-format.context'
import type { EmployeeDayPattern } from '@/features/scheduling/types/scheduling.types'
import { handleScheduleJobHoverWheel } from '@/features/scheduling/utils/schedule-jobs-scroll.util'
import {
  buildCarerAvailabilitySegments,
  resolveCarerDayAvailabilityBadge,
} from '@/features/scheduling/utils/schedule-jobs-availability.util'
import { carerAvatarTone, SCHEDULE_JOBS_CARER_COL_WIDTH } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

type CarerAvatarProps = {
  name: string
  initials?: string
  variant?: 'default' | 'unassigned' | 'cancelled' | 'onLeave' | 'notAvailable' | 'partial'
}

function CarerAvatar({ name, initials, variant = 'default' }: CarerAvatarProps) {
  if (variant === 'unassigned') {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/80 bg-amber-50 text-amber-700 shadow-sm dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
        <UserX className="h-3.5 w-3.5" />
      </div>
    )
  }

  if (variant === 'cancelled') {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-slate-100 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
        <Ban className="h-3.5 w-3.5" />
      </div>
    )
  }

  if (variant === 'onLeave') {
    return (
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-300/90 bg-orange-100 text-orange-800 shadow-sm dark:border-orange-700 dark:bg-orange-950/50 dark:text-orange-200"
        aria-hidden
      >
        <CalendarOff className="h-3.5 w-3.5" />
      </div>
    )
  }

  if (variant === 'notAvailable') {
    return (
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300/90 bg-slate-100 text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-900/70 dark:text-slate-200"
        aria-hidden
      >
        <Ban className="h-3.5 w-3.5" />
      </div>
    )
  }

  if (variant === 'partial') {
    return (
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/90 bg-amber-100 text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
        aria-hidden
      >
        <Clock className="h-3.5 w-3.5" />
      </div>
    )
  }

  const tone = carerAvatarTone(name)
  const letters = initials ?? name.slice(0, 2).toUpperCase()

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/5 text-[11px] font-bold shadow-sm"
      style={{ backgroundColor: tone.bg, color: tone.text }}
    >
      {letters}
    </div>
  )
}

export type ScheduleJobsGanttCarerLabelProps = {
  name: string
  fullName?: string
  subtitle?: string
  showCar?: boolean
  muted?: boolean
  avatarInitials?: string
  unassigned?: boolean
  cancelled?: boolean
  onLeave?: boolean
  leaveEndDate?: string | null
  dayPattern?: EmployeeDayPattern | null
  hoverCard?: React.ReactNode
}

export function ScheduleJobsGanttCarerLabel({
  name,
  fullName,
  subtitle,
  showCar,
  muted,
  avatarInitials,
  unassigned,
  cancelled,
  onLeave,
  leaveEndDate,
  dayPattern,
  hoverCard,
}: ScheduleJobsGanttCarerLabelProps) {
  const displayFormat = useScheduleJobsDisplayFormat()
  const leaveUntilLabel =
    leaveEndDate ? displayFormat.formatDate(leaveEndDate.slice(0, 10)) : null
  const availabilityBadge = resolveCarerDayAvailabilityBadge(dayPattern, onLeave)

  const avatarVariant = cancelled
    ? 'cancelled'
    : unassigned
      ? 'unassigned'
      : onLeave
        ? 'onLeave'
        : availabilityBadge?.kind === 'not-available'
          ? 'notAvailable'
          : availabilityBadge?.kind === 'partial'
            ? 'partial'
            : 'default'

  const label = (
    <div
      data-schedule-carer-label
      data-schedule-carer-on-leave={onLeave ? 'true' : undefined}
      data-schedule-carer-not-available={availabilityBadge?.kind === 'not-available' ? 'true' : undefined}
      data-schedule-carer-partial={availabilityBadge?.kind === 'partial' ? 'true' : undefined}
      className={cn(
        'flex h-full shrink-0 items-center gap-2.5 border-r border-border/80 px-3',
        muted && 'bg-amber-50/50 dark:bg-amber-950/15',
        unassigned && 'border-l-4 border-l-amber-400',
        cancelled && 'border-l-4 border-l-slate-400 bg-slate-50/70 dark:border-l-slate-600 dark:bg-slate-950/20',
        onLeave &&
          'border-l-4 border-l-orange-400 bg-orange-50/80 dark:border-l-orange-500 dark:bg-orange-950/35',
        availabilityBadge?.kind === 'not-available' &&
          'border-l-4 border-l-slate-400 bg-slate-100/75 dark:border-l-slate-500 dark:bg-slate-950/40',
        availabilityBadge?.kind === 'partial' &&
          'border-l-4 border-l-amber-400 bg-amber-50/75 dark:border-l-amber-600 dark:bg-amber-950/30',
        hoverCard && 'cursor-default',
      )}
      style={{ width: SCHEDULE_JOBS_CARER_COL_WIDTH, minWidth: SCHEDULE_JOBS_CARER_COL_WIDTH }}
    >
      <CarerAvatar name={name} initials={avatarInitials} variant={avatarVariant} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-semibold leading-tight',
            muted && 'text-amber-900 dark:text-amber-100',
            cancelled && 'text-slate-800 dark:text-slate-100',
            onLeave && 'text-orange-950 dark:text-orange-50',
            availabilityBadge?.kind === 'not-available' && 'text-slate-900 dark:text-slate-100',
            availabilityBadge?.kind === 'partial' && 'text-amber-950 dark:text-amber-50',
          )}
        >
          {name}
        </p>
        {onLeave ? (
          <span
            className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-md border border-orange-200/90 bg-orange-100/90 px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-orange-900 dark:border-orange-800 dark:bg-orange-950/70 dark:text-orange-100"
            title={
              leaveUntilLabel
                ? `On leave until ${displayFormat.formatDateLong(leaveEndDate!.slice(0, 10))}`
                : 'On leave today'
            }
          >
            <CalendarOff className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">
              On leave
              {leaveUntilLabel ? (
                <>
                  <span className="mx-0.5 font-normal text-orange-700/80 dark:text-orange-200/80">
                    ·
                  </span>
                  until {leaveUntilLabel}
                </>
              ) : null}
            </span>
          </span>
        ) : availabilityBadge ? (
          <span
            className={cn(
              'mt-0.5 inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-tight',
              availabilityBadge.kind === 'not-available' &&
                'border-slate-200/90 bg-slate-100/95 text-slate-800 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-100',
              availabilityBadge.kind === 'partial' &&
                'border-amber-200/90 bg-amber-100/95 text-amber-950 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-100',
            )}
            title={availabilityBadge.title}
          >
            {availabilityBadge.kind === 'not-available' ? (
              <Ban className="h-3 w-3 shrink-0" aria-hidden />
            ) : (
              <Clock className="h-3 w-3 shrink-0" aria-hidden />
            )}
            <span className="truncate">{availabilityBadge.label}</span>
          </span>
        ) : subtitle ? (
          <p className="truncate text-[10px] leading-tight text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {showCar ? (
        <Car className="h-4 w-4 shrink-0 text-sky-600" aria-label="Mobile carer" />
      ) : (
        <span className="w-4 shrink-0" />
      )}
    </div>
  )

  if (hoverCard) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{label}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="start"
          className="max-h-none max-w-none overflow-visible border-0 bg-transparent p-0 shadow-none"
          onWheel={handleScheduleJobHoverWheel}
        >
          {hoverCard}
        </TooltipContent>
      </Tooltip>
    )
  }

  if (fullName && fullName !== name) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{label}</TooltipTrigger>
        <TooltipContent side="right">{fullName}</TooltipContent>
      </Tooltip>
    )
  }

  return label
}
