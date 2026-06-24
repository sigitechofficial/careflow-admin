import { cn, formatTime as formatOrgTime } from '@/shared/lib/utils'
import type { ServiceUserCalendarEvent } from '../types/service-user-calendar.types'
import { CalendarEventTypeBadge } from './CalendarEventTypeBadge'

function formatTime(iso: string, allDay: boolean) {
  if (allDay) return 'All day'
  return formatOrgTime(iso)
}

function serviceUserLabel(ev: ServiceUserCalendarEvent) {
  if (!ev.serviceUser) return null
  const { preferredName, firstName, lastName } = ev.serviceUser
  return preferredName?.trim() || `${firstName} ${lastName}`.trim()
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  CANCELLED: 'bg-muted text-muted-foreground',
  MISSED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  RESCHEDULED: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
}

export function CalendarEventCard({
  event,
  showServiceUser,
  onClick,
}: {
  event: ServiceUserCalendarEvent
  showServiceUser?: boolean
  onClick?: () => void
}) {
  const suName = showServiceUser ? serviceUserLabel(event) : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition hover:border-teal-600/40 hover:shadow',
        onClick && 'cursor-pointer',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{event.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatTime(event.startDateTime, event.allDay)}
            {event.endDateTime && !event.allDay
              ? ` â€“ ${formatTime(event.endDateTime, false)}`
              : null}
          </p>
          {suName ? <p className="mt-1 text-xs font-medium text-teal-700 dark:text-teal-400">{suName}</p> : null}
          {event.location ? (
            <p className="mt-1 text-xs text-muted-foreground">{event.location}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          {event.eventType ? (
            <CalendarEventTypeBadge name={event.eventType.name} color={event.eventType.color} />
          ) : null}
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              STATUS_STYLES[event.status] ?? STATUS_STYLES.SCHEDULED,
            )}
          >
            {event.status}
          </span>
        </div>
      </div>
    </button>
  )
}
