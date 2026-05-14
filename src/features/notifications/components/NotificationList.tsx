import { NotificationItem } from '@/features/notifications/components/NotificationItem'
import type { NotificationListItem } from '@/features/notifications/types/notification.types'

type Props = {
  items: NotificationListItem[]
  loading?: boolean
  error?: Error | null
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
}

export function NotificationList({ items, loading, error, onMarkRead, onDismiss }: Props) {
  if (loading) {
    return (
      <div className="py-10 text-center text-xs text-muted-foreground">Loading notifications…</div>
    )
  }
  if (error) {
    return (
      <div className="py-8 text-center text-xs text-destructive">
        {error.message || 'Could not load notifications.'}
      </div>
    )
  }
  if (!items.length) {
    return <div className="py-10 text-center text-xs text-muted-foreground">You&apos;re all caught up.</div>
  }
  return (
    <div className="flex max-h-80 flex-col gap-1 overflow-y-auto px-1 py-1">
      {items.map(n => (
        <NotificationItem key={n.id} item={n} onMarkRead={onMarkRead} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
