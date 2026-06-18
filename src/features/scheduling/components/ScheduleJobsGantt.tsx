import * as React from 'react'
import { Car, Clock, Users, UserX } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { useScheduleJobsDrag } from '@/features/scheduling/hooks/useScheduleJobsDrag'
import type { EmployeeListRow } from '@/features/employees/api/employees.api'
import type { EmployeeDayRow, JobsDayRunsResponse, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { ScheduleJobsRunLegend } from '@/features/scheduling/components/ScheduleJobsRunLegend'
import {
  scheduleRunAccentColor,
  scheduleRunJobLabel,
} from '@/features/scheduling/utils/schedule-run-board.util'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import { ScheduleCarerAvailabilityOverlay } from '@/features/scheduling/components/ScheduleCarerAvailabilityOverlay'
import { ScheduleJobContextMenu } from '@/features/scheduling/components/ScheduleJobContextMenu'
import { ScheduleCarerHoverCard } from '@/features/scheduling/components/ScheduleCarerHoverCard'
import { ScheduleJobHoverTooltip } from '@/features/scheduling/components/ScheduleJobHoverCard'
import { ScheduleJobsDragOverlay } from '@/features/scheduling/components/ScheduleJobsDragOverlay'
import { ScheduleJobsMarqueeOverlay } from '@/features/scheduling/components/ScheduleJobsMarqueeOverlay'
import { useScheduleJobsMarqueeSelect } from '@/features/scheduling/hooks/useScheduleJobsMarqueeSelect'
import { buildRunVisitLabelLines } from '@/features/scheduling/utils/schedule-runs-display-preferences.util'
import type { ScheduleRunsDisplayPreferences } from '@/features/scheduling/utils/schedule-runs-display-preferences.util'
import { useScheduleRunsDisplayPreferences } from '@/features/scheduling/hooks/useScheduleRunsDisplayPreferences'
import { handleScheduleJobHoverWheel } from '@/features/scheduling/utils/schedule-jobs-scroll.util'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import type { JobDropPayload, ScheduleJobsRowRef } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import type { ScheduleJobContextAction } from '@/features/scheduling/types/schedule-job-context-actions.types'
import { isScheduleJobCompleted, isScheduleJobReadOnly } from '@/features/scheduling/types/schedule-job-context-actions.types'
import { scheduleJobsRowKey } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import { travelConflictJobIds } from '@/features/scheduling/utils/schedule-job-travel-distance.util'
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
  jobBlockCompletedSurfaceStyle,
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
  runs?: JobsDayRunsResponse['runs']
  employeeCatalogById?: Map<string, EmployeeListRow>
  locationNames?: Map<string, string>
  savingJobId?: string | null
  excessContractedJobIds?: Set<string>
  overAllocatedJobIds?: Set<string>
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  travelBufferMinutes?: number
  onJobClick: (job: TimelineJob) => void
  onJobAction: (job: TimelineJob, action: ScheduleJobContextAction) => void
  onJobDrop: (payload: JobDropPayload) => void | Promise<void>
  onJobsSelectedForRun?: (jobs: TimelineJob[]) => void
  onOpenRun?: (runId: string) => void
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
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
  travelBufferMinutes,
  travelConflictToNext,
  rowJobs,
  isMarqueeSelected,
  runDisplayPreferences,
  onPointerDown,
  onClick,
  onJobAction,
  onOpenRun,
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
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  travelBufferMinutes?: number
  travelConflictToNext?: boolean
  rowJobs?: TimelineJob[]
  isMarqueeSelected?: boolean
  runDisplayPreferences?: ScheduleRunsDisplayPreferences
  onPointerDown: (job: TimelineJob, sourceRow: ScheduleJobsRowRef, event: React.PointerEvent) => void
  onClick: (job: TimelineJob) => void
  onJobAction: (job: TimelineJob, action: ScheduleJobContextAction) => void
  onOpenRun?: (runId: string) => void
  shouldIgnoreClick?: () => boolean
}) {
  const tone = jobBlockTone(job)
  const useRunLabels = Boolean(job.scheduleRunId && runDisplayPreferences)
  const labelLines = useRunLabels
    ? buildRunVisitLabelLines(job, runDisplayPreferences!, {
        visitPlanSlotsByServiceUser,
        acceptedCarePlansByServiceUser,
      })
    : [serviceUserLabel(job.serviceUser)]
  const layoutLabel = labelLines[0] ?? serviceUserLabel(job.serviceUser)
  const readOnly = isScheduleJobReadOnly(job)
  const completed = isScheduleJobCompleted(job)
  const { leftPx, widthPx } = jobBlockLayoutPx(job, layoutLabel)
  const runAccent = job.scheduleRunId ? scheduleRunAccentColor(job.scheduleRunId) : null
  const runLabel = scheduleRunJobLabel(job)
  const showDoubleUp =
    (runDisplayPreferences?.showDoubleUpIcon ?? true) && job.requiredCarers > 1
  const showTravelIcon =
    (runDisplayPreferences?.showTravelMethodIcons ?? false) && Boolean(job.scheduleRunId)

  const block = (
    <div
      role="button"
      tabIndex={0}
      data-schedule-job-block
      data-job-id={job.id}
      className={cn(
        'absolute z-[2] flex select-none flex-col overflow-hidden rounded-md border text-left text-[11px] font-semibold leading-tight transition-shadow',
        JOB_BLOCK_TONE_CLASSES[tone],
        job.scheduleRunId && 'border-l-[3px]',
        job.scheduleRunId
          ? showBookedTooltip
            ? 'top-1 h-9'
            : alignTop
              ? 'top-0.5 h-9'
              : 'top-1.5 bottom-1.5 min-h-9'
          : showBookedTooltip
            ? 'top-1 h-7'
            : alignTop
              ? 'top-0.5 h-8'
              : 'top-1.5 bottom-1.5',
        readOnly
          ? isDragging
            ? 'pointer-events-none opacity-25'
            : 'cursor-pointer hover:shadow-md'
          : cn(
              'touch-none',
              isDragging
                ? 'pointer-events-none cursor-grabbing opacity-25'
                : 'cursor-grab hover:shadow-md active:scale-[0.99]',
            ),
        isMarqueeSelected && 'ring-2 ring-primary ring-offset-1',
        excessContracted &&
          !completed &&
          'border-amber-600 bg-[repeating-linear-gradient(135deg,rgba(251,191,36,0.22),rgba(251,191,36,0.22)_6px,rgba(255,255,255,0.45)_6px,rgba(255,255,255,0.45)_12px)] ring-2 ring-amber-500/70',
        overAllocated && !completed && 'ring-2 ring-rose-500/80 border-rose-600',
        travelConflictToNext && !completed && 'ring-2 ring-orange-500/80 border-orange-600',
        saving && 'animate-pulse opacity-60',
      )}
      style={{
        left: leftPx,
        width: widthPx,
        ...(completed ? jobBlockCompletedSurfaceStyle : {}),
        ...(runAccent ? { borderLeftColor: runAccent.border } : {}),
      }}
      title={
        runLabel
          ? `${runLabel} — ${labelLines.join(' · ')}`
          : completed
          ? 'Visit completed — click to view details'
          : readOnly
          ? 'This job cannot be edited — click to view details'
          : travelConflictToNext
            ? 'Not enough travel time to reach the next visit — hover for details · click to manage'
          : excessContracted
          ? 'Exceeds weekly contracted hours from visit plan — click to manage carers · drag to move'
          : overAllocated
            ? 'More carers assigned than required — over booked · click to manage'
            : 'Click to manage carers · drag to move'
      }
      onPointerDown={readOnly ? undefined : (event) => onPointerDown(job, sourceRow, event)}
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
      <div className="flex min-h-0 flex-1 items-center gap-1 px-2 py-0.5">
        {(showDoubleUp || showTravelIcon) && (
          <span className="flex shrink-0 flex-col gap-0.5">
            {showDoubleUp ? <Users className="h-3 w-3 opacity-80" aria-hidden /> : null}
            {showTravelIcon ? <Car className="h-3 w-3 opacity-70" aria-hidden /> : null}
          </span>
        )}
        <span className="relative z-[1] min-w-0 flex-1">
          {labelLines.slice(0, runDisplayPreferences?.linesOfData ?? 1).map((line, index) => (
            <span
              key={`${index}-${line}`}
              className={cn(
                'block truncate leading-tight',
                index === 0 ? 'font-semibold' : 'text-[9px] font-medium text-muted-foreground',
              )}
            >
              {line}
            </span>
          ))}
        </span>
      </div>
      {job.scheduleRunId && runAccent && job.scheduleRun ? (
        <button
          type="button"
          className="flex h-3.5 w-full shrink-0 items-center gap-1 border-t px-1.5 text-left hover:brightness-95"
          style={{
            backgroundColor: runAccent.bg,
            borderTopColor: runAccent.border,
            color: runAccent.text,
          }}
          title={`Open run: ${runLabel ?? job.scheduleRun.name}`}
          onClick={(event) => {
            event.stopPropagation()
            onOpenRun?.(job.scheduleRunId!)
          }}
        >
          <span className="min-w-0 flex-1 truncate text-[8px] font-semibold leading-none">
            {job.scheduleRun.name}
          </span>
          {job.runSequence != null ? (
            <span
              className="shrink-0 rounded px-0.5 text-[8px] font-bold leading-none"
              style={{ backgroundColor: runAccent.border, color: '#fff' }}
              aria-label={`Stop ${job.runSequence}`}
            >
              {job.runSequence}
            </span>
          ) : null}
        </button>
      ) : null}
    </div>
  )

  if (isDragging) return block

  return (
    <ScheduleJobContextMenu
      job={job}
      onAction={onJobAction}
      tooltip={
        <ScheduleJobHoverTooltip
          job={job}
          date={date}
          variant={showBookedTooltip ? 'availability' : 'tooltip'}
          visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
          acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
          rowJobs={rowJobs}
          travelBufferMinutes={travelBufferMinutes}
        />
      }
    >
      {block}
    </ScheduleJobContextMenu>
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
  hoverCard,
}: {
  name: string
  fullName?: string
  subtitle?: string
  showCar?: boolean
  muted?: boolean
  avatarInitials?: string
  unassigned?: boolean
  hoverCard?: React.ReactNode
}) {
  const label = (
    <div
      data-schedule-carer-label
      className={cn(
        'flex h-full shrink-0 items-center gap-2.5 border-r border-border/80 px-3',
        muted && 'bg-amber-50/50 dark:bg-amber-950/15',
        unassigned && 'border-l-4 border-l-amber-400',
        hoverCard && 'cursor-default',
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
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
  travelBufferMinutes,
  previewJobIds,
  runDisplayPreferences,
  onPointerDown,
  onJobClick,
  onJobAction,
  onOpenRun,
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
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  travelBufferMinutes?: number
  previewJobIds?: Set<string>
  runDisplayPreferences?: ScheduleRunsDisplayPreferences
  onPointerDown: (job: TimelineJob, sourceRow: ScheduleJobsRowRef, event: React.PointerEvent) => void
  onJobClick: (job: TimelineJob) => void
  onJobAction: (job: TimelineJob, action: ScheduleJobContextAction) => void
  onOpenRun?: (runId: string) => void
  shouldIgnoreClick?: () => boolean
  className?: string
}) {
  const hours = scheduleJobsHourLabels()
  const availabilitySegments = React.useMemo(
    () => (showCarerAvailability ? buildCarerAvailabilitySegments(jobs, dayPattern) : []),
    [showCarerAvailability, jobs, dayPattern],
  )
  const travelConflictJobIdSet = React.useMemo(
    () =>
      showCarerAvailability
        ? travelConflictJobIds(jobs, travelBufferMinutes ?? 0)
        : new Set<string>(),
    [jobs, travelBufferMinutes, showCarerAvailability],
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
          visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
          acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
          travelBufferMinutes={travelBufferMinutes}
          travelConflictToNext={travelConflictJobIdSet.has(job.id)}
          rowJobs={jobs}
          isMarqueeSelected={previewJobIds?.has(job.id)}
          runDisplayPreferences={runDisplayPreferences}
          onPointerDown={onPointerDown}
          onClick={onJobClick}
          onJobAction={onJobAction}
          onOpenRun={onOpenRun}
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
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
  travelBufferMinutes,
  previewJobIds,
  zebra,
  runDisplayPreferences,
  onPointerDown,
  onJobClick,
  onJobAction,
  onOpenRun,
  shouldIgnoreClick,
  trackClassName,
  carerHoverCard,
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
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  travelBufferMinutes?: number
  previewJobIds?: Set<string>
  zebra?: boolean
  runDisplayPreferences?: ScheduleRunsDisplayPreferences
  onPointerDown: (job: TimelineJob, sourceRow: ScheduleJobsRowRef, event: React.PointerEvent) => void
  onJobClick: (job: TimelineJob) => void
  onJobAction: (job: TimelineJob, action: ScheduleJobContextAction) => void
  onOpenRun?: (runId: string) => void
  shouldIgnoreClick?: () => boolean
  trackClassName?: string
  carerHoverCard?: React.ReactNode
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
          hoverCard={carerHoverCard}
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
        visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
        acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
        travelBufferMinutes={travelBufferMinutes}
        previewJobIds={previewJobIds}
        runDisplayPreferences={runDisplayPreferences}
        onPointerDown={onPointerDown}
        onJobClick={onJobClick}
        onJobAction={onJobAction}
        onOpenRun={onOpenRun}
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
      data-schedule-timeline-header
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
      <LegendPill swatch="border-2 border-orange-500 bg-orange-100/80" label="Travel time conflict" />
      <LegendPill swatch="border-b-4 border-primary bg-background" label="Part of a run" />
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
        Click job to assign · drag job to move · drag on timeline to create a run
      </span>
    </div>
  )
}

export function ScheduleJobsGantt({
  date,
  employeeRows,
  unassignedJobs,
  runs = [],
  employeeCatalogById,
  locationNames,
  savingJobId,
  excessContractedJobIds,
  overAllocatedJobIds,
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
  travelBufferMinutes,
  onJobClick,
  onJobAction,
  onJobDrop,
  onJobsSelectedForRun,
  onOpenRun,
}: Props) {
  const { preferences: runDisplayPreferences } = useScheduleRunsDisplayPreferences()
  const locationNameMap = locationNames ?? new Map<string, string>()
  const drag = useScheduleJobsDrag({
    date,
    trackWidthPx: SCHEDULE_JOBS_TIMELINE_GRID_WIDTH,
    onJobDrop,
  })

  const jobsById = React.useMemo(() => {
    const map = new Map<string, TimelineJob>()
    for (const job of unassignedJobs) map.set(job.id, job)
    for (const row of employeeRows) {
      for (const allocation of row.allocations) {
        map.set(allocation.job.id, allocation.job)
      }
    }
    return map
  }, [employeeRows, unassignedJobs])

  const handleSelectionComplete = React.useCallback(
    (jobs: TimelineJob[]) => {
      onJobsSelectedForRun?.(jobs)
    },
    [onJobsSelectedForRun],
  )

  const marquee = useScheduleJobsMarqueeSelect({
    jobsById,
    onSelectionComplete: handleSelectionComplete,
    minJobs: 2,
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
    <TooltipProvider delayDuration={200} disableHoverableContent={false}>
      <ScheduleJobsDragOverlay />
      <ScheduleJobsMarqueeOverlay rect={marquee.marqueeRect} />
      <div
        data-schedule-jobs-board
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <div data-schedule-jobs-legend>
          <ScheduleJobsLegend />
          <ScheduleJobsRunLegend runs={runs} />
        </div>
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
              onJobAction={onJobAction}
              onOpenRun={onOpenRun}
              shouldIgnoreClick={drag.shouldIgnoreClick}
              alignJobsTop
              excessContractedJobIds={excessContractedJobIds}
              overAllocatedJobIds={overAllocatedJobIds}
              visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
              acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
              travelBufferMinutes={travelBufferMinutes}
              previewJobIds={marquee.previewJobIds}
              runDisplayPreferences={runDisplayPreferences}
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
                  visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
                  acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
                  travelBufferMinutes={travelBufferMinutes}
                  previewJobIds={marquee.previewJobIds}
                  runDisplayPreferences={runDisplayPreferences}
                  zebra={index % 2 === 1}
                  onPointerDown={drag.startDrag}
                  onJobClick={onJobClick}
                  onJobAction={onJobAction}
                  onOpenRun={onOpenRun}
                  shouldIgnoreClick={drag.shouldIgnoreClick}
                  trackClassName={hasJobs ? undefined : 'bg-sky-50/35 dark:bg-sky-950/10'}
                  carerHoverCard={
                    <ScheduleCarerHoverCard
                      row={row}
                      catalog={employeeCatalogById?.get(row.employee.id)}
                      locationNames={locationNameMap}
                    />
                  }
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
