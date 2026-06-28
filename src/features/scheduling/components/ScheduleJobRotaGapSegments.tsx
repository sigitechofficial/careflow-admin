import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { ScheduleRotaGapHoverTooltip } from '@/features/scheduling/components/ScheduleJobHoverCard'
import type { RotaGapSegment } from '@/features/scheduling/utils/schedule-job-rota-gap.util'
import { segmentPositionPxInViewport } from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'
import type { ScheduleJobsTimelineViewport } from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'
import {
  SCHEDULE_JOB_TRAVEL_LABEL_BLOCK_HEIGHT_PX,
  SCHEDULE_JOB_TRAVEL_LABEL_BLOCK_TOP_PX,
} from '@/features/scheduling/utils/schedule-job-travel-connector.util'
import { scheduleJobLaneTopPx } from '@/features/scheduling/utils/schedule-jobs-overlap-lanes.util'
import { SCHEDULE_JOBS_JOB_LANE_HEIGHT } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

/** Minimum painted width so idle/travel labels stay readable when the timeline slot is narrow. */
export const SCHEDULE_ROTA_GAP_MIN_READABLE_WIDTH_PX = 96

/** Right-align expanded gap blocks to the destination visit (next job), without painting over earlier jobs. */
export function resolveReadableRotaGapBlockLayout(position: {
  leftPx: number
  widthPx: number
}): { leftPx: number; widthPx: number; expanded: boolean } {
  const naturalLeft = position.leftPx
  const naturalWidth = position.widthPx
  if (naturalWidth >= SCHEDULE_ROTA_GAP_MIN_READABLE_WIDTH_PX) {
    return { leftPx: naturalLeft, widthPx: naturalWidth, expanded: false }
  }

  const desiredWidth = SCHEDULE_ROTA_GAP_MIN_READABLE_WIDTH_PX
  const expandedLeft = Math.max(0, naturalLeft + naturalWidth - desiredWidth)
  if (expandedLeft < naturalLeft) {
    return { leftPx: naturalLeft, widthPx: naturalWidth, expanded: false }
  }

  return {
    leftPx: expandedLeft,
    widthPx: desiredWidth,
    expanded: true,
  }
}

type Props = {
  segments: RotaGapSegment[]
  viewport: ScheduleJobsTimelineViewport
  rowHeightPx: number
  jobLaneHeight?: number
  overlapLaneCount?: number
}

/** Match ScheduleJobBlock carer-row layout: `top-0.5 h-11`, or stacked lane height. */
function resolveSegmentBlockLayout(options: {
  rowHeightPx: number
  jobLaneHeight?: number
  overlapLaneCount?: number
}): { topPx: number; heightPx: number } {
  const stacked = (options.overlapLaneCount ?? 1) > 1
  const laneHeight = options.jobLaneHeight ?? SCHEDULE_JOBS_JOB_LANE_HEIGHT

  if (stacked) {
    return {
      topPx: scheduleJobLaneTopPx(0, laneHeight),
      heightPx: laneHeight,
    }
  }

  return {
    topPx: SCHEDULE_JOB_TRAVEL_LABEL_BLOCK_TOP_PX,
    heightPx: SCHEDULE_JOB_TRAVEL_LABEL_BLOCK_HEIGHT_PX,
  }
}

function RotaGapBlockContent({
  segment,
  displayWidthPx,
  isIdle,
}: {
  segment: RotaGapSegment
  displayWidthPx: number
  isIdle: boolean
}) {
  const showTimeRange = displayWidthPx >= 56
  const showDuration = true

  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-center leading-tight">
      {showTimeRange ? (
        <span
          className={cn(
            'max-w-full whitespace-nowrap text-[10px] font-medium tabular-nums tracking-tight',
            isIdle ? 'text-emerald-800/85 dark:text-emerald-100/90' : 'text-white/90',
          )}
        >
          {segment.timeRangeLabel}
        </span>
      ) : null}
      {showDuration ? (
        <span
          className={cn(
            'max-w-full whitespace-nowrap text-[11px] font-bold tabular-nums',
            isIdle ? 'text-emerald-950 dark:text-emerald-50' : 'text-white',
          )}
        >
          {segment.durationLabel}
        </span>
      ) : null}
    </div>
  )
}

export function ScheduleJobRotaGapSegments({
  segments,
  viewport,
  rowHeightPx,
  jobLaneHeight,
  overlapLaneCount,
}: Props) {
  if (segments.length === 0) return null

  const { topPx, heightPx } = resolveSegmentBlockLayout({ rowHeightPx, jobLaneHeight, overlapLaneCount })

  return (
    <div
      className="pointer-events-none absolute inset-y-0 left-0 z-[1] overflow-visible"
      style={{ width: viewport.gridWidth, height: rowHeightPx }}
      aria-hidden={segments.every((segment) => segment.endMin - segment.startMin < 3)}
    >
      {segments.map((segment) => {
        const position = segmentPositionPxInViewport(segment, viewport)
        if (!position || position.widthPx < 2) return null

        const layout = resolveReadableRotaGapBlockLayout(position)
        const isIdle = segment.kind === 'idle'
        const travelTiming =
          segment.kind === 'travel'
            ? segment.travelTimingStatus ?? (segment.hasConflict ? 'conflict' : 'ok')
            : null

        return (
          <Tooltip key={segment.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'pointer-events-auto absolute flex items-center justify-center overflow-visible rounded-md border shadow-sm',
                  layout.expanded && 'ring-1 ring-background/80',
                  isIdle &&
                    'border-emerald-600/35 bg-emerald-50/90 dark:border-emerald-700/40 dark:bg-emerald-950/50',
                  travelTiming === 'ok' &&
                    'border-sky-700/50 bg-sky-600/90 dark:border-sky-500/50 dark:bg-sky-500/90',
                  travelTiming === 'tight' &&
                    'border-amber-500/60 bg-amber-500/90 dark:border-amber-500/70 dark:bg-amber-600/90',
                  travelTiming === 'conflict' &&
                    'border-orange-500/60 bg-orange-500/90 dark:border-orange-500/70 dark:bg-orange-600/90',
                )}
                style={{
                  left: layout.leftPx,
                  width: layout.widthPx,
                  top: topPx,
                  height: heightPx,
                  backgroundImage: isIdle
                    ? 'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(16,185,129,0.08) 4px, rgba(16,185,129,0.08) 8px)'
                    : undefined,
                }}
                aria-label={`${isIdle ? 'Idle' : 'Travel'} ${segment.timeRangeLabel}, ${segment.durationLabel}`}
              >
                <RotaGapBlockContent
                  segment={segment}
                  displayWidthPx={layout.widthPx}
                  isIdle={isIdle}
                />
              </div>
            </TooltipTrigger>
            {isIdle ? (
              <TooltipContent side="top" className="max-w-xs rounded-xl px-4 py-3 text-xs ring-1 ring-black/5 dark:ring-white/10">
                <p className="font-semibold">Idle time</p>
                <p className="tabular-nums text-foreground">{segment.timeRangeLabel}</p>
                <p className="font-medium tabular-nums text-foreground">{segment.durationLabel}</p>
                <p className="text-muted-foreground">{segment.title}</p>
              </TooltipContent>
            ) : (
              <ScheduleRotaGapHoverTooltip
                timeRangeLabel={segment.timeRangeLabel}
                durationLabel={segment.durationLabel}
                title={segment.title}
              />
            )}
          </Tooltip>
        )
      })}
    </div>
  )
}
