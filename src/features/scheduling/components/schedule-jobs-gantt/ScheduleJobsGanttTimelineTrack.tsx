import * as React from 'react'
import { ScheduleCarerAvailabilityOverlay } from '@/features/scheduling/components/ScheduleCarerAvailabilityOverlay'
import { ScheduleJobRotaGapSegments } from '@/features/scheduling/components/ScheduleJobRotaGapSegments'
import { ScheduleJobTravelConnectors } from '@/features/scheduling/components/ScheduleJobTravelConnectors'
import { ScheduleJobBlock } from '@/features/scheduling/components/schedule-jobs-gantt/ScheduleJobBlock'
import { scheduleJobsRowShowsTravelConnectors } from '@/features/scheduling/components/schedule-jobs-gantt/schedule-jobs-gantt.util'
import type { ScheduleJobContextAction } from '@/features/scheduling/types/schedule-job-context-actions.types'
import type { EmployeeDayPattern, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { buildCarerRowRotaGapSegments, type RotaGapDisplayMode } from '@/features/scheduling/utils/schedule-job-rota-gap.util'
import { buildScheduleJobTravelConnectors } from '@/features/scheduling/utils/schedule-job-travel-connector.util'
import {
  sortJobsByStartTime,
  travelConflictFromPreviousJobIds,
  type GeoCoordinates,
} from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import { buildCarerAvailabilitySegments } from '@/features/scheduling/utils/schedule-jobs-availability.util'
import type { ScheduleJobsRowRef } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import type { JobOverlapLayout } from '@/features/scheduling/utils/schedule-jobs-overlap-lanes.util'
import { scheduleJobsPeriodHourCellClass } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import {
  jobOverlapsViewport,
  scheduleJobsPeriodBandForViewportHour,
  type ScheduleJobsTimelineViewport,
} from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'
import type { ScheduleRunsDisplayPreferences } from '@/features/scheduling/utils/schedule-runs-display-preferences.util'
import type { LiveOfficeAlert } from '@/features/scheduling/utils/schedule-job-live-office-alerts.util'
import { cn } from '@/shared/lib/utils'

export type ScheduleJobsGanttTimelineTrackProps = {
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
  liveAlertsByJobId?: Map<string, LiveOfficeAlert[]>
  previewJobIds?: Set<string>
  runDisplayPreferences?: ScheduleRunsDisplayPreferences
  overlapByJobId?: Map<string, JobOverlapLayout>
  jobLaneHeight: number
  rowHeightPx: number
  jobLabelMode?: 'carer-row' | 'service-user-row'
  showRunsOnBoard?: boolean
  rotaGapDisplay?: RotaGapDisplayMode
  carerCoordinates?: GeoCoordinates | null
  viewport: ScheduleJobsTimelineViewport
  onPointerDown: (job: TimelineJob, sourceRow: ScheduleJobsRowRef, event: React.PointerEvent) => void
  onJobClick: (job: TimelineJob) => void
  onJobAction: (job: TimelineJob, action: ScheduleJobContextAction) => void
  onOpenRun?: (runId: string) => void
  shouldIgnoreClick?: () => boolean
  className?: string
}

export const ScheduleJobsGanttTimelineTrack = React.memo(function ScheduleJobsGanttTimelineTrack({
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
  liveAlertsByJobId,
  previewJobIds,
  runDisplayPreferences,
  overlapByJobId,
  jobLaneHeight,
  rowHeightPx,
  jobLabelMode,
  showRunsOnBoard = false,
  rotaGapDisplay = 'both',
  carerCoordinates,
  viewport,
  onPointerDown,
  onJobClick,
  onJobAction,
  onOpenRun,
  shouldIgnoreClick,
  className,
}: ScheduleJobsGanttTimelineTrackProps) {
  const showRowTravelDetails = sourceRow.kind === 'carer'
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
        ? travelConflictFromPreviousJobIds(jobs, travelBufferMinutes ?? 0)
        : new Set<string>(),
    [jobs, travelBufferMinutes, showCarerAvailability],
  )
  const rotaGapSegments = React.useMemo(
    () =>
      sourceRow.kind === 'carer' && rotaGapDisplay !== 'none'
        ? buildCarerRowRotaGapSegments({
            jobs,
            dayPattern,
            carerCoordinates,
            displayMode: rotaGapDisplay,
            bufferMinutes: travelBufferMinutes,
          })
        : [],
    [sourceRow.kind, rotaGapDisplay, jobs, dayPattern, carerCoordinates, travelBufferMinutes],
  )
  const orderedVisibleJobs = React.useMemo(
    () => sortJobsByStartTime(visibleJobs),
    [visibleJobs],
  )
  const travelConnectors = React.useMemo(
    () =>
      scheduleJobsRowShowsTravelConnectors(sourceRow, rotaGapDisplay)
        ? buildScheduleJobTravelConnectors(jobs, viewport, {
            overlapByJobId,
            jobLaneHeight,
            rowHeightPx,
            travelBufferMinutes,
          })
        : [],
    [jobs, viewport, overlapByJobId, jobLaneHeight, rowHeightPx, travelBufferMinutes, sourceRow, rotaGapDisplay],
  )
  const overlapLaneCount = React.useMemo(() => {
    if (!overlapByJobId?.size) return 1
    return Math.max(1, ...Array.from(overlapByJobId.values(), (layout) => layout.laneCount))
  }, [overlapByJobId])

  return (
    <div
      data-schedule-timeline-track
      data-schedule-row-track={rowKey}
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
      {rotaGapSegments.length > 0 ? (
        <ScheduleJobRotaGapSegments
          segments={rotaGapSegments}
          viewport={viewport}
          rowHeightPx={rowHeightPx}
          jobLaneHeight={jobLaneHeight}
          overlapLaneCount={overlapLaneCount}
        />
      ) : null}
      {orderedVisibleJobs.map((job) => (
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
          liveAlerts={liveAlertsByJobId?.get(job.id)}
          travelConflictFromPrevious={travelConflictJobIdSet.has(job.id)}
          rowJobs={jobs}
          showRowTravelDetails={showRowTravelDetails}
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
})
