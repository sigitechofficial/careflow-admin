import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type {
  CalendarEventTypeRow,
  CalendarEventsListParams,
  CalendarViewParams,
  CalendarViewResponse,
  CreateCalendarEventPayload,
  GlobalCalendarEventsParams,
  ServiceUserCalendarEvent,
  UpdateCalendarEventPayload,
} from '@/features/service-users/calendar/types/service-user-calendar.types'

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function getCalendarEventTypes(): Promise<CalendarEventTypeRow[]> {
  const res = await apiJson<ApiEnvelope<CalendarEventTypeRow[]>>(
    '/calendar-event-types?limit=100&isActive=true&sortBy=sortOrder&sortOrder=asc',
    { method: 'GET' },
  )
  return res.data ?? []
}

export async function getGlobalServiceUsersCalendarEvents(params: GlobalCalendarEventsParams) {
  const res = await apiJson<ApiEnvelope<ServiceUserCalendarEvent[]>>(
    `/service-users/calendar/events${buildQuery(params as Record<string, string | number | undefined>)}`,
    { method: 'GET' },
  )
  return { data: res.data ?? [], meta: res.meta }
}

export async function getServiceUserCalendarView(serviceUserId: string, params: CalendarViewParams) {
  const res = await apiJson<ApiEnvelope<CalendarViewResponse>>(
    `/service-users/${serviceUserId}/calendar${buildQuery(params as Record<string, string | undefined>)}`,
    { method: 'GET' },
  )
  return res.data!
}

export async function getServiceUserCalendarEvents(serviceUserId: string, query: CalendarEventsListParams = {}) {
  const res = await apiJson<ApiEnvelope<ServiceUserCalendarEvent[]>>(
    `/service-users/${serviceUserId}/calendar/events${buildQuery(query as Record<string, string | number | boolean | undefined>)}`,
    { method: 'GET' },
  )
  return { data: res.data ?? [], meta: res.meta }
}

export async function getServiceUserCalendarEvent(serviceUserId: string, eventId: string) {
  const res = await apiJson<ApiEnvelope<ServiceUserCalendarEvent>>(
    `/service-users/${serviceUserId}/calendar/events/${eventId}`,
    { method: 'GET' },
  )
  return res.data!
}

export async function createServiceUserCalendarEvent(
  serviceUserId: string,
  payload: CreateCalendarEventPayload,
) {
  const res = await apiJson<ApiEnvelope<ServiceUserCalendarEvent>>(
    `/service-users/${serviceUserId}/calendar/events`,
    { method: 'POST', body: JSON.stringify(payload) },
  )
  return res.data!
}

export async function updateServiceUserCalendarEvent(
  serviceUserId: string,
  eventId: string,
  payload: UpdateCalendarEventPayload,
) {
  const res = await apiJson<ApiEnvelope<ServiceUserCalendarEvent>>(
    `/service-users/${serviceUserId}/calendar/events/${eventId}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  )
  return res.data!
}

export async function deleteServiceUserCalendarEvent(serviceUserId: string, eventId: string) {
  await apiJson(`/service-users/${serviceUserId}/calendar/events/${eventId}`, { method: 'DELETE' })
}

export async function updateServiceUserCalendarEventStatus(
  serviceUserId: string,
  eventId: string,
  payload: { status: string; reason?: string },
) {
  const res = await apiJson<ApiEnvelope<ServiceUserCalendarEvent>>(
    `/service-users/${serviceUserId}/calendar/events/${eventId}/status`,
    { method: 'PATCH', body: JSON.stringify(payload) },
  )
  return res.data!
}
