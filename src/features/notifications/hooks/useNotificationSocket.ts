import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { useToastStore } from '@/store/toast.store'
import {
  connectNotificationSocket,
  disconnectNotificationSocket,
} from '@/features/notifications/socket/notifications.socket'
import type { NotificationNewEvent, NotificationSeverity } from '@/features/notifications/types/notification.types'
import { useNotificationSound } from '@/features/notifications/hooks/useNotificationSound'
import { ecmKeys } from '@/features/ecm/keys'
import { isUrgentOfficeAlertKind } from '@/features/ecm/utils/ecm-urgent-alert.util'
import { schedulingKeys } from '@/features/scheduling/keys'
import { notificationDeepLink } from '@/features/notifications/utils/notification-deep-link'

function severityToToastVariant(
  s: NotificationSeverity,
): 'default' | 'success' | 'warning' | 'destructive' {
  switch (s) {
    case 'SUCCESS':
      return 'success'
    case 'WARNING':
      return 'warning'
    case 'ERROR':
    case 'CRITICAL':
      return 'destructive'
    default:
      return 'default'
  }
}

export function useNotificationSocket() {
  const qc = useQueryClient()
  const token = useAuthStore(s => s.accessToken)
  const user = useAuthStore(s => s.user)
  const isAuthed = useAuthStore(s => s.isAuthenticated())
  const can = useAuthStore(s => s.can('notifications.read'))
  const { tryPlay } = useNotificationSound()

  useEffect(() => {
    const ok =
      !!token &&
      isAuthed &&
      user?.role !== 'temporary_inspector' &&
      can &&
      !!useAuthStore.getState().user
    if (!ok) {
      disconnectNotificationSocket()
      return
    }
    const socket = connectNotificationSocket(token)
    if (!socket) return

    const onNew = (payload: NotificationNewEvent) => {
      void qc.invalidateQueries({ queryKey: ['notifications'], exact: false })
      void qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      void qc.invalidateQueries({ queryKey: schedulingKeys.all() })
      const kind =
        typeof payload.metadata?.kind === 'string' ? payload.metadata.kind : null
      const urgent = isUrgentOfficeAlertKind(kind)
      if (urgent) {
        void qc.invalidateQueries({ queryKey: ecmKeys.all })
      }

      const prefs = qc.getQueryData<Array<{ type: string; soundEnabled: boolean }>>(['notification-preferences'])
      const row = prefs?.find(p => p.type === payload.type)
      const soundEnabled = row?.soundEnabled ?? true
      const href = notificationDeepLink(payload)

      useToastStore.getState().push({
        title: payload.title,
        description: payload.message,
        variant: severityToToastVariant(payload.severity),
        href: href ?? undefined,
        duration: 5000,
      })
      void tryPlay(payload.severity, {
        playSound: payload.playSound && soundEnabled,
        urgentRing: urgent,
      })
    }

    const onUnread = (p: { count: number }) => {
      qc.setQueryData(['notifications', 'unread-count'], p.count)
    }

    const onMutate = () => {
      void qc.invalidateQueries({ queryKey: ['notifications'], exact: false })
      void qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    }

    socket.on('notification:new', onNew)
    socket.on('notification:unread-count', onUnread)
    socket.on('notification:read', onMutate)
    socket.on('notification:read-all', onMutate)
    socket.on('notification:dismissed', onMutate)

    return () => {
      socket.off('notification:new', onNew)
      socket.off('notification:unread-count', onUnread)
      socket.off('notification:read', onMutate)
      socket.off('notification:read-all', onMutate)
      socket.off('notification:dismissed', onMutate)
      disconnectNotificationSocket()
    }
  }, [token, isAuthed, user?.role, can, qc, tryPlay])
}
