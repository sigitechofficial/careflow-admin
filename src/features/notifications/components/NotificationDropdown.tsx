import { useQueryClient } from '@tanstack/react-query'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/auth.store'
import { useNotifications } from '@/features/notifications/hooks/useNotifications'
import {
  dismissNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api/notifications.api'
import { NotificationList } from '@/features/notifications/components/NotificationList'

type Props = {
  onOpenPreferences: () => void
}

export function NotificationDropdown({ onOpenPreferences }: Props) {
  const qc = useQueryClient()
  const canUpdate = useAuthStore(s => s.can('notifications.update'))
  const canDismiss = useAuthStore(s => s.can('notifications.dismiss'))
  const canPrefs = useAuthStore(s => s.can('notifications.preferences.read'))
  const { data, isLoading, isFetching, error } = useNotifications({ limit: 25, sortOrder: 'desc' })
  const items = data?.items ?? []
  const busy = isLoading || isFetching

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['notifications'], exact: false })
    void qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
  }

  const onMarkRead = async (id: string) => {
    if (!canUpdate) return
    await markNotificationRead(id)
    await invalidate()
  }

  const onDismiss = async (id: string) => {
    if (!canDismiss) return
    await dismissNotification(id)
    await invalidate()
  }

  const onMarkAll = async () => {
    if (!canUpdate) return
    await markAllNotificationsRead()
    await invalidate()
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
      />
    </div>
  )
}
