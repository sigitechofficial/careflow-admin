import * as React from 'react'
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn, formatDate } from '@/shared/lib/utils'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import type {
  CalendarEventStatus,
  CalendarViewMode,
  ServiceUserCalendarEvent,
} from '../types/service-user-calendar.types'
import { useGlobalServiceUserCalendar } from '../hooks/useServiceUserCalendar'
import { useCalendarEventTypes } from '../hooks/useCalendarEventTypes'
import { CalendarInfoTooltip } from './CalendarInfoTooltip'
import { CalendarMonthView } from './CalendarMonthView'
import { CalendarWeekView } from './CalendarWeekView'
import { CalendarDayView } from './CalendarDayView'
import { CalendarEventCard } from './CalendarEventCard'
import { CalendarEventDialog } from './CalendarEventDialog'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function toDateStr(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function weekStartFrom(date: Date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function monthRange(year: number, month: number) {
  const from = new Date(year, month, 1)
  const to = new Date(year, month + 1, 0)
  return { dateFrom: toDateStr(from), dateTo: toDateStr(to) }
}

function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [y = 0, m = 1, d = 1] = dateKey.split('-').map(Number)
  return { year: y, month: m - 1, day: d }
}

export function ServiceUserCalendarPage({
  serviceUserId,
  embedded,
}: {
  serviceUserId?: string
  embedded?: boolean
}) {
  const can = useAuthStore(s => s.can)
  const canRead = can('service_users.calendar.read')
  const canCreate = can('service_users.calendar.create')
  const hasApi = !!getApiBaseUrl()

  const today = new Date()
  const [view, setView] = React.useState<CalendarViewMode>('MONTH')
  const [cursor, setCursor] = React.useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()))
  const [selectedDay, setSelectedDay] = React.useState(today.getDate())
  const [eventTypeId, setEventTypeId] = React.useState<string>('')
  const [statusFilter, setStatusFilter] = React.useState<string>('')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [dialogDefaultDate, setDialogDefaultDate] = React.useState<string | undefined>()
  const [editingEvent, setEditingEvent] = React.useState<ServiceUserCalendarEvent | null>(null)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const dateStr = toDateStr(new Date(year, month, selectedDay))
  const range = monthRange(year, month)

  const { data: eventTypes = [] } = useCalendarEventTypes()
  const globalQuery = useGlobalServiceUserCalendar({
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    eventTypeId: eventTypeId || undefined,
    status: (statusFilter as CalendarEventStatus) || undefined,
    serviceUserId,
  })

  const events: ServiceUserCalendarEvent[] = globalQuery.data?.data ?? []
  const groupedByDate = React.useMemo(() => {
    const g: Record<string, ServiceUserCalendarEvent[]> = {}
    for (const e of events) {
      const k = e.startDateTime.slice(0, 10)
      if (!g[k]) g[k] = []
      g[k].push(e)
    }
    return g
  }, [events])

  const goToday = () => {
    const n = new Date()
    setCursor(new Date(n.getFullYear(), n.getMonth(), n.getDate()))
    setSelectedDay(n.getDate())
  }

  const shift = (dir: -1 | 1) => {
    if (view === 'MONTH') {
      setCursor(new Date(year, month + dir, 1))
    } else if (view === 'WEEK') {
      const d = new Date(cursor)
      d.setDate(d.getDate() + dir * 7)
      setCursor(d)
    } else {
      const d = new Date(cursor)
      d.setDate(d.getDate() + dir)
      setCursor(d)
      setSelectedDay(d.getDate())
    }
  }

  const openCreateForDate = (dateKey: string) => {
    if (!canCreate) return
    const { year: y, month: m, day } = parseDateKey(dateKey)
    setSelectedDay(day)
    setCursor(new Date(y, m, day))
    setEditingEvent(null)
    setDialogDefaultDate(dateKey)
    setDialogOpen(true)
  }

  const openCreate = () => {
    if (!canCreate) return
    const key = view === 'DAY' ? toDateStr(cursor) : dateStr
    setEditingEvent(null)
    setDialogDefaultDate(key)
    setDialogOpen(true)
  }

  const openEdit = (e: ServiceUserCalendarEvent) => {
    setEditingEvent(e)
    setDialogDefaultDate(e.startDateTime.slice(0, 10))
    setDialogOpen(true)
  }

  const handleSelectDate = (dateKey: string) => {
    const { year: y, month: m, day } = parseDateKey(dateKey)
    setSelectedDay(day)
    setCursor(new Date(y, m, day))
  }

  const handleSelectDay = (day: number) => {
    setSelectedDay(day)
  }

  if (!hasApi) {
    return (
      <p className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL to load the calendar.</p>
    )
  }

  if (!canRead) {
    return (
      <p className="p-6 text-sm text-destructive" data-testid="calendar-access-denied">
        You do not have permission to view the service user calendar.
      </p>
    )
  }

  const headerLabel =
    view === 'MONTH'
      ? `${MONTH_NAMES[month]} ${year}`
      : view === 'WEEK'
        ? `Week of ${toDateStr(weekStartFrom(cursor))}`
        : formatOrganisationIsoDateLong(toDateStr(cursor))

  const dayViewDateStr = view === 'DAY' ? toDateStr(cursor) : dateStr
  const selectedEvents = groupedByDate[dateStr] ?? []
  const dayViewEvents = groupedByDate[dayViewDateStr] ?? []

  return (
    <div className={cn('flex flex-col gap-4', embedded ? 'p-0' : 'p-4 md:p-6')} data-testid="service-users-calendar-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!embedded ? (
            <>
              <h1 className="text-xl font-bold text-foreground md:text-2xl">Service Users Calendar</h1>
              <CalendarInfoTooltip />
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Calendar</h2>
              <CalendarInfoTooltip />
            </>
          )}
        </div>
        {canCreate ? (
          <Button type="button" className="gap-2" onClick={openCreate} data-testid="calendar-add-event">
            <Plus className="h-4 w-4" />
            Add Customer Event
          </Button>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">Birthdays And Events</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={goToday}>
          Today
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="min-w-[10rem] text-sm font-semibold">{headerLabel}</span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(['DAY', 'WEEK', 'MONTH'] as const).map(v => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={view === v ? 'default' : 'outline'}
              onClick={() => setView(v)}
              data-testid={`calendar-view-${v.toLowerCase()}`}
            >
              {v.charAt(0) + v.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={eventTypeId || '_all'} onValueChange={v => setEventTypeId(v === '_all' ? '' : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All types</SelectItem>
            {eventTypes.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter || '_all'} onValueChange={v => setStatusFilter(v === '_all' ? '' : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All statuses</SelectItem>
            {['SCHEDULED', 'COMPLETED', 'CANCELLED', 'MISSED', 'RESCHEDULED'].map(s => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {globalQuery.isLoading ? (
        <div className="flex items-center justify-center py-16" data-testid="calendar-loading">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      ) : globalQuery.isError ? (
        <p className="text-sm text-destructive">Failed to load calendar events.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div>
            {view === 'MONTH' ? (
              <CalendarMonthView
                year={year}
                month={month}
                selectedDay={selectedDay}
                eventsByDate={groupedByDate}
                onSelectDay={handleSelectDay}
              />
            ) : null}
            {view === 'WEEK' ? (
              <CalendarWeekView
                weekStart={weekStartFrom(cursor)}
                groupedByDate={groupedByDate}
                showServiceUser={!serviceUserId}
                onEventClick={openEdit}
                onSelectDate={handleSelectDate}
              />
            ) : null}
            {view === 'DAY' ? (
              <CalendarDayView
                dateLabel={headerLabel}
                events={dayViewEvents}
                showServiceUser={!serviceUserId}
                onEventClick={openEdit}
              />
            ) : null}
          </div>

          <aside className="space-y-3">
            <h2 className="text-sm font-semibold">
              {view === 'MONTH' ? `Events — ${dateStr}` : view === 'DAY' ? `Events — ${dayViewDateStr}` : 'Events'}
            </h2>
            {(view === 'MONTH' ? selectedEvents : view === 'DAY' ? dayViewEvents : events).length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground" data-testid="calendar-empty">
                  No events on this day.
                </p>
                {canCreate ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => openCreateForDate(view === 'DAY' ? dayViewDateStr : dateStr)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Customer Event
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                {(view === 'MONTH' ? selectedEvents : view === 'DAY' ? dayViewEvents : events).map(e => (
                  <CalendarEventCard
                    key={e.id}
                    event={e}
                    showServiceUser={!serviceUserId}
                    onClick={() => openEdit(e)}
                  />
                ))}
                {canCreate ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      openCreateForDate(
                        view === 'DAY' ? dayViewDateStr : view === 'MONTH' ? dateStr : dayViewDateStr,
                      )
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Customer Event
                  </Button>
                ) : null}
              </div>
            )}
          </aside>
        </div>
      )}

      {canCreate || editingEvent ? (
        <CalendarEventDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          fixedServiceUserId={serviceUserId}
          event={editingEvent}
          defaultDate={dialogDefaultDate ?? (view === 'DAY' ? dayViewDateStr : dateStr)}
        />
      ) : null}
    </div>
  )
}
