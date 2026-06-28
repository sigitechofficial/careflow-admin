import type { ScheduleJobsRowRef } from '@/features/scheduling/utils/schedule-jobs-drag.util'
import type { JobOverlapLayout } from '@/features/scheduling/utils/schedule-jobs-overlap-lanes.util'
import type { RotaGapDisplayMode } from '@/features/scheduling/utils/schedule-job-rota-gap.util'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import {
  SCHEDULE_JOBS_CARER_COL_WIDTH,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import type { ScheduleJobsTimelineViewport } from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'

export function scheduleJobsRowRefKey(row: ScheduleJobsRowRef): string {
  switch (row.kind) {
    case 'carer':
      return `carer:${row.employeeId}`
    case 'service-user':
      return `service-user:${row.serviceUserId}`
    case 'unassigned':
      return 'unassigned'
    case 'cancelled':
      return 'cancelled'
  }
}

export const SCHEDULE_JOBS_GANTT_PERIOD_ICONS: Record<string, string> = {
  night: '🌙',
  morning: '🌅',
  midday: '☀️',
  afternoon: '🌤️',
  evening: '🌆',
}

export function scheduleJobsBoardMinWidth(
  viewport: ScheduleJobsTimelineViewport,
  scrollClientWidth?: number,
): number {
  if (viewport.mode === 'focused-period' && scrollClientWidth != null && scrollClientWidth > 0) {
    return scrollClientWidth
  }
  return SCHEDULE_JOBS_CARER_COL_WIDTH + viewport.trackWidth
}

export function scheduleJobsRowShowsTravelConnectors(
  sourceRow: ScheduleJobsRowRef,
  rotaGapDisplay: RotaGapDisplayMode,
): boolean {
  if (sourceRow.kind === 'unassigned') return false
  if (sourceRow.kind !== 'carer') return false
  return rotaGapDisplay === 'none'
}

export function scheduleJobBlockHasVisibleIcons(
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
