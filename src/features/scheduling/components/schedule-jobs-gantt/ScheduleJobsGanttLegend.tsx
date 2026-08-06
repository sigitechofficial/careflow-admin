import { Clock } from 'lucide-react'
import { useScheduleJobsDisplayFormat } from '@/features/scheduling/context/schedule-jobs-display-format.context'
import { SCHEDULE_JOBS_GANTT_PERIOD_ICONS } from '@/features/scheduling/components/schedule-jobs-gantt/schedule-jobs-gantt.util'
import {
  SCHEDULE_JOBS_DAY_PERIOD_BANDS,
  scheduleJobsPeriodBandHeaderClass,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { cn } from '@/shared/lib/utils'

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

type ScheduleJobsGanttLegendProps = {
  onPeriodBandDoubleClick?: (bandId: string) => void
  focusedPeriodBandId?: string | null
  onClearPeriodFocus?: () => void
}

export function ScheduleJobsGanttLegend({
  onPeriodBandDoubleClick,
  focusedPeriodBandId,
  onClearPeriodFocus,
}: ScheduleJobsGanttLegendProps) {
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
      <LegendPill swatch="bg-sky-600" label="Early start / end" />
      <LegendPill swatch="bg-orange-600" label="Late start / end / overrun" />
      <LegendPill swatch="bg-destructive" label="Critically late" />
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
          <span aria-hidden>{SCHEDULE_JOBS_GANTT_PERIOD_ICONS[band.period]}</span>
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
