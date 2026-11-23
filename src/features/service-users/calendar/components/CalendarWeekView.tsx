import type { ServiceUserCalendarEvent } from '../types/service-user-calendar.types'
import { CalendarEventCard } from './CalendarEventCard'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** The day's key as the other views use it (year-month-day of the day shown), never its UTC date. */
export function weekDayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** The 7 days of the week starting on `weekStart`. */
export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function CalendarWeekView({
  weekStart,
  groupedByDate,
  showServiceUser,
  onEventClick,
  onSelectDate,
}: {
  weekStart: Date
  groupedByDate: Record<string, ServiceUserCalendarEvent[]>
  showServiceUser?: boolean
  onEventClick?: (e: ServiceUserCalendarEvent) => void
  onSelectDate?: (dateKey: string) => void
}) {
  const days = weekDays(weekStart)

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map(d => {
        const key = weekDayKey(d)
        const evts = groupedByDate[key] ?? []
        return (
          <div key={key} className="min-w-0 rounded-lg border border-border bg-card p-2" data-testid={`calendar-week-day-${key}`}>
            <button
              type="button"
              className="mb-2 w-full rounded px-1 py-0.5 text-center text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => onSelectDate?.(key)}
            >
              {DAYS[d.getDay()]} {d.getDate()}
            </button>
            <div className="space-y-2">
              {evts.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">No events</p>
              ) : (
                evts.map(e => (
                  <CalendarEventCard
                    key={e.id}
                    event={e}
                    showServiceUser={showServiceUser}
                    compact
                    onClick={onEventClick ? () => onEventClick(e) : undefined}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
