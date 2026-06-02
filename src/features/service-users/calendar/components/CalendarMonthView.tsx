import { cn } from '@/shared/lib/utils'
import type { ServiceUserCalendarEvent } from '../types/service-user-calendar.types'

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function CalendarMonthView({
  year,
  month,
  selectedDay,
  eventsByDate,
  onSelectDay,
}: {
  year: number
  month: number
  selectedDay: number
  eventsByDate: Record<string, ServiceUserCalendarEvent[]>
  onSelectDay: (day: number) => void
}) {
  const totalDays = new Date(year, month + 1, 0).getDate()
  const startOffset = new Date(year, month, 1).getDay()
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date()
  const pad = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {DAYS.map(d => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day == null) return <div key={`e-${i}`} className="min-h-[4.5rem]" />
          const key = pad(day)
          const evts = eventsByDate[key] ?? []
          const isToday =
            day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
          const isSelected = day === selectedDay
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                'min-h-[4.5rem] rounded-md border p-1 text-left text-sm transition hover:border-teal-600/50',
                isSelected && 'border-teal-600 bg-teal-50 dark:bg-teal-950/40',
                isToday && !isSelected && 'ring-1 ring-teal-500/40',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  evts.length > 0 && 'bg-teal-600 text-white',
                )}
              >
                {day}
              </span>
              <div className="mt-1 space-y-0.5">
                {evts.slice(0, 2).map(e => (
                  <p
                    key={e.id}
                    className="truncate text-[10px] leading-tight"
                    style={{ color: e.eventType?.color ?? undefined }}
                  >
                    {e.title}
                  </p>
                ))}
                {evts.length > 2 ? (
                  <p className="text-[10px] text-muted-foreground">+{evts.length - 2} more</p>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
