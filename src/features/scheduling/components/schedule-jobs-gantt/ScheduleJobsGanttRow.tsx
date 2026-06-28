import * as React from 'react'
import { ScheduleJobsGanttCarerLabel } from '@/features/scheduling/components/schedule-jobs-gantt/ScheduleJobsGanttCarerLabel'
import { ScheduleJobsGanttTimelineTrack } from '@/features/scheduling/components/schedule-jobs-gantt/ScheduleJobsGanttTimelineTrack'
import type { ScheduleJobContextAction } from '@/features/scheduling/types/schedule-job-context-actions.types'
import type { EmployeeDayPattern, TimelineJob } from '@/features/scheduling/types/scheduling.types'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import type { RotaGapDisplayMode } from '@/features/scheduling/utils/schedule-job-rota-gap.util'
import type { GeoCoordinates } from '@/features/scheduling/utils/schedule-job-travel-distance.util'
import type { ScheduleJobsRowRef } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import { resolveCarerDayAvailabilityBadge } from '@/features/scheduling/utils/schedule-jobs-availability.util'
import {
  computeScheduleJobOverlapLayout,
  type JobOverlapLayout,
} from '@/features/scheduling/utils/schedule-jobs-overlap-lanes.util'
import {
  SCHEDULE_JOBS_JOB_LANE_HEIGHT_RUNS_BOARD,
  SCHEDULE_JOBS_ROW_HEIGHT,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { jobOverlapsViewport, type ScheduleJobsTimelineViewport } from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'
import type { ScheduleRunsDisplayPreferences } from '@/features/scheduling/utils/schedule-runs-display-preferences.util'
import { cn } from '@/shared/lib/utils'

export type ScheduleJobsGanttRowProps = {
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
  rotaGapDisplay?: RotaGapDisplayMode
  carerCoordinates?: GeoCoordinates | null
  viewport: ScheduleJobsTimelineViewport
  boardMinWidth: number
  onPointerDown: (job: TimelineJob, sourceRow: ScheduleJobsRowRef, event: React.PointerEvent) => void
  onJobClick: (job: TimelineJob) => void
  onJobAction: (job: TimelineJob, action: ScheduleJobContextAction) => void
  onOpenRun?: (runId: string) => void
  shouldIgnoreClick?: () => boolean
  trackClassName?: string
  labelHoverCard?: React.ReactNode
}

export const ScheduleJobsGanttRow = React.memo(function ScheduleJobsGanttRow({
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
  rotaGapDisplay = 'both',
  carerCoordinates,
  viewport,
  boardMinWidth,
  onPointerDown,
  onJobClick,
  onJobAction,
  onOpenRun,
  shouldIgnoreClick,
  trackClassName,
  labelHoverCard,
}: ScheduleJobsGanttRowProps) {
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
        'data-[schedule-drop-target]:bg-primary/5 data-[schedule-drop-target]:ring-1 data-[schedule-drop-target]:ring-inset data-[schedule-drop-target]:ring-primary/30',
      )}
      style={{
        height: overlapLayout.rowHeightPx,
        minHeight: SCHEDULE_JOBS_ROW_HEIGHT,
        width: boardMinWidth,
        minWidth: boardMinWidth,
      }}
    >
      <div className="sticky left-0 z-10 flex shrink-0 self-stretch bg-card/95 backdrop-blur-sm">
        <ScheduleJobsGanttCarerLabel
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
      <ScheduleJobsGanttTimelineTrack
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
        rotaGapDisplay={rotaGapDisplay}
        carerCoordinates={carerCoordinates}
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
