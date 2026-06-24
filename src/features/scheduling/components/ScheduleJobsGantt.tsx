import * as React from 'react'
import { Car, Clock, Search, UserX, AlertTriangle, BedDouble, Ban, CalendarOff, CalendarClock, X } from 'lucide-react'
import { ScheduleJobRequiredCarersIcon } from '@/features/scheduling/components/ScheduleJobRequiredCarersIcon'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
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
import { ScheduleServiceUserHoverCard } from '@/features/scheduling/components/ScheduleServiceUserHoverCard'
import { ScheduleJobHoverTooltip } from '@/features/scheduling/components/ScheduleJobHoverCard'
import { ScheduleJobTravelConnectors } from '@/features/scheduling/components/ScheduleJobTravelConnectors'
import { useScheduleJobsDisplayFormat } from '@/features/scheduling/context/schedule-jobs-display-format.context'
import { ScheduleJobsDragOverlay } from '@/features/scheduling/components/ScheduleJobsDragOverlay'
import { ScheduleJobsMarqueeOverlay } from '@/features/scheduling/components/ScheduleJobsMarqueeOverlay'
import { useScheduleJobsMarqueeSelect } from '@/features/scheduling/hooks/useScheduleJobsMarqueeSelect'
import type { ScheduleRunsDisplayPreferences } from '@/features/scheduling/utils/schedule-runs-display-preferences.util'
import { useScheduleRunsDisplayPreferences } from '@/features/scheduling/hooks/useScheduleRunsDisplayPreferences'
import { handleScheduleJobHoverWheel } from '@/features/scheduling/utils/schedule-jobs-scroll.util'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'
import type { JobDropPayload, ScheduleJobsRowRef } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import { scheduleJobsRowKey } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import type { ScheduleJobContextAction } from '@/features/scheduling/types/schedule-job-context-actions.types'
import {
  isScheduleJobCancelled,
  isScheduleJobCompleted,
  isScheduleJobReadOnly,
} from '@/features/scheduling/types/schedule-job-context-actions.types'
import {
  type ScheduleJobsBoardRowAxis,
  type ServiceUserDayRow,
  scheduleJobBlockDisplayLabel,
  scheduleJobBlockLabelLines,
  serviceUserBriefInitials,
  serviceUserRowSubtitle,
} from '@/features/scheduling/utils/schedule-jobs-board-axis.util'
import { travelConflictJobIds } from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import { buildScheduleJobTravelConnectors } from '@/features/scheduling/utils/schedule-job-travel-connector.util'
import { buildCarerAvailabilitySegments, resolveCarerDayAvailabilityBadge } from '@/features/scheduling/utils/schedule-jobs-availability.util'
import type { EmployeeDayPattern } from '@/features/scheduling/types/scheduling.types'
import { TimeCriticalDot } from '@/features/service-users/visit-plan/TimeCriticalDot'
import { resolveJobTimeCritical } from '@/features/scheduling/utils/schedule-job-time-critical.util'
import {
  carerAvatarTone,
  employeeBriefDisplayName,
  employeeBriefDuplicateNameIds,
  employeeBriefFullName,
  employeeBriefInitials,
  employeeBriefRowLabel,
  JOB_BLOCK_TONE_CLASSES,
  jobBlockCancelledSurfaceStyle,
  jobBlockCompletedSurfaceStyle,
  jobBlockTone,
  SCHEDULE_JOBS_CARER_COL_WIDTH,
  SCHEDULE_JOBS_DAY_PERIOD_BANDS,
  SCHEDULE_JOBS_HOUR_WIDTH,
  SCHEDULE_JOBS_JOB_LANE_HEIGHT,
  SCHEDULE_JOBS_JOB_LANE_HEIGHT_RUNS_BOARD,
  SCHEDULE_JOBS_ROW_HEIGHT,
  scheduleJobsPeriodBandHeaderClass,
  scheduleJobsPeriodHourCellClass,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import {
  jobBlockLayoutPxInViewport,
  jobOverlapsViewport,
  resolveScheduleJobsTimelineViewport,
  scheduleJobsPeriodBandForViewportHour,
  type ScheduleJobsTimelineViewport,
} from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'
import {
  computeScheduleJobOverlapLayout,
  resolveScheduleJobsJobLaneHeight,
  scheduleJobLaneTopPx,
  type JobOverlapLayout,
} from '@/features/scheduling/utils/schedule-jobs-overlap-lanes.util'
import {
  filterScheduleJobsEmployeeRows,
  filterScheduleJobsServiceUserRows,
  normalizeScheduleJobsRowSearchQuery,
} from '@/features/scheduling/utils/schedule-jobs-row-search.util'

const PERIOD_ICONS: Record<string, string> = {
  night: '🌙',
  morning: '🌅',
  midday: '☀️',
  afternoon: '🌤️',
  evening: '🌆',
}

type Props = {
  date: string
  rowAxis?: ScheduleJobsBoardRowAxis
  employeeRows: EmployeeDayRow[]
  serviceUserRows?: ServiceUserDayRow[]
  unassignedJobs: TimelineJob[]
  cancelledJobs: TimelineJob[]
  runs?: JobsDayRunsResponse['runs']
  /** When true, show run legend, accents, and run strip on job blocks (Runs view only). */
  showRunsOnBoard?: boolean
  employeeCatalogById?: Map<string, EmployeeListRow>
  locationNames?: Map<string, string>
  savingJobId?: string | null
  excessContractedJobIds?: Set<string>
  outsidePatternJobIds?: Set<string>
  overAllocatedJobIds?: Set<string>
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  travelBufferMinutes?: number
  onJobClick: (job: TimelineJob) => void
  onJobAction: (job: TimelineJob, action: ScheduleJobContextAction) => void
  onJobDrop: (payload: JobDropPayload) => void | Promise<void>
  onJobsSelectedForRun?: (jobs: TimelineJob[]) => void
  onOpenRun?: (runId: string) => void
  onReassignRun?: (runId: string) => void
}

function scheduleJobsBoardMinWidth(
  viewport: ScheduleJobsTimelineViewport,
  scrollClientWidth?: number,
): number {
  if (viewport.mode === 'focused-period' && scrollClientWidth != null && scrollClientWidth > 0) {
    return scrollClientWidth
  }
  return SCHEDULE_JOBS_CARER_COL_WIDTH + viewport.trackWidth
}

function scheduleJobsRowShowsTravelConnectors(sourceRow: ScheduleJobsRowRef): boolean {
  return sourceRow.kind === 'carer' || sourceRow.kind === 'unassigned'
}

function scheduleJobBlockHasVisibleIcons(
  job: TimelineJob,
  stackedLanes: boolean,
  overlapLayout: JobOverlapLayout | undefined,
  showRequiredCarersIcon: boolean,
  showTravelIcon: boolean,
  outsidePattern?: boolean,
): boolean {
  const showLaneBadge = stackedLanes && overlapLayout != null
  const showOperationalBadges =
    Boolean(job.serviceUserAbsent) ||
    (job.carersOnLeave?.length ?? 0) > 0 ||
    Boolean(job.needsCover) ||
    Boolean(outsidePattern)
  return showLaneBadge || showRequiredCarersIcon || showTravelIcon || showOperationalBadges
}

function ScheduleJobBlockIcons({
  job,
  overlapLayout,
  stackedLanes,
  showRequiredCarersIcon,
  showTravelIcon,
  showOperationalBadges,
  outsidePattern,
}: {
  job: TimelineJob
  overlapLayout?: JobOverlapLayout
  stackedLanes: boolean
  showRequiredCarersIcon: boolean
  showTravelIcon: boolean
  showOperationalBadges: boolean
  outsidePattern?: boolean
}) {
  const showLaneBadge = stackedLanes && overlapLayout
  if (!showLaneBadge && !showRequiredCarersIcon && !showTravelIcon && !showOperationalBadges) {
    return null
  }

  return (
    <>
      {showLaneBadge ? (
        <span
          className="shrink-0 rounded bg-slate-900/85 px-1 text-[9px] font-bold tabular-nums leading-none text-white"
          aria-label={`Visit ${overlapLayout.lane + 1} of ${overlapLayout.laneCount} at this time`}
        >
          {overlapLayout.lane + 1}/{overlapLayout.laneCount}
        </span>
      ) : null}
      {showRequiredCarersIcon ? (
        <ScheduleJobRequiredCarersIcon requiredCarers={job.requiredCarers} className="h-2.5 w-2.5" />
      ) : null}
      {showTravelIcon ? <Car className="h-2.5 w-2.5 shrink-0 opacity-70" aria-hidden /> : null}
      {job.serviceUserAbsent ? (
        <span title="Client absent">
          <BedDouble className="h-2.5 w-2.5 shrink-0 text-rose-600" aria-label="Client absent" />
        </span>
      ) : null}
      {(job.carersOnLeave?.length ?? 0) > 0 ? (
        <span title="Carer on leave">
          <Clock className="h-2.5 w-2.5 shrink-0 text-amber-600" aria-label="Carer on leave" />
        </span>
      ) : null}
      {job.needsCover && !job.serviceUserAbsent ? (
        <span title="Needs cover">
          <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-sky-600" aria-label="Needs cover" />
        </span>
      ) : null}
      {outsidePattern ? (
        <span title="Outside carer working pattern">
          <CalendarClock className="h-2.5 w-2.5 shrink-0 text-orange-600" aria-label="Outside carer working pattern" />
        </span>
      ) : null}
    </>
  )
}

function ScheduleJobBlock({
  job,
  date,
  sourceRow,
  saving,
  isDragging,
  alignTop,
  showBookedTooltip,
  excessContracted,
  outsidePattern,
  overAllocated,
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
  travelBufferMinutes,
  travelConflictToNext,
  rowJobs,
  isMarqueeSelected,
  runDisplayPreferences,
  overlapLayout,
  jobLabelMode = 'carer-row',
  showRunsOnBoard = false,
  viewport,
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
  outsidePattern?: boolean
  overAllocated?: boolean
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  travelBufferMinutes?: number
  travelConflictToNext?: boolean
  rowJobs?: TimelineJob[]
  isMarqueeSelected?: boolean
  runDisplayPreferences?: ScheduleRunsDisplayPreferences
  overlapLayout?: JobOverlapLayout
  jobLabelMode?: 'carer-row' | 'service-user-row'
  showRunsOnBoard?: boolean
  viewport: ScheduleJobsTimelineViewport
  onPointerDown: (job: TimelineJob, sourceRow: ScheduleJobsRowRef, event: React.PointerEvent) => void
  onClick: (job: TimelineJob) => void
  onJobAction: (job: TimelineJob, action: ScheduleJobContextAction) => void
  onOpenRun?: (runId: string) => void
  shouldIgnoreClick?: () => boolean
}) {
  const displayFormat = useScheduleJobsDisplayFormat()
  const formatJobTimeRange = (target: TimelineJob) =>
    `${displayFormat.formatTime(target.scheduledStartDateTime)}–${displayFormat.formatTime(target.scheduledEndDateTime ?? target.scheduledStartDateTime)}`
  const tone = jobBlockTone(job, { outsideWorkingPattern: outsidePattern })
  const labelLines = scheduleJobBlockLabelLines(job, jobLabelMode, displayFormat.timeDisplayFormat)
  const blockLabel = scheduleJobBlockDisplayLabel(job, jobLabelMode)
  const readOnly = isScheduleJobReadOnly(job)
  const completed = isScheduleJobCompleted(job)
  const cancelled = isScheduleJobCancelled(job)
  const layout = jobBlockLayoutPxInViewport(job, viewport)
  if (!layout) return null
  const { leftPx, widthPx } = layout
  const stackedLanes = (overlapLayout?.laneCount ?? 1) > 1
  const roomyBlock = !stackedLanes && widthPx >= 112
  const showRunUi = showRunsOnBoard && Boolean(job.scheduleRunId)
  const runAccent = showRunUi ? scheduleRunAccentColor(job.scheduleRunId!) : null
  const runLabel = showRunUi ? scheduleRunJobLabel(job) : null
  const showRequiredCarersIcon = Boolean(
    (runDisplayPreferences?.showDoubleUpIcon ?? true) && (job.requiredCarers ?? 0) > 1,
  )
  const showTravelIcon = Boolean(
    showRunUi && (runDisplayPreferences?.showTravelMethodIcons ?? false),
  )
  const showRunThirdLine = showRunsOnBoard && Boolean(job.scheduleRun)
  const showOperationalBadges =
    Boolean(job.serviceUserAbsent) ||
    (job.carersOnLeave?.length ?? 0) > 0 ||
    Boolean(job.needsCover) ||
    Boolean(outsidePattern)
  const hasVisibleIcons = scheduleJobBlockHasVisibleIcons(
    job,
    stackedLanes,
    overlapLayout,
    showRequiredCarersIcon,
    showTravelIcon,
    outsidePattern,
  )
  const showStackedBlockLayout = showRunsOnBoard || hasVisibleIcons
  const jobLaneHeight = resolveScheduleJobsJobLaneHeight({
    showRunsOnBoard,
    overlapLaneCount: overlapLayout?.laneCount,
    stackedLabelLayout: hasVisibleIcons,
  })
  const blockHeightClass = showBookedTooltip
    ? roomyBlock ? 'top-0.5 h-12' : 'top-0.5 h-11'
    : alignTop
      ? roomyBlock ? 'top-0.5 h-12' : 'top-0.5 h-11'
      : roomyBlock ? 'top-1 bottom-1 min-h-12' : 'top-1.5 bottom-1.5 min-h-11'
  const runName = job.scheduleRun?.name ?? ''
  const blockSizeClass = showRunThirdLine
    ? showBookedTooltip
      ? 'top-0.5 h-14'
      : alignTop
        ? 'top-0.5 h-14'
        : roomyBlock
          ? 'top-1 bottom-1 min-h-14'
          : 'top-1.5 bottom-1.5 min-h-14'
    : showStackedBlockLayout
      ? showBookedTooltip
        ? 'top-0.5 h-12'
        : alignTop
          ? 'top-0.5 h-12'
          : roomyBlock
            ? 'top-1 bottom-1 min-h-12'
            : 'top-1.5 bottom-1.5 min-h-12'
      : blockHeightClass
  const timeCritical = resolveJobTimeCritical(job, visitPlanSlotsByServiceUser)

  const block = (
    <div
      role="button"
      tabIndex={0}
      data-schedule-job-block
      data-job-id={job.id}
      data-runs-on-board={showRunsOnBoard ? 'true' : 'false'}
      className={cn(
        'absolute z-[2] flex select-none flex-col overflow-hidden rounded-md border text-left text-xs font-medium leading-snug antialiased transition-shadow',
        JOB_BLOCK_TONE_CLASSES[tone],
        showRunUi && !cancelled && 'border-l-[3px]',
        stackedLanes
          ? 'h-[var(--schedule-job-lane-height)] shadow-sm ring-1 ring-background/80'
          : blockSizeClass,
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
          !cancelled &&
          'border-amber-600 bg-[repeating-linear-gradient(135deg,rgba(251,191,36,0.22),rgba(251,191,36,0.22)_6px,rgba(255,255,255,0.45)_6px,rgba(255,255,255,0.45)_12px)] ring-2 ring-amber-500/70',
        overAllocated && !completed && !cancelled && 'ring-2 ring-rose-500/80 border-rose-600',
        outsidePattern &&
          !completed &&
          !cancelled &&
          'ring-2 ring-orange-500/80 border-orange-600',
        travelConflictToNext && !completed && !cancelled && 'ring-2 ring-orange-500/80 border-orange-600',
        saving && 'animate-pulse opacity-60',
      )}
      style={{
        left: leftPx,
        width: widthPx,
        ...(stackedLanes && overlapLayout
          ? {
              top: scheduleJobLaneTopPx(overlapLayout.lane, jobLaneHeight),
              zIndex: overlapLayout.lane + 2,
              ['--schedule-job-lane-height' as string]: `${jobLaneHeight}px`,
            }
          : {}),
        ...(completed ? jobBlockCompletedSurfaceStyle : {}),
        ...(cancelled ? jobBlockCancelledSurfaceStyle : {}),
        ...(runAccent && !cancelled ? { borderLeftColor: runAccent.border } : {}),
      }}
      title={
        stackedLanes && overlapLayout
          ? `${formatJobTimeRange(job)} · Visit ${overlapLayout.lane + 1} of ${overlapLayout.laneCount} at this time — ${labelLines.join(' · ')}`
          : showRunUi && runLabel
          ? `${formatJobTimeRange(job)} · ${runLabel} — ${labelLines.join(' · ')}`
          : completed
          ? `${formatJobTimeRange(job)} · Visit completed — click to view details`
          : cancelled
            ? `${formatJobTimeRange(job)} · Visit cancelled — right-click to reinstate or view details`
          : readOnly
          ? `${formatJobTimeRange(job)} · This job cannot be edited — click to view details`
          : travelConflictToNext
            ? `${formatJobTimeRange(job)} · Not enough travel time to reach the next visit — hover for details · click to manage`
          : excessContracted
          ? `${formatJobTimeRange(job)} · Exceeds weekly contracted hours from visit plan — click to manage carers · drag to move`
          : outsidePattern
            ? `${formatJobTimeRange(job)} · Outside carer working pattern — click to manage carers · drag to move`
          : overAllocated
            ? `${formatJobTimeRange(job)} · More carers assigned than required — over booked · click to manage`
            : `${formatJobTimeRange(job)} · ${labelLines.join(' · ')} · click to manage carers · drag to move`
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
      {timeCritical ? (
        <TimeCriticalDot
          toleranceMinutes={timeCritical.timeToleranceMinutes}
          position="corner"
          size="xs"
        />
      ) : null}
      {showStackedBlockLayout ? (
        <div
          data-schedule-job-block-body="stacked"
          className="grid h-full w-full gap-px px-2 py-0.5"
          style={{
            gridTemplateRows: [
              hasVisibleIcons ? 'minmax(0,auto)' : null,
              'minmax(0,auto)',
              showRunThirdLine ? 'minmax(0,auto)' : null,
            ]
              .filter(Boolean)
              .join(' '),
          }}
        >
          {hasVisibleIcons ? (
            <div
              data-schedule-job-icon-row
              className="flex min-w-0 items-center gap-1 overflow-hidden leading-none"
            >
              <ScheduleJobBlockIcons
                job={job}
                overlapLayout={overlapLayout}
                stackedLanes={stackedLanes}
                showRequiredCarersIcon={showRequiredCarersIcon}
                showTravelIcon={showTravelIcon}
                showOperationalBadges={showOperationalBadges}
                outsidePattern={outsidePattern}
              />
            </div>
          ) : null}
          <div className="min-w-0 truncate text-xs font-semibold leading-tight">{blockLabel}</div>
          {showRunThirdLine && runAccent ? (
            <button
              type="button"
              className="flex min-w-0 max-w-full items-center gap-1 text-left leading-none hover:underline"
              style={{ color: runAccent.text }}
              title={`Open run: ${runLabel ?? runName}`}
              onClick={(event) => {
                event.stopPropagation()
                onOpenRun?.(job.scheduleRunId!)
              }}
            >
              <span className="min-w-0 truncate text-[10px] font-semibold">{runName}</span>
              {job.runSequence != null ? (
                <span
                  className="shrink-0 rounded px-0.5 text-[8px] font-bold leading-none text-white"
                  style={{ backgroundColor: runAccent.border }}
                  aria-label={`Stop ${job.runSequence}`}
                >
                  {job.runSequence}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      ) : (
        <div
          data-schedule-job-block-body="inline"
          className="flex h-full min-h-0 flex-1 items-center gap-1 px-2 py-0.5"
        >
          <ScheduleJobBlockIcons
            job={job}
            overlapLayout={overlapLayout}
            stackedLanes={stackedLanes}
            showRequiredCarersIcon={showRequiredCarersIcon}
            showTravelIcon={showTravelIcon}
            showOperationalBadges={showOperationalBadges}
            outsidePattern={outsidePattern}
          />
          <span className="relative z-[1] min-w-0 flex-1 truncate text-xs font-semibold leading-snug">
            {blockLabel}
          </span>
        </div>
      )}
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
  variant?: 'default' | 'unassigned' | 'cancelled' | 'onLeave' | 'notAvailable' | 'partial'
}) {
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

function CarerLabel({
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
}: {
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
}) {
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
  onHoliday,
  excessContractedJobIds,
  outsidePatternJobIds,
  overAllocatedJobIds,
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
  travelBufferMinutes,
  previewJobIds,
  runDisplayPreferences,
  overlapByJobId,
  jobLaneHeight,
  rowHeightPx,
  jobLabelMode,
  showRunsOnBoard = false,
  viewport,
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
  onHoliday?: boolean
  excessContractedJobIds?: Set<string>
  outsidePatternJobIds?: Set<string>
  overAllocatedJobIds?: Set<string>
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  travelBufferMinutes?: number
  previewJobIds?: Set<string>
  runDisplayPreferences?: ScheduleRunsDisplayPreferences
  overlapByJobId?: Map<string, JobOverlapLayout>
  jobLaneHeight: number
  rowHeightPx: number
  jobLabelMode?: 'carer-row' | 'service-user-row'
  showRunsOnBoard?: boolean
  viewport: ScheduleJobsTimelineViewport
  onPointerDown: (job: TimelineJob, sourceRow: ScheduleJobsRowRef, event: React.PointerEvent) => void
  onJobClick: (job: TimelineJob) => void
  onJobAction: (job: TimelineJob, action: ScheduleJobContextAction) => void
  onOpenRun?: (runId: string) => void
  shouldIgnoreClick?: () => boolean
  className?: string
}) {
  const hours = viewport.hours
  const visibleJobs = React.useMemo(
    () => jobs.filter((job) => jobOverlapsViewport(job, viewport)),
    [jobs, viewport],
  )
  const availabilitySegments = React.useMemo(
    () =>
      showCarerAvailability
        ? buildCarerAvailabilitySegments(jobs, dayPattern, undefined, { onHoliday })
        : [],
    [showCarerAvailability, jobs, dayPattern, onHoliday],
  )
  const travelConflictJobIdSet = React.useMemo(
    () =>
      showCarerAvailability
        ? travelConflictJobIds(jobs, travelBufferMinutes ?? 0)
        : new Set<string>(),
    [jobs, travelBufferMinutes, showCarerAvailability],
  )
  const travelConnectors = React.useMemo(
    () =>
      scheduleJobsRowShowsTravelConnectors(sourceRow)
        ? buildScheduleJobTravelConnectors(jobs, viewport, {
            overlapByJobId,
            jobLaneHeight,
            rowHeightPx,
            travelBufferMinutes,
          })
        : [],
    [jobs, viewport, overlapByJobId, jobLaneHeight, rowHeightPx, travelBufferMinutes, sourceRow],
  )

  return (
    <div
      data-schedule-timeline-track
      className={cn('relative h-full min-h-full shrink-0 overflow-visible', className)}
      style={{ width: viewport.trackWidth, minWidth: viewport.trackWidth }}
    >
      <div
        className="absolute inset-y-0 left-0 flex"
        style={{ width: viewport.gridWidth }}
      >
        {hours.map((hour, index) => {
          const period = scheduleJobsPeriodBandForViewportHour(hour, viewport).period
          const isLastHour = index === hours.length - 1
          const isFocused = viewport.mode === 'focused-period'
          return (
          <div
            key={hour}
            className={cn(
              'relative shrink-0 border-r border-border/60',
              isLastHour && isFocused && 'border-r-0',
              isFocused && 'min-w-0 flex-1',
              scheduleJobsPeriodHourCellClass(period),
            )}
            style={isFocused ? undefined : { width: viewport.hourWidth }}
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
      {viewport.padRight > 0 ? (
        <div
          className="absolute inset-y-0 border-l border-dashed border-border/50 bg-muted/10"
          style={{
            left: viewport.gridWidth,
            width: viewport.padRight,
          }}
          aria-hidden
        />
      ) : null}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: viewport.gridWidth }}
        data-carer-availability={showCarerAvailability ? '' : undefined}
      >
        {showCarerAvailability ? (
          <ScheduleCarerAvailabilityOverlay segments={availabilitySegments} viewport={viewport} />
        ) : null}
      </div>
      <ScheduleJobTravelConnectors
        connectors={travelConnectors}
        gridWidth={viewport.gridWidth}
        rowHeightPx={rowHeightPx}
      />
      {visibleJobs.map((job) => (
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
          outsidePattern={outsidePatternJobIds?.has(job.id)}
          overAllocated={overAllocatedJobIds?.has(job.id)}
          visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
          acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
          travelBufferMinutes={travelBufferMinutes}
          travelConflictToNext={travelConflictJobIdSet.has(job.id)}
          rowJobs={jobs}
          isMarqueeSelected={previewJobIds?.has(job.id)}
          runDisplayPreferences={runDisplayPreferences}
          overlapLayout={overlapByJobId?.get(job.id)}
          jobLabelMode={jobLabelMode}
          showRunsOnBoard={showRunsOnBoard}
          viewport={viewport}
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
  cancelled,
  avatarInitials,
  jobs,
  date,
  isDropTarget,
  savingJobId,
  draggingJobId,
  alignJobsTop,
  dayPattern,
  showCarerAvailability,
  onHoliday,
  holidayEndDate,
  excessContractedJobIds,
  outsidePatternJobIds,
  overAllocatedJobIds,
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
  travelBufferMinutes,
  previewJobIds,
  zebra,
  runDisplayPreferences,
  jobLabelMode,
  showRunsOnBoard = false,
  viewport,
  boardMinWidth,
  onPointerDown,
  onJobClick,
  onJobAction,
  onOpenRun,
  shouldIgnoreClick,
  trackClassName,
  labelHoverCard,
}: {
  rowKey: string
  sourceRow: ScheduleJobsRowRef
  label: string
  fullName?: string
  subtitle?: string
  showCar?: boolean
  muted?: boolean
  unassigned?: boolean
  cancelled?: boolean
  avatarInitials?: string
  jobs: TimelineJob[]
  date: string
  isDropTarget?: boolean
  savingJobId?: string | null
  draggingJobId?: string | null
  alignJobsTop?: boolean
  dayPattern?: EmployeeDayPattern | null
  showCarerAvailability?: boolean
  onHoliday?: boolean
  holidayEndDate?: string | null
  excessContractedJobIds?: Set<string>
  outsidePatternJobIds?: Set<string>
  overAllocatedJobIds?: Set<string>
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  acceptedCarePlansByServiceUser?: Map<string, AcceptedCarePlanItem[]>
  travelBufferMinutes?: number
  previewJobIds?: Set<string>
  zebra?: boolean
  runDisplayPreferences?: ScheduleRunsDisplayPreferences
  jobLabelMode?: 'carer-row' | 'service-user-row'
  showRunsOnBoard?: boolean
  viewport: ScheduleJobsTimelineViewport
  boardMinWidth: number
  onPointerDown: (job: TimelineJob, sourceRow: ScheduleJobsRowRef, event: React.PointerEvent) => void
  onJobClick: (job: TimelineJob) => void
  onJobAction: (job: TimelineJob, action: ScheduleJobContextAction) => void
  onOpenRun?: (runId: string) => void
  shouldIgnoreClick?: () => boolean
  trackClassName?: string
  labelHoverCard?: React.ReactNode
}) {
  const visibleJobs = React.useMemo(
    () => jobs.filter((job) => jobOverlapsViewport(job, viewport)),
    [jobs, viewport],
  )
  const overlapLayout = React.useMemo(
    () =>
      computeScheduleJobOverlapLayout(visibleJobs, {
        jobLaneHeight: showRunsOnBoard ? SCHEDULE_JOBS_JOB_LANE_HEIGHT_RUNS_BOARD : undefined,
      }),
    [visibleJobs, showRunsOnBoard],
  )
  const availabilityBadge = resolveCarerDayAvailabilityBadge(dayPattern, onHoliday)

  return (
    <div
      data-schedule-row-id={rowKey}
      className={cn(
        'flex shrink-0 overflow-visible border-b border-border/70 transition-colors',
        zebra &&
          !onHoliday &&
          !availabilityBadge &&
          'bg-muted/20',
        onHoliday && 'bg-orange-50/30 dark:bg-orange-950/15',
        availabilityBadge?.kind === 'not-available' && 'bg-slate-100/45 dark:bg-slate-950/25',
        availabilityBadge?.kind === 'partial' && 'bg-amber-50/35 dark:bg-amber-950/15',
        isDropTarget && 'bg-primary/5 ring-1 ring-inset ring-primary/30',
      )}
      style={{
        height: overlapLayout.rowHeightPx,
        minHeight: SCHEDULE_JOBS_ROW_HEIGHT,
        width: boardMinWidth,
        minWidth: boardMinWidth,
      }}
    >
      <div className="sticky left-0 z-10 flex shrink-0 self-stretch bg-card/95 backdrop-blur-sm">
        <CarerLabel
          name={label}
          fullName={fullName}
          subtitle={subtitle}
          showCar={showCar}
          muted={muted}
          unassigned={unassigned}
          cancelled={cancelled}
          onLeave={onHoliday}
          leaveEndDate={holidayEndDate}
          dayPattern={dayPattern}
          avatarInitials={avatarInitials}
          hoverCard={labelHoverCard}
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
        onHoliday={onHoliday}
        excessContractedJobIds={excessContractedJobIds}
        outsidePatternJobIds={outsidePatternJobIds}
        overAllocatedJobIds={overAllocatedJobIds}
        visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
        acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
        travelBufferMinutes={travelBufferMinutes}
        previewJobIds={previewJobIds}
        runDisplayPreferences={runDisplayPreferences}
        overlapByJobId={overlapLayout.byJobId}
        jobLaneHeight={overlapLayout.jobLaneHeight}
        rowHeightPx={overlapLayout.rowHeightPx}
        jobLabelMode={jobLabelMode}
        showRunsOnBoard={showRunsOnBoard}
        viewport={viewport}
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

function ScheduleJobsTimelineHeader({
  leftColumnLabel,
  rowSearch,
  onRowSearchChange,
  rowSearchPlaceholder,
  viewport,
  focusedPeriodBandId,
  onPeriodBandDoubleClick,
  onClearPeriodFocus,
  boardMinWidth,
}: {
  leftColumnLabel: string
  rowSearch: string
  onRowSearchChange: (value: string) => void
  rowSearchPlaceholder: string
  viewport: ScheduleJobsTimelineViewport
  focusedPeriodBandId: string | null
  onPeriodBandDoubleClick: (bandId: string) => void
  onClearPeriodFocus: () => void
  boardMinWidth: number
}) {
  const displayFormat = useScheduleJobsDisplayFormat()
  const hours = viewport.hours
  const hasSearch = normalizeScheduleJobsRowSearchQuery(rowSearch).length > 0
  const isFocused = viewport.mode === 'focused-period'

  return (
    <div
      data-schedule-timeline-header
      className="sticky top-0 z-20 flex shrink-0 border-b border-border/80 bg-card/95 shadow-sm backdrop-blur-md"
      style={{ width: boardMinWidth, minWidth: boardMinWidth }}
    >
      <div
        className="sticky left-0 z-30 flex shrink-0 flex-col justify-end gap-2 border-r border-border/80 bg-card/95 px-3 py-2 backdrop-blur-md"
        style={{ width: SCHEDULE_JOBS_CARER_COL_WIDTH, minWidth: SCHEDULE_JOBS_CARER_COL_WIDTH }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {leftColumnLabel}
        </span>
        <Input
          type="search"
          value={rowSearch}
          onChange={(event) => onRowSearchChange(event.target.value)}
          placeholder={rowSearchPlaceholder}
          aria-label={rowSearchPlaceholder}
          data-testid="schedule-jobs-row-search"
          className="h-7 text-xs"
          leftElement={<Search className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
          rightElement={
            hasSearch ? (
              <button
                type="button"
                className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Clear row search"
                onClick={() => onRowSearchChange('')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : undefined
          }
        />
      </div>
      <div
        className="relative flex shrink-0"
        style={{ width: viewport.trackWidth, minWidth: viewport.trackWidth }}
      >
        <div className="flex flex-col" style={{ width: viewport.gridWidth }}>
          <div className="flex border-b border-border/60">
            {viewport.bands.map((band) => (
              <div
                key={band.id}
                role="button"
                tabIndex={0}
                className={cn(
                  'flex shrink-0 cursor-pointer flex-col items-center justify-center border-r border-border/50 px-1 py-1.5 text-center transition-shadow select-none',
                  scheduleJobsPeriodBandHeaderClass(band.period),
                  focusedPeriodBandId === band.id && 'ring-2 ring-inset ring-primary/50',
                  isFocused && 'hover:brightness-95',
                )}
                style={{ width: isFocused ? viewport.gridWidth : (band.endHour - band.startHour) * viewport.hourWidth }}
                title={
                  isFocused && focusedPeriodBandId === band.id
                    ? `${band.label} (${displayFormat.formatPeriodRange(band)}) — double-click or Esc for full day`
                    : `${band.label} (${displayFormat.formatPeriodRange(band)}) — double-click to zoom`
                }
                onDoubleClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  if (focusedPeriodBandId === band.id) {
                    onClearPeriodFocus()
                  } else {
                    onPeriodBandDoubleClick(band.id)
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    if (focusedPeriodBandId === band.id) {
                      onClearPeriodFocus()
                    } else {
                      onPeriodBandDoubleClick(band.id)
                    }
                  }
                }}
              >
                <span className="flex items-center gap-1 text-[10px] font-bold leading-tight">
                  <span aria-hidden>{PERIOD_ICONS[band.period]}</span>
                  {band.label}
                  {isFocused ? (
                    <span className="rounded bg-primary/15 px-1 text-[8px] font-semibold uppercase tracking-wide text-primary">
                      Zoom
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 text-[9px] font-medium tabular-nums opacity-80">
                  {displayFormat.formatPeriodRange(band)}
                </span>
              </div>
            ))}
          </div>

          <div className="relative flex">
            {hours.map((hour, index) => {
              const band = scheduleJobsPeriodBandForViewportHour(hour, viewport)
              const isPeriodStart = hour === band.startHour
              const isLastHour = index === hours.length - 1
              return (
                <div
                  key={hour}
                  className={cn(
                    'shrink-0 border-r border-border/60 px-0.5 py-1.5 text-center',
                    isLastHour && isFocused && 'border-r-0',
                    isFocused && 'min-w-0 flex-1',
                    scheduleJobsPeriodHourCellClass(band.period),
                  )}
                  style={isFocused ? undefined : { width: viewport.hourWidth }}
                >
                  <span
                    className={cn(
                      'block text-[10px] tabular-nums leading-none',
                      isPeriodStart ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
                    )}
                  >
                    {displayFormat.formatHourLabel(hour)}
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

        {viewport.padRight > 0 ? (
          <div
            className="shrink-0 self-stretch border-l border-dashed border-border/50 bg-muted/20"
            style={{ width: viewport.padRight }}
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  )
}

function ScheduleJobsLegend({
  onPeriodBandDoubleClick,
  focusedPeriodBandId,
  onClearPeriodFocus,
}: {
  onPeriodBandDoubleClick?: (bandId: string) => void
  focusedPeriodBandId?: string | null
  onClearPeriodFocus?: () => void
}) {
  const displayFormat = useScheduleJobsDisplayFormat()
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
        <button
          key={band.id}
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold transition-shadow',
            scheduleJobsPeriodBandHeaderClass(band.period),
            focusedPeriodBandId === band.id && 'ring-2 ring-primary/40',
          )}
          title={
            focusedPeriodBandId === band.id
              ? `${displayFormat.formatPeriodRange(band)} — double-click for full day`
              : `${displayFormat.formatPeriodRange(band)} — double-click to zoom`
          }
          onDoubleClick={(event) => {
            event.preventDefault()
            if (!onPeriodBandDoubleClick) return
            if (focusedPeriodBandId === band.id) {
              onClearPeriodFocus?.()
            } else {
              onPeriodBandDoubleClick(band.id)
            }
          }}
        >
          <span aria-hidden>{PERIOD_ICONS[band.period]}</span>
          {band.label}
        </button>
      ))}
      <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-muted-foreground lg:inline-flex">
        <Clock className="h-3 w-3" />
        Click job to assign · drag job to move · double-click period to zoom · Esc for full day
      </span>
    </div>
  )
}

export function ScheduleJobsGantt({
  date,
  rowAxis = 'carers',
  employeeRows,
  serviceUserRows = [],
  unassignedJobs,
  cancelledJobs,
  runs = [],
  showRunsOnBoard = false,
  employeeCatalogById,
  locationNames,
  savingJobId,
  excessContractedJobIds,
  outsidePatternJobIds,
  overAllocatedJobIds,
  visitPlanSlotsByServiceUser,
  acceptedCarePlansByServiceUser,
  travelBufferMinutes,
  onJobClick,
  onJobAction,
  onJobDrop,
  onJobsSelectedForRun,
  onOpenRun,
  onReassignRun,
}: Props) {
  const byServiceUser = rowAxis === 'service-users'
  const jobLabelMode = byServiceUser ? 'service-user-row' : 'carer-row'
  const leftColumnLabel = byServiceUser ? 'Service user' : 'Carer'
  const { preferences: runDisplayPreferences } = useScheduleRunsDisplayPreferences()
  const locationNameMap = locationNames ?? new Map<string, string>()
  const [focusedPeriodBandId, setFocusedPeriodBandId] = React.useState<string | null>(null)
  const [scrollClientWidth, setScrollClientWidth] = React.useState(0)
  const focusedTimelineGridWidth = React.useMemo(() => {
    if (!focusedPeriodBandId || scrollClientWidth <= 0) return undefined
    return Math.max(0, scrollClientWidth - SCHEDULE_JOBS_CARER_COL_WIDTH)
  }, [focusedPeriodBandId, scrollClientWidth])
  const viewport = React.useMemo(
    () => resolveScheduleJobsTimelineViewport(focusedPeriodBandId, focusedTimelineGridWidth),
    [focusedPeriodBandId, focusedTimelineGridWidth],
  )
  const boardMinWidth = React.useMemo(
    () => scheduleJobsBoardMinWidth(viewport, scrollClientWidth),
    [scrollClientWidth, viewport],
  )

  const handlePeriodBandDoubleClick = React.useCallback((bandId: string) => {
    setFocusedPeriodBandId(bandId)
  }, [])

  const handleClearPeriodFocus = React.useCallback(() => {
    setFocusedPeriodBandId(null)
  }, [])

  const drag = useScheduleJobsDrag({
    date,
    viewport,
    rowAxis,
    onJobDrop,
  })

  const jobsById = React.useMemo(() => {
    const map = new Map<string, TimelineJob>()
    if (byServiceUser) {
      for (const row of serviceUserRows) {
        for (const job of row.jobs) map.set(job.id, job)
      }
      return map
    }
    for (const job of unassignedJobs) map.set(job.id, job)
    for (const job of cancelledJobs) map.set(job.id, job)
    for (const row of employeeRows) {
      for (const allocation of row.allocations) {
        map.set(allocation.job.id, allocation.job)
      }
    }
    return map
  }, [byServiceUser, employeeRows, serviceUserRows, unassignedJobs, cancelledJobs])

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
  const [rowSearch, setRowSearch] = React.useState('')
  const rowSearchPlaceholder = byServiceUser ? 'Search service users…' : 'Search carers…'

  const filteredEmployeeRows = React.useMemo(
    () => filterScheduleJobsEmployeeRows(employeeRows, rowSearch, duplicateNameIds),
    [duplicateNameIds, employeeRows, rowSearch],
  )
  const filteredServiceUserRows = React.useMemo(
    () => filterScheduleJobsServiceUserRows(serviceUserRows, rowSearch),
    [rowSearch, serviceUserRows],
  )

  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const updateWidth = () => setScrollClientWidth(el.clientWidth)
    updateWidth()

    const observer = new ResizeObserver(updateWidth)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    setRowSearch('')
    setFocusedPeriodBandId(null)
  }, [date, rowAxis])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = focusedPeriodBandId ? 0 : 7 * SCHEDULE_JOBS_HOUR_WIDTH
  }, [date, focusedPeriodBandId, viewport.trackWidth])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !focusedPeriodBandId) return
      event.preventDefault()
      setFocusedPeriodBandId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focusedPeriodBandId])

  return (
    <TooltipProvider delayDuration={200} disableHoverableContent={false}>
      <ScheduleJobsDragOverlay />
      <ScheduleJobsMarqueeOverlay rect={marquee.marqueeRect} />
      <div
        data-schedule-jobs-board
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      >
        <div data-schedule-jobs-legend>
          <ScheduleJobsLegend
            focusedPeriodBandId={focusedPeriodBandId}
            onPeriodBandDoubleClick={handlePeriodBandDoubleClick}
            onClearPeriodFocus={handleClearPeriodFocus}
          />
          {showRunsOnBoard ? (
            <ScheduleJobsRunLegend runs={runs} onReassignRun={onReassignRun} />
          ) : null}
        </div>
        <div ref={scrollRef} data-schedule-jobs-scroll className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
          <div style={{ width: boardMinWidth, minWidth: boardMinWidth }}>
            <ScheduleJobsTimelineHeader
              leftColumnLabel={leftColumnLabel}
              rowSearch={rowSearch}
              onRowSearchChange={setRowSearch}
              rowSearchPlaceholder={rowSearchPlaceholder}
              viewport={viewport}
              focusedPeriodBandId={focusedPeriodBandId}
              onPeriodBandDoubleClick={handlePeriodBandDoubleClick}
              onClearPeriodFocus={handleClearPeriodFocus}
              boardMinWidth={boardMinWidth}
            />

            {byServiceUser ? (
              <>
                {filteredServiceUserRows.map((row, index) => {
                  const label = serviceUserLabel(row.serviceUser)
                  const rowKey = scheduleJobsRowKey({
                    kind: 'service-user',
                    serviceUserId: row.serviceUser.id,
                  })
                  return (
                    <GanttRow
                      key={row.serviceUser.id}
                      rowKey={rowKey}
                      sourceRow={{ kind: 'service-user', serviceUserId: row.serviceUser.id }}
                      label={label}
                      subtitle={serviceUserRowSubtitle(row.serviceUser, row.jobs.length)}
                      avatarInitials={serviceUserBriefInitials(row.serviceUser)}
                      jobs={row.jobs}
                      date={date}
                      isDropTarget={drag.hoverRowKey === rowKey}
                      savingJobId={savingJobId}
                      draggingJobId={drag.draggingJobId}
                      alignJobsTop
                      excessContractedJobIds={excessContractedJobIds}
                      outsidePatternJobIds={outsidePatternJobIds}
                      overAllocatedJobIds={overAllocatedJobIds}
                      visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
                      acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
                      travelBufferMinutes={travelBufferMinutes}
                      previewJobIds={marquee.previewJobIds}
                      runDisplayPreferences={runDisplayPreferences}
                      jobLabelMode={jobLabelMode}
                      showRunsOnBoard={showRunsOnBoard}
                      viewport={viewport}
                      boardMinWidth={boardMinWidth}
                      zebra={index % 2 === 1}
                      onPointerDown={drag.startDrag}
                      onJobClick={onJobClick}
                      onJobAction={onJobAction}
                      onOpenRun={onOpenRun}
                      shouldIgnoreClick={drag.shouldIgnoreClick}
                      labelHoverCard={
                        <ScheduleServiceUserHoverCard
                          serviceUser={row.serviceUser}
                          jobCount={row.jobs.length}
                        />
                      }
                    />
                  )
                })}

                {normalizeScheduleJobsRowSearchQuery(rowSearch) &&
                serviceUserRows.length > 0 &&
                filteredServiceUserRows.length === 0 ? (
                  <div className="border-b border-border/70 px-4 py-6 text-center text-xs text-muted-foreground">
                    No service users match &ldquo;{rowSearch.trim()}&rdquo;.
                  </div>
                ) : null}

                {serviceUserRows.length === 0 ? (
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
              </>
            ) : (
              <>
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
              outsidePatternJobIds={outsidePatternJobIds}
              overAllocatedJobIds={overAllocatedJobIds}
              visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
              acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
              travelBufferMinutes={travelBufferMinutes}
              previewJobIds={marquee.previewJobIds}
              runDisplayPreferences={runDisplayPreferences}
              jobLabelMode={jobLabelMode}
              showRunsOnBoard={showRunsOnBoard}
              viewport={viewport}
              boardMinWidth={boardMinWidth}
              trackClassName="bg-amber-50/30 dark:bg-amber-950/10"
            />

            <GanttRow
              rowKey="cancelled"
              sourceRow={{ kind: 'cancelled' }}
              label="Cancelled visits"
              subtitle={
                cancelledJobs.length > 0
                  ? `${cancelledJobs.length} cancelled or called-off visit${cancelledJobs.length === 1 ? '' : 's'}`
                  : 'No cancelled visits on this day'
              }
              muted
              cancelled
              jobs={cancelledJobs}
              date={date}
              isDropTarget={false}
              savingJobId={savingJobId}
              draggingJobId={drag.draggingJobId}
              onPointerDown={drag.startDrag}
              onJobClick={onJobClick}
              onJobAction={onJobAction}
              onOpenRun={onOpenRun}
              shouldIgnoreClick={drag.shouldIgnoreClick}
              alignJobsTop
              excessContractedJobIds={excessContractedJobIds}
              outsidePatternJobIds={outsidePatternJobIds}
              overAllocatedJobIds={overAllocatedJobIds}
              visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
              acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
              travelBufferMinutes={travelBufferMinutes}
              previewJobIds={marquee.previewJobIds}
              runDisplayPreferences={runDisplayPreferences}
              jobLabelMode={jobLabelMode}
              showRunsOnBoard={showRunsOnBoard}
              viewport={viewport}
              boardMinWidth={boardMinWidth}
              trackClassName="bg-slate-50/40 dark:bg-slate-950/15"
            />

            {filteredEmployeeRows.map((row, index) => {
              const display = employeeBriefDisplayName(row.employee)
              const full = employeeBriefFullName(row.employee)
              const { label, subtitle } = employeeBriefRowLabel(
                row.employee,
                duplicateNameIds.has(row.employee.id),
              )
              const rowKey = scheduleJobsRowKey({ kind: 'carer', employeeId: row.employee.id })
              const hasJobs = row.allocations.length > 0
              const availabilityBadge = resolveCarerDayAvailabilityBadge(row.dayPattern, row.onHoliday)
              const showRoleSubtitle = !row.onHoliday && !availabilityBadge
              return (
                <GanttRow
                  key={row.employee.id}
                  rowKey={rowKey}
                  sourceRow={{ kind: 'carer', employeeId: row.employee.id }}
                  label={label}
                  fullName={full !== display ? full : undefined}
                  subtitle={showRoleSubtitle ? subtitle : undefined}
                  avatarInitials={employeeBriefInitials(row.employee)}
                  showCar={!row.employee.isAgencyStaff}
                  jobs={row.allocations.map((allocation) => allocation.job)}
                  date={date}
                  isDropTarget={drag.hoverRowKey === rowKey}
                  savingJobId={savingJobId}
                  draggingJobId={drag.draggingJobId}
                  dayPattern={row.dayPattern}
                  showCarerAvailability
                  onHoliday={row.onHoliday}
                  holidayEndDate={row.holidayEndDate}
                  excessContractedJobIds={excessContractedJobIds}
                  outsidePatternJobIds={outsidePatternJobIds}
                  overAllocatedJobIds={overAllocatedJobIds}
                  visitPlanSlotsByServiceUser={visitPlanSlotsByServiceUser}
                  acceptedCarePlansByServiceUser={acceptedCarePlansByServiceUser}
                  travelBufferMinutes={travelBufferMinutes}
                  previewJobIds={marquee.previewJobIds}
                  runDisplayPreferences={runDisplayPreferences}
                  jobLabelMode={jobLabelMode}
                  showRunsOnBoard={showRunsOnBoard}
                  viewport={viewport}
                  boardMinWidth={boardMinWidth}
                  zebra={index % 2 === 1}
                  onPointerDown={drag.startDrag}
                  onJobClick={onJobClick}
                  onJobAction={onJobAction}
                  onOpenRun={onOpenRun}
                  shouldIgnoreClick={drag.shouldIgnoreClick}
                  trackClassName={
                    row.onHoliday
                      ? 'bg-orange-100/25 dark:bg-orange-950/20'
                      : availabilityBadge?.kind === 'not-available'
                        ? 'bg-slate-200/30 dark:bg-slate-900/35'
                        : availabilityBadge?.kind === 'partial'
                          ? 'bg-amber-100/30 dark:bg-amber-950/20'
                          : hasJobs
                            ? undefined
                            : 'bg-sky-50/35 dark:bg-sky-950/10'
                  }
                  labelHoverCard={
                    <ScheduleCarerHoverCard
                      row={row}
                      catalog={employeeCatalogById?.get(row.employee.id)}
                      locationNames={locationNameMap}
                    />
                  }
                />
              )
            })}

            {normalizeScheduleJobsRowSearchQuery(rowSearch) &&
            employeeRows.length > 0 &&
            filteredEmployeeRows.length === 0 ? (
              <div className="border-b border-border/70 px-4 py-6 text-center text-xs text-muted-foreground">
                No carers match &ldquo;{rowSearch.trim()}&rdquo;.
              </div>
            ) : null}

            {employeeRows.length === 0 && unassignedJobs.length === 0 && cancelledJobs.length === 0 ? (
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
              </>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
