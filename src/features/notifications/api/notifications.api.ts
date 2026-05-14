import { apiJson, type ApiEnvelope } from '@/lib/api-client'
import type {
  NotificationListItem,
  NotificationPreferenceRow,
  NotificationUnreadEnvelope,
} from '@/features/notifications/types/notification.types'

export type NotificationListMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type ListNotificationsParams = {
  page?: number
  limit?: number
  unreadOnly?: boolean
  type?: string
  module?: string
  severity?: string
  dateFrom?: string
  dateTo?: string
  includeDismissed?: boolean
  sortBy?: 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

function buildQuery(params: ListNotificationsParams) {
  const qs = new URLSearchParams()
  if (params.page != null) qs.set('page', String(params.page))
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.unreadOnly) qs.set('unreadOnly', 'true')
  if (params.type) qs.set('type', params.type)
  if (params.module) qs.set('module', params.module)
  if (params.severity) qs.set('severity', params.severity)
  if (params.dateFrom) qs.set('dateFrom', params.dateFrom)
  if (params.dateTo) qs.set('dateTo', params.dateTo)
  if (params.includeDismissed) qs.set('includeDismissed', 'true')
  if (params.sortBy) qs.set('sortBy', params.sortBy)
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder)
  const q = qs.toString()
  return q ? `?${q}` : ''
}

export async function fetchNotifications(params: ListNotificationsParams = {}) {
  const res = await apiJson<ApiEnvelope<NotificationListItem[]>>(
    `/notifications${buildQuery(params)}`,
    { method: 'GET' },
  )
  const meta = (res.meta ?? {}) as Partial<NotificationListMeta>
  return {
    items: res.data,
    meta: {
      page: meta.page ?? 1,
      limit: meta.limit ?? 20,
      total: meta.total ?? res.data.length,
      totalPages: meta.totalPages ?? 1,
      hasNextPage: meta.hasNextPage ?? false,
      hasPrevPage: meta.hasPrevPage ?? false,
    } satisfies NotificationListMeta,
  }
}

export async function fetchNotificationUnreadCount() {
  const res = await apiJson<ApiEnvelope<NotificationUnreadEnvelope>>('/notifications/unread-count', {
    method: 'GET',
  })
  return res.data.count
}

export async function fetchNotificationById(id: string) {
  const res = await apiJson<ApiEnvelope<NotificationListItem>>(`/notifications/${id}`, { method: 'GET' })
  return res.data
}

export async function markNotificationRead(id: string) {
  await apiJson(`/notifications/${id}/read`, { method: 'PATCH' })
}

export async function markAllNotificationsRead() {
  await apiJson('/notifications/read-all', { method: 'PATCH' })
}

export async function dismissNotification(id: string) {
  await apiJson(`/notifications/${id}/dismiss`, { method: 'PATCH' })
}

export async function fetchNotificationPreferences() {
  const res = await apiJson<ApiEnvelope<NotificationPreferenceRow[]>>('/notification-preferences', {
    method: 'GET',
  })
  return res.data
}

/** Fields accepted by PATCH /notification-preferences (GET may return more). */
export type NotificationPreferencePatchItem = Pick<
  NotificationPreferenceRow,
  'type' | 'inAppEnabled' | 'soundEnabled'
>

export async function patchNotificationPreferences(preferences: NotificationPreferenceRow[]) {
  const body: { preferences: NotificationPreferencePatchItem[] } = {
    preferences: preferences.map(({ type, inAppEnabled, soundEnabled }) => ({
      type,
      inAppEnabled,
      soundEnabled,
    })),
  }
  const res = await apiJson<ApiEnvelope<NotificationPreferenceRow[]>>('/notification-preferences', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return res.data
}
