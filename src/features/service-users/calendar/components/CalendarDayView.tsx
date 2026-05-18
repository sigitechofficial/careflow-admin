import type { ServiceUserCalendarEvent } from '../types/service-user-calendar.types'
import { CalendarEventCard } from './CalendarEventCard'

export function CalendarDayView({
  dateLabel,
  events,
  showServiceUser,
  onEventClick,
}: {
  dateLabel: string
  events: ServiceUserCalendarEvent[]
  showServiceUser?: boolean
  onEventClick?: (e: ServiceUserCalendarEvent) => void
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{dateLabel}</h3>
      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No events on this day.</p>
      ) : (
        <div className="space-y-3">
          {events.map(e => (
            <CalendarEventCard
              key={e.id}
              event={e}
              showServiceUser={showServiceUser}
              onClick={onEventClick ? () => onEventClick(e) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
