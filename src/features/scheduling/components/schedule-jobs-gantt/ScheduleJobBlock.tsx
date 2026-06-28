import * as React from 'react'
import {
  AlertTriangle,
  BedDouble,
  CalendarClock,
  Car,
  Clock,
} from 'lucide-react'
import { ScheduleJobRequiredCarersIcon } from '@/features/scheduling/components/ScheduleJobRequiredCarersIcon'
import { ScheduleJobContextMenu } from '@/features/scheduling/components/ScheduleJobContextMenu'
import { ScheduleJobHoverTooltip } from '@/features/scheduling/components/ScheduleJobHoverCard'
import { useScheduleJobsDisplayFormat } from '@/features/scheduling/context/schedule-jobs-display-format.context'
import type { ScheduleJobContextAction } from '@/features/scheduling/types/schedule-job-context-actions.types'
import {
  isScheduleJobCancelled,
  isScheduleJobCompleted,
  isScheduleJobReadOnly,
} from '@/features/scheduling/types/schedule-job-context-actions.types'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { TimeCriticalDot } from '@/features/service-users/visit-plan/TimeCriticalDot'
import type { ScheduleJobsRowRef } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import {
  scheduleJobBlockDisplayLabel,
  scheduleJobBlockLabelLines,
} from '@/features/scheduling/utils/schedule-jobs-board-axis.util'
import type { JobOverlapLayout } from '@/features/scheduling/utils/schedule-jobs-overlap-lanes.util'
import {
  resolveScheduleJobsJobLaneHeight,
  scheduleJobLaneTopPx,
} from '@/features/scheduling/utils/schedule-jobs-overlap-lanes.util'
import {
  scheduleRunAccentColor,
  scheduleRunJobLabel,
} from '@/features/scheduling/utils/schedule-run-board.util'
import { resolveJobTimeCritical } from '@/features/scheduling/utils/schedule-job-time-critical.util'
import {
  JOB_BLOCK_TONE_CLASSES,
  jobBlockCancelledSurfaceStyle,
  jobBlockCompletedSurfaceStyle,
  jobBlockTone,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { jobBlockLayoutPxInViewport } from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'
import type { ScheduleJobsTimelineViewport } from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'
import type { ScheduleRunsDisplayPreferences } from '@/features/scheduling/utils/schedule-runs-display-preferences.util'
import { cn } from '@/shared/lib/utils'
import { scheduleJobBlockHasVisibleIcons, scheduleJobsRowRefKey } from '@/features/scheduling/components/schedule-jobs-gantt/schedule-jobs-gantt.util'

type ScheduleJobBlockIconsProps = {
  job: TimelineJob
  overlapLayout?: JobOverlapLayout
  stackedLanes: boolean
  showRequiredCarersIcon: boolean
  showTravelIcon: boolean
  showOperationalBadges: boolean
  outsidePattern?: boolean
}

function ScheduleJobBlockIcons({
  job,
  overlapLayout,
  stackedLanes,
  showRequiredCarersIcon,
  showTravelIcon,
  showOperationalBadges,
  outsidePattern,
}: ScheduleJobBlockIconsProps) {
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

export type ScheduleJobBlockProps = {
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
  travelConflictFromPrevious?: boolean
  rowJobs?: TimelineJob[]
  showRowTravelDetails?: boolean
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
}

function scheduleJobBlockPropsEqual(
  prev: ScheduleJobBlockProps,
  next: ScheduleJobBlockProps,
): boolean {
  if (prev.job.id !== next.job.id) return false
  if (prev.date !== next.date) return false
  if (scheduleJobsRowRefKey(prev.sourceRow) !== scheduleJobsRowRefKey(next.sourceRow)) return false
  if (prev.saving !== next.saving) return false
  if (prev.isDragging !== next.isDragging) return false
  if (prev.alignTop !== next.alignTop) return false
  if (prev.showBookedTooltip !== next.showBookedTooltip) return false
  if (prev.excessContracted !== next.excessContracted) return false
  if (prev.outsidePattern !== next.outsidePattern) return false
  if (prev.overAllocated !== next.overAllocated) return false
  if (prev.travelBufferMinutes !== next.travelBufferMinutes) return false
  if (prev.travelConflictFromPrevious !== next.travelConflictFromPrevious) return false
  if (prev.showRowTravelDetails !== next.showRowTravelDetails) return false
  if (prev.isMarqueeSelected !== next.isMarqueeSelected) return false
  if (prev.jobLabelMode !== next.jobLabelMode) return false
  if (prev.showRunsOnBoard !== next.showRunsOnBoard) return false
  if (prev.viewport !== next.viewport) return false
  if (prev.overlapLayout !== next.overlapLayout) return false
  if (prev.runDisplayPreferences !== next.runDisplayPreferences) return false
  if (prev.rowJobs !== next.rowJobs) return false
  if (prev.visitPlanSlotsByServiceUser !== next.visitPlanSlotsByServiceUser) return false
  if (prev.acceptedCarePlansByServiceUser !== next.acceptedCarePlansByServiceUser) return false
  if (prev.onPointerDown !== next.onPointerDown) return false
  if (prev.onClick !== next.onClick) return false
  if (prev.onJobAction !== next.onJobAction) return false
  if (prev.onOpenRun !== next.onOpenRun) return false
  if (prev.shouldIgnoreClick !== next.shouldIgnoreClick) return false
  return true
}

export const ScheduleJobBlock = React.memo(function ScheduleJobBlock({
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
  travelConflictFromPrevious,
  rowJobs,
  showRowTravelDetails = true,
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
}: ScheduleJobBlockProps) {
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
        'absolute z-[3] flex select-none flex-col overflow-hidden rounded-md border text-left text-xs font-medium leading-snug antialiased transition-shadow',
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
        travelConflictFromPrevious && !completed && !cancelled && 'ring-2 ring-orange-500/80 border-orange-600',
        saving && 'animate-pulse opacity-60',
      )}
      style={{
        left: leftPx,
        width: widthPx,
        ...(stackedLanes && overlapLayout
          ? {
              top: scheduleJobLaneTopPx(overlapLayout.lane, jobLaneHeight),
              zIndex: overlapLayout.lane + 3,
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
          : travelConflictFromPrevious
            ? `${formatJobTimeRange(job)} · Not enough travel time from the previous visit — hover for details · click to manage`
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
          showRowTravelDetails={showRowTravelDetails}
          excessContracted={excessContracted}
          outsidePattern={outsidePattern}
          overAllocated={overAllocated}
          isUnassignedRow={sourceRow.kind === 'unassigned'}
        />
      }
    >
      {block}
    </ScheduleJobContextMenu>
  )
}, scheduleJobBlockPropsEqual)
