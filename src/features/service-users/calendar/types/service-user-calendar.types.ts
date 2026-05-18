export type CalendarViewMode = 'DAY' | 'WEEK' | 'MONTH'

export type CalendarEventStatus =
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'MISSED'
  | 'RESCHEDULED'

export type CalendarEventTypeRow = {
  id: string
  name: string
  code: string
  description?: string | null
  color?: string | null
  icon?: string | null
  sortOrder: number
  isActive: boolean
}

export type ServiceUserCalendarEvent = {
  id: string
  serviceUserId: string
  eventTypeId: string | null
  title: string
  description: string | null
  startDateTime: string
  endDateTime: string | null
  allDay: boolean
  location: string | null
  status: CalendarEventStatus
  isRecurring: boolean
  recurrenceRule: string | null
  reminderBeforeMinutes: number | null
  notifyKeyWorker: boolean
  notifyNamedNurse: boolean
  notifyManager: boolean
  metadata: unknown
  isActive: boolean
  createdAt: string
  updatedAt: string
  eventType: {
    id: string
    name: string
    code: string
    color: string | null
    icon: string | null
  } | null
  serviceUser?: {
    id: string
    firstName: string
    lastName: string
    preferredName: string | null
    serviceUserNumber: string | null
  }
}

export type CalendarViewResponse = {
  view: CalendarViewMode
  date: string
  dateFrom: string
  dateTo: string
  events: ServiceUserCalendarEvent[]
  groupedByDate: Record<string, ServiceUserCalendarEvent[]>
}

export type CreateCalendarEventPayload = {
  title: string
  description?: string
  eventTypeId?: string
  startDateTime: string
  endDateTime?: string
  allDay?: boolean
  location?: string
  status?: CalendarEventStatus
  isRecurring?: boolean
  recurrenceRule?: string
  reminderBeforeMinutes?: number
  notifyKeyWorker?: boolean
  notifyNamedNurse?: boolean
  notifyManager?: boolean
  metadata?: Record<string, unknown>
}

export type UpdateCalendarEventPayload = Partial<CreateCalendarEventPayload>

export type CalendarEventsListParams = {
  page?: number
  limit?: number
  search?: string
  eventTypeId?: string
  status?: CalendarEventStatus
  dateFrom?: string
  dateTo?: string
  allDay?: boolean
  includeInactive?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type GlobalCalendarEventsParams = {
  dateFrom: string
  dateTo: string
  serviceUserId?: string
  eventTypeId?: string
  status?: CalendarEventStatus
  locationId?: string
  keyWorkerId?: string
  namedNurseId?: string
  page?: number
  limit?: number
}

export type CalendarViewParams = {
  view: CalendarViewMode
  date: string
  eventTypeId?: string
  status?: CalendarEventStatus
}
