import { Settings2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/shared/ui/button'
import { useAuthStore } from '@/features/auth/store'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'
import {
  useDismissNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/features/notifications/hooks/useNotificationMutations'
import { NotificationList } from '@/features/notifications/components/NotificationList'
import { notificationEcmLiveSearch } from '@/features/notifications/utils/notification-deep-link'
import type { NotificationListItem } from '@/features/notifications/types/notification.types'

type Props = {
  onOpenPreferences: () => void
  onNavigate?: () => void
}

export function NotificationDropdown({ onOpenPreferences, onNavigate }: Props) {
  const navigate = useNavigate()
  const canUpdate = useAuthStore(s => s.can('notifications.update'))
  const canDismiss = useAuthStore(s => s.can('notifications.dismiss'))
  const canPrefs = useAuthStore(s => s.can('notifications.preferences.read'))
  const { data, isLoading, isFetching, error } = useNotifications({ limit: 25, sortOrder: 'desc' })
  const markReadMutation = useMarkNotificationRead()
  const dismissMutation = useDismissNotification()
  const markAllReadMutation = useMarkAllNotificationsRead()
  const items = data?.items ?? []
  const busy = isLoading || isFetching

  const onMarkRead = async (id: string) => {
    if (!canUpdate) return
    await markReadMutation.mutateAsync(id)
  }

  const onDismiss = async (id: string) => {
    if (!canDismiss) return
    await dismissMutation.mutateAsync(id)
  }

  const onMarkAll = async () => {
    if (!canUpdate) return
    await markAllReadMutation.mutateAsync()
  }

  const onOpen = (item: NotificationListItem) => {
    const search = notificationEcmLiveSearch(item)
    if (!search) return
    if (canUpdate && !item.readAt) void onMarkRead(item.id)
    onNavigate?.()
    void navigate({ to: '/ecm/live', search })
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="text-xs font-semibold">Notifications</p>
        <div className="flex items-center gap-1">
          {canUpdate && items.some(i => !i.readAt) ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => void onMarkAll()}>
              Mark all read
            </Button>
          ) : null}
          {canPrefs ? (
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Preferences" onClick={onOpenPreferences}>
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="h-px bg-border" />
      <NotificationList
        items={items}
        loading={busy}
        error={error instanceof Error ? error : error ? new Error(String(error)) : null}
        onMarkRead={id => void onMarkRead(id)}
        onDismiss={id => void onDismiss(id)}
        onOpen={onOpen}
      />
    </div>
  )
}
