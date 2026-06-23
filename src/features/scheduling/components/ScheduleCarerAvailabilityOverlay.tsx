import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import {
  formatAvailabilitySegmentLabel,
  segmentPositionPx,
  type CarerAvailabilitySegment,
} from '@/features/scheduling/utils/schedule-jobs-availability.util'
import {
  segmentPositionPxInViewport,
  type ScheduleJobsTimelineViewport,
} from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'
import { SCHEDULE_JOBS_DAY_START_HOUR } from '@/features/scheduling/utils/schedule-jobs-timeline.util'

type Props = {
  segments: CarerAvailabilitySegment[]
  showAvailabilityLines?: boolean
  viewport?: ScheduleJobsTimelineViewport
}

function resolveSegmentPositionPx(
  segment: CarerAvailabilitySegment,
  viewport?: ScheduleJobsTimelineViewport,
): { leftPx: number; widthPx: number } | null {
  if (viewport) {
    return segmentPositionPxInViewport(segment, viewport)
  }
  return segmentPositionPx(segment)
}

function AvailabilityTooltipCard({
  title,
  timeRange,
  tone,
}: {
  title: string
  timeRange: string
  tone: 'available' | 'booked' | 'possibly-available' | 'unavailable'
}) {
  const headerClass =
    tone === 'available'
      ? 'text-[#2d7a32]'
      : tone === 'booked'
        ? 'text-red-600'
        : tone === 'possibly-available'
          ? 'text-[#c47a1a]'
          : 'text-slate-600'

  return (
    <div className="w-[240px] rounded-md border border-border bg-popover shadow-lg">
      <div className={cn('border-b border-border px-3 py-2 text-center text-sm font-semibold', headerClass)}>
        {title}
      </div>
      <div className="px-3 py-2.5 text-xs font-medium text-foreground">{timeRange}</div>
    </div>
  )
}

function AvailabilityLine({ colorClass, zClass }: { colorClass: string; zClass?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-[3px] left-0 right-0 h-[3px] rounded-full',
        zClass,
        colorClass,
      )}
    />
  )
}

function SegmentLine({
  segment,
  colorClass,
  tone,
  zClass,
  viewport,
}: {
  segment: CarerAvailabilitySegment
  colorClass: string
  tone: 'available' | 'booked' | 'possibly-available' | 'unavailable'
  zClass?: string
  viewport?: ScheduleJobsTimelineViewport
}) {
  const position = resolveSegmentPositionPx(segment, viewport)
  if (!position) return null
  const { leftPx, widthPx } = position
  const { title, timeRange } = formatAvailabilitySegmentLabel(segment, SCHEDULE_JOBS_DAY_START_HOUR)
  const key = `${segment.kind}-${segment.startMin}-${segment.endMin}`

  return (
    <Tooltip key={key}>
      <TooltipTrigger asChild>
        <div
          className="absolute bottom-0 top-0 z-[1] cursor-default"
          style={{ left: leftPx, width: widthPx }}
          aria-label={timeRange}
        >
          <AvailabilityLine colorClass={colorClass} zClass={zClass} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="border-0 bg-transparent p-0 shadow-none">
        <AvailabilityTooltipCard title={title} timeRange={timeRange} tone={tone} />
      </TooltipContent>
    </Tooltip>
  )
}

export function ScheduleCarerAvailabilityOverlay({
  segments,
  showAvailabilityLines = true,
  viewport,
}: Props) {
  if (!segments.length) return null

  const unavailable = segments.filter((segment) => segment.kind === 'unavailable')
  const free = segments.filter((segment) => segment.kind === 'free')
  const possiblyAvailable = segments.filter((segment) => segment.kind === 'possibly-available')
  const booked = segments.filter((segment) => segment.kind === 'booked')

  return (
    <>
      {unavailable.map((segment) => {
        const position = resolveSegmentPositionPx(segment, viewport)
        if (!position) return null
        const { leftPx, widthPx } = position
        const { title, timeRange } = formatAvailabilitySegmentLabel(segment, SCHEDULE_JOBS_DAY_START_HOUR)
        const key = `unavailable-${segment.startMin}-${segment.endMin}`

        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div
                className="absolute bottom-0 top-0 z-0 cursor-default bg-muted/30"
                style={{
                  left: leftPx,
                  width: widthPx,
                  backgroundImage:
                    'repeating-linear-gradient(135deg, transparent, transparent 5px, rgba(100,116,139,0.1) 5px, rgba(100,116,139,0.1) 10px)',
                }}
                aria-label={timeRange}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="border-0 bg-transparent p-0 shadow-none">
              <AvailabilityTooltipCard title={title} timeRange={timeRange} tone="unavailable" />
            </TooltipContent>
          </Tooltip>
        )
      })}

      {showAvailabilityLines ? (
        <>
          {free.map((segment) => (
            <SegmentLine
              key={`free-${segment.startMin}-${segment.endMin}`}
              segment={segment}
              colorClass="bg-[#5a9f5e] shadow-[0_0_0_1px_rgba(255,255,255,0.65)]"
              tone="available"
              zClass="z-[1]"
              viewport={viewport}
            />
          ))}
          {possiblyAvailable.map((segment) => (
            <SegmentLine
              key={`possibly-${segment.startMin}-${segment.endMin}`}
              segment={segment}
              colorClass="bg-[#e8a54b] shadow-[0_0_0_1px_rgba(255,255,255,0.65)]"
              tone="possibly-available"
              zClass="z-[1]"
              viewport={viewport}
            />
          ))}
          {booked.map((segment) => (
            <SegmentLine
              key={`booked-${segment.startMin}-${segment.endMin}`}
              segment={segment}
              colorClass="bg-red-500 shadow-[0_0_0_1px_rgba(255,255,255,0.65)]"
              tone="booked"
              zClass="z-[2]"
              viewport={viewport}
            />
          ))}
        </>
      ) : null}
    </>
  )
}
