import { formatDistanceToNow } from 'date-fns'
import { Check, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import type { NotificationListItem, NotificationSeverity } from '@/features/notifications/types/notification.types'
import { notificationDeepLink } from '@/features/notifications/utils/notification-deep-link'

function severityDot(sev: NotificationSeverity) {
  switch (sev) {
    case 'ERROR':
    case 'CRITICAL':
      return 'bg-destructive'
    case 'WARNING':
      return 'bg-amber-500'
    case 'SUCCESS':
      return 'bg-emerald-500'
    default:
      return 'bg-sky-500'
  }
}

type Props = {
  item: NotificationListItem
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
  onOpen?: (item: NotificationListItem) => void
}

export function NotificationItem({ item, onMarkRead, onDismiss, onOpen }: Props) {
  const unread = !item.readAt
  const href = notificationDeepLink(item)

  return (
    <div
      className={cn(
        'flex gap-2 rounded-md border border-transparent px-2 py-2 text-left transition-colors',
        unread ? 'bg-accent/40' : 'hover:bg-accent/30',
      )}
    >
      <div className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', severityDot(item.severity))} />
      {href ? (
        <button
          type="button"
          className="min-w-0 flex-1 space-y-0.5 text-left"
          onClick={() => onOpen?.(item)}
        >
          <p className="text-xs font-medium leading-snug">{item.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>
          <p className="text-[10px] text-muted-foreground/80">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </p>
        </button>
      ) : (
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-xs font-medium leading-snug">{item.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>
          <p className="text-[10px] text-muted-foreground/80">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </p>
        </div>
      )}
      <div className="flex shrink-0 flex-col gap-0.5">
        {unread ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Mark read"
            onClick={e => {
              e.stopPropagation()
              onMarkRead(item.id)
            }}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          title="Dismiss"
          onClick={e => {
            e.stopPropagation()
            onDismiss(item.id)
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
