import * as PopoverPrimitive from '@radix-ui/react-popover'
import { format } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { useScheduleJobsDisplayFormat } from '@/features/scheduling/context/schedule-jobs-display-format.context'
import { formatScheduleJobsWeekday } from '@/features/scheduling/utils/schedule-jobs-timeline.util'
import { todayIso } from '@/features/scheduling/utils/scheduling-format'
import { Button } from '@/shared/ui/button'
import { Calendar } from '@/shared/ui/date-picker'

function isoDateToLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`)
}

function localDateToIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

const TODAY_SELECTED_CLASS =
  'bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-100'

type Props = {
  date: string
  onPrevDay: () => void
  onNextDay: () => void
  onToday: () => void
  onDateChange: (isoDate: string) => void
  className?: string
}

export function ScheduleJobsDateControls({
  date,
  onPrevDay,
  onNextDay,
  onToday,
  onDateChange,
  className,
}: Props) {
  const displayFormat = useScheduleJobsDisplayFormat()
  const isToday = date === todayIso()
  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const selectedDate = React.useMemo(() => isoDateToLocalDate(date), [date])

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <div className="flex items-center rounded-lg border border-border bg-background p-0.5 shadow-sm">
        <Button type="button" size="icon-sm" variant="ghost" className="h-8 w-8" onClick={onPrevDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn('h-8 px-3 text-xs font-semibold', isToday && TODAY_SELECTED_CLASS)}
          onClick={onToday}
        >
          Today
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" className="h-8 w-8" onClick={onNextDay}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <PopoverPrimitive.Root open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverPrimitive.Trigger asChild>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="h-8 w-8 rounded-none border-l border-border"
              aria-label="Pick schedule date"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              className="z-50 rounded-lg border border-border bg-popover shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              align="end"
              sideOffset={6}
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(nextDate) => {
                  if (!nextDate) return
                  onDateChange(localDateToIsoDate(nextDate))
                  setCalendarOpen(false)
                }}
                autoFocus
              />
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>

      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border text-center shadow-sm',
            isToday
              ? 'border-emerald-300/70 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100'
              : 'border-border bg-muted/40 text-foreground',
          )}
        >
          <span className="text-[10px] font-bold uppercase leading-none tracking-wide">
            {formatScheduleJobsWeekday(date)}
          </span>
          <span className="mt-0.5 text-lg font-bold leading-none tabular-nums">
            {new Date(`${date}T12:00:00`).getDate()}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground">{displayFormat.formatDate(date)}</p>
      </div>
    </div>
  )
}
