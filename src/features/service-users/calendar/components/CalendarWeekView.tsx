import type { ServiceUserCalendarEvent } from '../types/service-user-calendar.types'
import { CalendarEventCard } from './CalendarEventCard'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map(d => {
        const key = d.toISOString().slice(0, 10)
        const evts = groupedByDate[key] ?? []
        return (
          <div key={key} className="rounded-lg border border-border bg-card p-2">
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
