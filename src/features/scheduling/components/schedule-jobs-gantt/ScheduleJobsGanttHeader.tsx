import { Search, X } from 'lucide-react'
import { useScheduleJobsDisplayFormat } from '@/features/scheduling/context/schedule-jobs-display-format.context'
import { SCHEDULE_JOBS_GANTT_PERIOD_ICONS } from '@/features/scheduling/components/schedule-jobs-gantt/schedule-jobs-gantt.util'
import { normalizeScheduleJobsRowSearchQuery } from '@/features/scheduling/utils/schedule-jobs-row-search.util'
import {
  SCHEDULE_JOBS_CARER_COL_WIDTH,
  scheduleJobsPeriodBandHeaderClass,
  scheduleJobsPeriodHourCellClass,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import {
  scheduleJobsPeriodBandForViewportHour,
  type ScheduleJobsTimelineViewport,
} from '@/features/scheduling/utils/schedule-jobs-timeline-viewport.util'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'

type ScheduleJobsGanttHeaderProps = {
  leftColumnLabel: string
  rowSearch: string
  onRowSearchChange: (value: string) => void
  rowSearchPlaceholder: string
  viewport: ScheduleJobsTimelineViewport
  focusedPeriodBandId: string | null
  onPeriodBandDoubleClick: (bandId: string) => void
  onClearPeriodFocus: () => void
  boardMinWidth: number
}

export function ScheduleJobsGanttHeader({
  leftColumnLabel,
  rowSearch,
  onRowSearchChange,
  rowSearchPlaceholder,
  viewport,
  focusedPeriodBandId,
  onPeriodBandDoubleClick,
  onClearPeriodFocus,
  boardMinWidth,
}: ScheduleJobsGanttHeaderProps) {
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
                  <span aria-hidden>{SCHEDULE_JOBS_GANTT_PERIOD_ICONS[band.period]}</span>
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
