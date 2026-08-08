import * as PopoverPrimitive from '@radix-ui/react-popover'
import { format } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import * as React from 'react'
import {
  type EcmOperationalPeriodPreset,
  formatPeriodDayShort,
  presetOptionLabel,
} from '@/features/ecm/utils/ecm-operational-period.util'
import {
  formatScheduleJobsWeekday,
  shiftIsoDate,
} from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { todayIso } from '@/features/scheduling/utils/scheduling-format'
import { formatOperationalDayLabel } from '@/shared/lib/operational-day.util'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Calendar } from '@/shared/ui/date-picker'
import { Input } from '@/shared/ui/input'

const PERIOD_PRESETS: EcmOperationalPeriodPreset[] = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'last_14_days',
  'last_30_days',
  'this_month',
  'last_month',
  'month_to_date',
  'quarter_to_date',
  'year_to_date',
  'custom',
]

const TODAY_SELECTED_CLASS =
  'bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-100'

export type SchedulePeriodDayToolbarPeriodProps = {
  preset: EcmOperationalPeriodPreset
  dateFrom: string
  dateTo: string
  operationalToday: string
  onPresetChange: (preset: EcmOperationalPeriodPreset) => void
  onApplyPreset: (preset: Exclude<EcmOperationalPeriodPreset, 'custom'>) => void
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
}

export type SchedulePeriodDayToolbarProps = SchedulePeriodDayToolbarPeriodProps & {
  date: string
  onDateChange: (isoDate: string) => void
  onPrevDay: () => void
  onNextDay: () => void
  onToday: () => void
  className?: string
}

type DayNavProps = {
  date: string
  isToday: boolean
  calendarOpen: boolean
  setCalendarOpen: (open: boolean) => void
  onPrevDay: () => void
  onNextDay: () => void
  onToday: () => void
  onDateChange: (isoDate: string) => void
  pickLabel: string
}

function DayNavCluster({
  date,
  isToday,
  calendarOpen,
  setCalendarOpen,
  onPrevDay,
  onNextDay,
  onToday,
  onDateChange,
  pickLabel,
}: DayNavProps) {
  const selectedDate = React.useMemo(() => new Date(`${date}T12:00:00`), [date])

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="flex items-center rounded-md border border-border bg-card p-0.5">
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="h-7 w-7"
          onClick={onPrevDay}
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn('h-7 px-2.5 text-xs font-semibold', isToday && TODAY_SELECTED_CLASS)}
          onClick={onToday}
        >
          Today
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="h-7 w-7"
          onClick={onNextDay}
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <PopoverPrimitive.Root open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverPrimitive.Trigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="h-7 w-7 rounded-none border-l border-border"
              aria-label={pickLabel}
            >
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              className="z-50 rounded-lg border border-border bg-popover shadow-lg"
              align="end"
              sideOffset={6}
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(nextDate) => {
                  if (!nextDate) return
                  onDateChange(format(nextDate, 'yyyy-MM-dd'))
                  setCalendarOpen(false)
                }}
                autoFocus
              />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>

      <div
        className={cn(
          'flex h-8 items-center gap-2 rounded-md border px-2',
          isToday
            ? 'border-emerald-300/70 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
            : 'border-border bg-muted/30 text-foreground',
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-wide">
          {formatScheduleJobsWeekday(date)}
        </span>
        <span className="text-sm font-semibold tabular-nums">{formatPeriodDayShort(date)}</span>
      </div>
    </div>
  )
}

/**
 * One date control, two modes:
 * - Single day → period preset + day stepper (same day; no second picker)
 * - Multi-day → period/range + board “viewing” day inside that range
 */
export function SchedulePeriodDayToolbar({
  preset,
  dateFrom,
  dateTo,
  date,
  operationalToday,
  onPresetChange,
  onApplyPreset,
  onDateFromChange,
  onDateToChange,
  onDateChange,
  onPrevDay,
  onNextDay,
  onToday,
  className,
}: SchedulePeriodDayToolbarProps) {
  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const isToday = date === todayIso()
  const multiDay = dateFrom !== dateTo
  const rangeLabel = `${formatPeriodDayShort(dateFrom)} – ${formatPeriodDayShort(dateTo)}`

  const handleToday = () => {
    if (multiDay) {
      onToday()
      return
    }
    onApplyPreset('today')
  }

  return (
    <div
      className={cn('rounded-lg border border-border bg-background px-3 py-2.5', className)}
      data-testid="schedule-period-day-toolbar"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            View
          </span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={preset}
            aria-label="Schedule date view"
            data-testid="schedule-period-preset"
            onChange={(e) => {
              const v = e.target.value as EcmOperationalPeriodPreset
              if (v === 'custom') {
                onPresetChange('custom')
                return
              }
              onApplyPreset(v)
            }}
          >
            {PERIOD_PRESETS.map((p) => (
              <option key={p} value={p}>
                {presetOptionLabel(p)}
              </option>
            ))}
          </select>
        </label>

        {multiDay ? (
          <>
            {preset === 'custom' ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <Input
                  type="date"
                  className="h-8 w-[9.75rem]"
                  value={dateFrom}
                  max={dateTo}
                  aria-label="Period from"
                  data-testid="schedule-period-from"
                  onChange={(e) => onDateFromChange(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  className="h-8 w-[9.75rem]"
                  value={dateTo}
                  min={dateFrom}
                  aria-label="Period to"
                  data-testid="schedule-period-to"
                  onChange={(e) => onDateToChange(e.target.value)}
                />
              </div>
            ) : (
              <span
                className="inline-flex max-w-full items-center truncate rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                title={rangeLabel}
              >
                {rangeLabel}
              </span>
            )}

            <div className="hidden h-7 w-px shrink-0 bg-border sm:block" aria-hidden />

            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Board day
            </span>
            <DayNavCluster
              date={date}
              isToday={isToday}
              calendarOpen={calendarOpen}
              setCalendarOpen={setCalendarOpen}
              onPrevDay={onPrevDay}
              onNextDay={onNextDay}
              onToday={handleToday}
              onDateChange={onDateChange}
              pickLabel="Pick board day"
            />
          </>
        ) : (
          <>
            <DayNavCluster
              date={date}
              isToday={isToday}
              calendarOpen={calendarOpen}
              setCalendarOpen={setCalendarOpen}
              onPrevDay={onPrevDay}
              onNextDay={onNextDay}
              onToday={handleToday}
              onDateChange={onDateChange}
              pickLabel="Pick schedule date"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              title="Expand to a custom from–to range"
              onClick={() => onDateToChange(shiftIsoDate(dateFrom, 6))}
            >
              Date range…
            </Button>
          </>
        )}
      </div>

      <p
        className="mt-2 border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground"
        data-testid="schedule-period-ops-day-note"
      >
        {formatOperationalDayLabel(operationalToday)}
        {multiDay ? (
          <>
            {' · '}
            List shows <span className="font-medium text-foreground">{rangeLabel}</span>
            {' · '}
            Board on{' '}
            <span className="font-medium text-foreground">{formatPeriodDayShort(date)}</span>
          </>
        ) : null}
      </p>
    </div>
  )
}
