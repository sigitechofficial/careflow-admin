import * as React from 'react'
import { Car, Clock, Users, UserX } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { useScheduleJobsDrag } from '@/features/scheduling/hooks/useScheduleJobsDrag'
import type { EmployeeDayRow, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { ScheduleJobHoverCard } from '@/features/scheduling/components/ScheduleJobHoverCard'
import { ScheduleCarerAvailabilityOverlay } from '@/features/scheduling/components/ScheduleCarerAvailabilityOverlay'
import { ScheduleJobsDragOverlay } from '@/features/scheduling/components/ScheduleJobsDragOverlay'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import type { JobDropPayload, ScheduleJobsRowRef } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import { scheduleJobsRowKey } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import { buildCarerAvailabilitySegments } from '@/features/scheduling/utils/schedule-jobs-availability.util'
import type { EmployeeDayPattern } from '@/features/scheduling/types/scheduling.types'
import {
  carerAvatarTone,
  employeeBriefDisplayName,
  employeeBriefDuplicateNameIds,
  employeeBriefFullName,
  employeeBriefInitials,
  employeeBriefRowLabel,
  formatScheduleJobsHourLabel,
  formatScheduleJobsPeriodRange,
  JOB_BLOCK_TONE_CLASSES,
  jobBlockLayoutPx,
  jobBlockTone,
  SCHEDULE_JOBS_CARER_COL_WIDTH,
  SCHEDULE_JOBS_DAY_PERIOD_BANDS,
  SCHEDULE_JOBS_HOUR_WIDTH,
  SCHEDULE_JOBS_ROW_HEIGHT,
  SCHEDULE_JOBS_TIMELINE_GRID_WIDTH,
  SCHEDULE_JOBS_TIMELINE_PAD_RIGHT,
  SCHEDULE_JOBS_TIMELINE_TRACK_WIDTH,
  scheduleJobsHourLabels,
  scheduleJobsPeriodBandForHour,
  scheduleJobsPeriodBandHeaderClass,
  scheduleJobsPeriodHourCellClass,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'

const PERIOD_ICONS: Record<string, string> = {
  night: '🌙',
  morning: '🌅',
  midday: '☀️',
  afternoon: '🌤️',
  evening: '🌆',
}

type Props = {
  date: string
  employeeRows: EmployeeDayRow[]
  unassignedJobs: TimelineJob[]
  savingJobId?: string | null
  excessContractedJobIds?: Set<string>
  overAllocatedJobIds?: Set<string>
  onJobClick: (job: TimelineJob) => void
  onJobDrop: (payload: JobDropPayload) => void | Promise<void>
}

const BOARD_MIN_WIDTH = SCHEDULE_JOBS_CARER_COL_WIDTH + SCHEDULE_JOBS_TIMELINE_TRACK_WIDTH

function ScheduleJobBlock({
  job,
  date,
  sourceRow,
  saving,
  isDragging,
  alignTop,
  showBookedTooltip,
  excessContracted,
  overAllocated,
  onPointerDown,
  onClick,
  shouldIgnoreClick,
}: {
  job: TimelineJob
  date: string
  sourceRow: ScheduleJobsRowRef
  saving?: boolean
  isDragging?: boolean
  alignTop?: boolean
  showBookedTooltip?: boolean
  excessContracted?: boolean
  overAllocated?: boolean
  onPointerDown: (job: TimelineJob, sourceRow: ScheduleJobsRowRef, event: React.PointerEvent) => void
  onClick: (job: TimelineJob) => void
  shouldIgnoreClick?: () => boolean
}) {
  const tone = jobBlockTone(job)
  const label = serviceUserLabel(job.serviceUser)
  const { leftPx, widthPx } = jobBlockLayoutPx(job, label)

  const block = (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'absolute z-[2] flex touch-none select-none items-center gap-1 rounded-md border px-2 text-left text-[11px] font-semibold leading-tight transition-shadow',
        JOB_BLOCK_TONE_CLASSES[tone],
        showBookedTooltip ? 'top-1 h-7' : alignTop ? 'top-0.5 h-8' : 'top-1.5 bottom-1.5',
        isDragging ? 'pointer-events-none cursor-grabbing opacity-25' : 'cursor-grab hover:shadow-md active:scale-[0.99]',
        excessContracted &&
          'border-amber-600 bg-[repeating-linear-gradient(135deg,rgba(251,191,36,0.22),rgba(251,191,36,0.22)_6px,rgba(255,255,255,0.45)_6px,rgba(255,255,255,0.45)_12px)] ring-2 ring-amber-500/70',
        overAllocated && 'ring-2 ring-rose-500/80 border-rose-600',
        saving && 'animate-pulse opacity-60',
      )}
      style={{ left: leftPx, width: widthPx }}
      title={
        excessContracted
          ? 'Exceeds weekly contracted hours from visit plan — click to manage carers · drag to move'
          : overAllocated
            ? 'More carers assigned than required — over booked · click to manage'
            : 'Click to manage carers · drag to move'
      }
      onPointerDown={(event) => onPointerDown(job, sourceRow, event)}
      onClick={(event) => {
        event.stopPropagation()
        if (shouldIgnoreClick?.()) return
        onClick(job)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick(job)
        }
      }}
    >
      {job.requiredCarers > 1 ? (
        <Users className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      ) : null}
      <span className="whitespace-nowrap">{label}</span>
    </div>
  )

  if (isDragging) return block

  return (
    <Tooltip>
      <TooltipTrigger asChild>{block}</TooltipTrigger>
      <TooltipContent side="top" className="border-0 bg-transparent p-0 shadow-none">
        <ScheduleJobHoverCard
          job={job}
          date={date}
          variant={showBookedTooltip ? 'availability' : 'tooltip'}
        />
      </TooltipContent>
    </Tooltip>
  )
}

function CarerAvatar({
  name,
  initials,
  variant = 'default',
}: {
  name: string
  initials?: string
  variant?: 'default' | 'unassigned'
}) {
  if (variant === 'unassigned') {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/80 bg-amber-50 text-amber-700 shadow-sm dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
        <UserX className="h-3.5 w-3.5" />
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

function CarerLabel({
  name,
  fullName,
  subtitle,
  showCar,
  muted,
  avatarInitials,
  unassigned,
}: {
  name: string
  fullName?: string
  subtitle?: string
  showCar?: boolean
  muted?: boolean
  avatarInitials?: string
  unassigned?: boolean
}) {
  const label = (
    <div
      className={cn(
        'flex h-full shrink-0 items-center gap-2.5 border-r border-border/80 px-3',
        muted && 'bg-amber-50/50 dark:bg-amber-950/15',
        unassigned && 'border-l-4 border-l-amber-400',
      )}
      style={{ width: SCHEDULE_JOBS_CARER_COL_WIDTH, minWidth: SCHEDULE_JOBS_CARER_COL_WIDTH }}
    >
      <CarerAvatar
        name={name}
        initials={avatarInitials}
        variant={unassigned ? 'unassigned' : 'default'}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-semibold leading-tight', muted && 'text-amber-900 dark:text-amber-100')}>
          {name}
        </p>
        {subtitle ? (
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

function TimelineTrack({
  rowKey,
  jobs,
  date,
  sourceRow,
  savingJobId,
  draggingJobId,
  alignJobsTop,
  dayPattern,
  showCarerAvailability,
  excessContractedJobIds,
  overAllocatedJobIds,
  onPointerDown,
  onJobClick,
  shouldIgnoreClick,
  className,
}: {
  rowKey: string
  jobs: TimelineJob[]
  date: string
  sourceRow: ScheduleJobsRowRef
  savingJobId?: string | null
  draggingJobId?: string | null
  alignJobsTop?: boolean
  dayPattern?: EmployeeDayPattern | null
  showCarerAvailability?: boolean
  excessContractedJobIds?: Set<string>
  overAllocatedJobIds?: Set<string>
  onPointerDown: (job: TimelineJob, sourceRow: ScheduleJobsRowRef, event: React.PointerEvent) => void
  onJobClick: (job: TimelineJob) => void
  shouldIgnoreClick?: () => boolean
  className?: string
}) {
  const hours = scheduleJobsHourLabels()
  const availabilitySegments = React.useMemo(
    () => (showCarerAvailability ? buildCarerAvailabilitySegments(jobs, dayPattern) : []),
    [showCarerAvailability, jobs, dayPattern],
  )

  return (
    <div
      data-schedule-timeline-track
      className={cn('relative shrink-0 overflow-visible', className)}
      style={{ width: SCHEDULE_JOBS_TIMELINE_TRACK_WIDTH, minWidth: SCHEDULE_JOBS_TIMELINE_TRACK_WIDTH }}
    >
      <div
        className="absolute inset-y-0 left-0 flex"
        style={{ width: SCHEDULE_JOBS_TIMELINE_GRID_WIDTH }}
      >
        {hours.map((hour) => {
          const period = scheduleJobsPeriodBandForHour(hour).period
          return (
          <div
            key={hour}
            className={cn(
              'relative shrink-0 border-r border-border/60',
              scheduleJobsPeriodHourCellClass(period),
            )}
            style={{ width: SCHEDULE_JOBS_HOUR_WIDTH }}
          >
            {[1, 2, 3].map((q) => (
              <div
                key={q}
                className="absolute inset-y-0 border-r border-border/20"
                style={{ left: `${(q / 4) * 100}%` }}
              />
            ))}
          </div>
          )
        })}
      </div>
      <div
        className="absolute inset-y-0 border-l border-dashed border-border/50 bg-muted/10"
        style={{
          left: SCHEDULE_JOBS_TIMELINE_GRID_WIDTH,
          width: SCHEDULE_JOBS_TIMELINE_PAD_RIGHT,
        }}
        aria-hidden
      />
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: SCHEDULE_JOBS_TIMELINE_GRID_WIDTH }}
        data-carer-availability={showCarerAvailability ? '' : undefined}
      >
        {showCarerAvailability ? (
          <ScheduleCarerAvailabilityOverlay segments={availabilitySegments} />
        ) : null}
      </div>
      {jobs.map((job) => (
        <ScheduleJobBlock
          key={job.id}
          job={job}
          date={date}
          sourceRow={sourceRow}
          saving={savingJobId === job.id}
          isDragging={draggingJobId === job.id}
          alignTop={alignJobsTop}
          showBookedTooltip={showCarerAvailability}
          excessContracted={excessContractedJobIds?.has(job.id)}
          overAllocated={overAllocatedJobIds?.has(job.id)}
          onPointerDown={onPointerDown}
          onClick={onJobClick}
          shouldIgnoreClick={shouldIgnoreClick}
        />
      ))}
    </div>
  )
}

const GanttRow = React.memo(function GanttRow({
  rowKey,
  sourceRow,
  label,
  fullName,
  subtitle,
  showCar,
  muted,
  unassigned,
  avatarInitials,
  jobs,
  date,
  isDropTarget,
  savingJobId,
  draggingJobId,
  alignJobsTop,
  dayPattern,
  showCarerAvailability,
  excessContractedJobIds,
  overAllocatedJobIds,
  zebra,
  onPointerDown,
  onJobClick,
  shouldIgnoreClick,
  trackClassName,
}: {
  rowKey: string
  sourceRow: ScheduleJobsRowRef
  label: string
  fullName?: string
  subtitle?: string
  showCar?: boolean
  muted?: boolean
  unassigned?: boolean
  avatarInitials?: string
  jobs: TimelineJob[]
  date: string
  isDropTarget?: boolean
  savingJobId?: string | null
  draggingJobId?: string | null
  alignJobsTop?: boolean
  dayPattern?: EmployeeDayPattern | null
  showCarerAvailability?: boolean
  excessContractedJobIds?: Set<string>
  overAllocatedJobIds?: Set<string>
  zebra?: boolean
  onPointerDown: (job: TimelineJob, sourceRow: ScheduleJobsRowRef, event: React.PointerEvent) => void
  onJobClick: (job: TimelineJob) => void
  shouldIgnoreClick?: () => boolean
  trackClassName?: string
}) {
  return (
    <div
      data-schedule-row-id={rowKey}
      className={cn(
        'flex shrink-0 overflow-visible border-b border-border/70 transition-colors',
        zebra && 'bg-muted/20',
        isDropTarget && 'bg-primary/5 ring-1 ring-inset ring-primary/30',
      )}
      style={{
        height: SCHEDULE_JOBS_ROW_HEIGHT,
        width: BOARD_MIN_WIDTH,
        minWidth: BOARD_MIN_WIDTH,
      }}
    >
      <div className="sticky left-0 z-10 shrink-0 bg-card/95 backdrop-blur-sm">
        <CarerLabel
          name={label}
          fullName={fullName}
          subtitle={subtitle}
          showCar={showCar}
          muted={muted}
          unassigned={unassigned}
          avatarInitials={avatarInitials}
        />
      </div>
      <TimelineTrack
        rowKey={rowKey}
        jobs={jobs}
        date={date}
        sourceRow={sourceRow}
        savingJobId={savingJobId}
        draggingJobId={draggingJobId}
        alignJobsTop={alignJobsTop}
        dayPattern={dayPattern}
        showCarerAvailability={showCarerAvailability}
        excessContractedJobIds={excessContractedJobIds}
        overAllocatedJobIds={overAllocatedJobIds}
        onPointerDown={onPointerDown}
        onJobClick={onJobClick}
        shouldIgnoreClick={shouldIgnoreClick}
        className={trackClassName}
      />
    </div>
  )
})

function LegendPill({
  swatch,
  label,
  striped,
}: {
  swatch?: string
  label: string
  striped?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[10px] font-medium text-muted-foreground shadow-sm">
      {striped ? (
        <span
          className="inline-block h-2 w-5 rounded-sm border border-slate-300/80"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(100,116,139,0.18) 2px, rgba(100,116,139,0.18) 4px)',
          }}
        />
      ) : (
        <span className={cn('inline-block h-2 w-5 rounded-full', swatch)} />
      )}
      {label}
    </span>
  )
}

function ScheduleJobsTimelineHeader() {
  const hours = scheduleJobsHourLabels()

  return (
    <div
      className="sticky top-0 z-20 flex shrink-0 border-b border-border/80 bg-card/95 shadow-sm backdrop-blur-md"
      style={{ width: BOARD_MIN_WIDTH, minWidth: BOARD_MIN_WIDTH }}
    >
      <div
        className="sticky left-0 z-30 flex shrink-0 items-end border-r border-border/80 bg-card/95 px-3 py-2 backdrop-blur-md"
        style={{ width: SCHEDULE_JOBS_CARER_COL_WIDTH, minWidth: SCHEDULE_JOBS_CARER_COL_WIDTH }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Carer</span>
      </div>
      <div
        className="relative flex shrink-0"
        style={{ width: SCHEDULE_JOBS_TIMELINE_TRACK_WIDTH, minWidth: SCHEDULE_JOBS_TIMELINE_TRACK_WIDTH }}
      >
        <div className="flex flex-col" style={{ width: SCHEDULE_JOBS_TIMELINE_GRID_WIDTH }}>
          <div className="flex border-b border-border/60">
            {SCHEDULE_JOBS_DAY_PERIOD_BANDS.map((band) => (
              <div
                key={band.id}
                className={cn(
                  'flex shrink-0 flex-col items-center justify-center border-r border-border/50 px-1 py-1.5 text-center',
                  scheduleJobsPeriodBandHeaderClass(band.period),
                )}
                style={{ width: (band.endHour - band.startHour) * SCHEDULE_JOBS_HOUR_WIDTH }}
                title={`${band.label} (${formatScheduleJobsPeriodRange(band)})`}
              >
                <span className="flex items-center gap-1 text-[10px] font-bold leading-tight">
                  <span aria-hidden>{PERIOD_ICONS[band.period]}</span>
                  {band.label}
                </span>
                <span className="mt-0.5 text-[9px] font-medium tabular-nums opacity-80">
                  {formatScheduleJobsPeriodRange(band)}
                </span>
              </div>
            ))}
          </div>

          <div className="relative flex">
            {hours.map((hour) => {
              const band = scheduleJobsPeriodBandForHour(hour)
              const isPeriodStart = hour === band.startHour
              return (
                <div
                  key={hour}
                  className={cn(
                    'shrink-0 border-r border-border/60 px-0.5 py-1.5 text-center',
                    scheduleJobsPeriodHourCellClass(band.period),
                  )}
                  style={{ width: SCHEDULE_JOBS_HOUR_WIDTH }}
                >
                  <span
                    className={cn(
                      'block text-[10px] tabular-nums leading-none',
                      isPeriodStart ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
                    )}
                  >
                    {formatScheduleJobsHourLabel(hour)}
                  </span>
                  {isPeriodStart ? (
                    <span className="mt-0.5 block truncate text-[8px] font-semibold uppercase tracking-wide text-muted-foreground/90">
                      {band.label}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div
          className="shrink-0 self-stretch border-l border-dashed border-border/50 bg-muted/20"
          style={{ width: SCHEDULE_JOBS_TIMELINE_PAD_RIGHT }}
          aria-hidden
        />
      </div>
    </div>
  )
}

function ScheduleJobsLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/80 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent px-4 py-2.5">
      <LegendPill swatch="bg-emerald-500" label="Available" />
      <LegendPill swatch="bg-rose-500" label="Booked" />
      <LegendPill swatch="bg-amber-500" label="Possibly available" />
      <LegendPill striped label="Outside hours" />
      <LegendPill striped label="Over weekly contract" />
      <LegendPill swatch="bg-rose-500" label="Over booked (extra carers)" />
      <div className="hidden h-4 w-px bg-border/80 sm:block" />
      {SCHEDULE_JOBS_DAY_PERIOD_BANDS.map((band) => (
        <span
          key={band.id}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold',
            scheduleJobsPeriodBandHeaderClass(band.period),
          )}
          title={formatScheduleJobsPeriodRange(band)}
        >
          <span aria-hidden>{PERIOD_ICONS[band.period]}</span>
          {band.label}
        </span>
      ))}
      <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-muted-foreground lg:inline-flex">
        <Clock className="h-3 w-3" />
        Click job to assign · drag to move
      </span>
    </div>
  )
}

export function ScheduleJobsGantt({
  date,
  employeeRows,
  unassignedJobs,
  savingJobId,
  excessContractedJobIds,
  overAllocatedJobIds,
  onJobClick,
  onJobDrop,
}: Props) {
  const drag = useScheduleJobsDrag({
    date,
    trackWidthPx: SCHEDULE_JOBS_TIMELINE_GRID_WIDTH,
    onJobDrop,
  })

  const duplicateNameIds = React.useMemo(
    () => employeeBriefDuplicateNameIds(employeeRows),
    [employeeRows],
  )
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = 7 * SCHEDULE_JOBS_HOUR_WIDTH
  }, [date])

  return (
    <TooltipProvider delayDuration={200}>
      <ScheduleJobsDragOverlay />
      <div
        data-schedule-jobs-board
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <ScheduleJobsLegend />
        <div ref={scrollRef} data-schedule-jobs-scroll className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
          <div style={{ width: BOARD_MIN_WIDTH, minWidth: BOARD_MIN_WIDTH }}>
            <ScheduleJobsTimelineHeader />

            <GanttRow
              rowKey="unassigned"
              sourceRow={{ kind: 'unassigned' }}
              label="Unassigned"
              subtitle={
                unassignedJobs.length > 0
                  ? `${unassignedJobs.length} job${unassignedJobs.length === 1 ? '' : 's'} need carers`
                  : 'Jobs awaiting allocation'
              }
              muted
              unassigned
              jobs={unassignedJobs}
              date={date}
              isDropTarget={drag.hoverRowKey === 'unassigned'}
              savingJobId={savingJobId}
              draggingJobId={drag.draggingJobId}
              onPointerDown={drag.startDrag}
              onJobClick={onJobClick}
              shouldIgnoreClick={drag.shouldIgnoreClick}
              alignJobsTop
              excessContractedJobIds={excessContractedJobIds}
              overAllocatedJobIds={overAllocatedJobIds}
              trackClassName="bg-amber-50/30 dark:bg-amber-950/10"
            />

            {employeeRows.map((row, index) => {
              const display = employeeBriefDisplayName(row.employee)
              const full = employeeBriefFullName(row.employee)
              const { label, subtitle } = employeeBriefRowLabel(
                row.employee,
                duplicateNameIds.has(row.employee.id),
              )
              const rowKey = scheduleJobsRowKey({ kind: 'carer', employeeId: row.employee.id })
              const hasJobs = row.allocations.length > 0
              return (
                <GanttRow
                  key={row.employee.id}
                  rowKey={rowKey}
                  sourceRow={{ kind: 'carer', employeeId: row.employee.id }}
                  label={label}
                  fullName={full !== display ? full : undefined}
                  subtitle={subtitle}
                  avatarInitials={employeeBriefInitials(row.employee)}
                  showCar={!row.employee.isAgencyStaff}
                  jobs={row.allocations.map((allocation) => allocation.job)}
                  date={date}
                  isDropTarget={drag.hoverRowKey === rowKey}
                  savingJobId={savingJobId}
                  draggingJobId={drag.draggingJobId}
                  dayPattern={row.dayPattern}
                  showCarerAvailability
                  excessContractedJobIds={excessContractedJobIds}
                  overAllocatedJobIds={overAllocatedJobIds}
                  zebra={index % 2 === 1}
                  onPointerDown={drag.startDrag}
                  onJobClick={onJobClick}
                  shouldIgnoreClick={drag.shouldIgnoreClick}
                  trackClassName={hasJobs ? undefined : 'bg-sky-50/35 dark:bg-sky-950/10'}
                />
              )
            })}

            {employeeRows.length === 0 && unassignedJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No jobs scheduled</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Generate a rota from a service user visit plan to populate this day.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
