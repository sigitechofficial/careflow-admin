import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  dismissNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api/notifications.api'

function invalidateNotifications(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ['notifications'], exact: false })
  void qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => invalidateNotifications(qc),
  })
}

export function useDismissNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => dismissNotification(id),
    onSuccess: () => invalidateNotifications(qc),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => invalidateNotifications(qc),
  })
}
