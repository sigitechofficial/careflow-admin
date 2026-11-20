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

function metaString(item: NotificationListItem, key: string): string | null {
  const value = item.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function severityPillClass(severity: string | null): string {
  switch (severity) {
    case 'CRITICAL':
    case 'HIGH':
      return 'bg-destructive/10 text-destructive'
    case 'MEDIUM':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
    default:
      return 'bg-sky-500/10 text-sky-700 dark:text-sky-400'
  }
}

/** Incident notifications: severity pill beside the title. Other types: plain title. */
function NotificationTitle({ item }: { item: NotificationListItem }) {
  if (item.recordType !== 'Incident') {
    return <p className="text-xs font-medium leading-snug">{item.title}</p>
  }
  const severityLabel = metaString(item, 'severityLabel')
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <p className="text-xs font-medium leading-snug">{item.title}</p>
      {severityLabel ? (
        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', severityPillClass(metaString(item, 'severity')))}>
          {severityLabel}
        </span>
      ) : null}
    </div>
  )
}

/** Incident notifications: reference, category, person and site, then the description. */
function NotificationBody({ item }: { item: NotificationListItem }) {
  if (item.recordType !== 'Incident') {
    return <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>
  }
  const detail = [
    metaString(item, 'referenceNumber'),
    metaString(item, 'subtypeLabel') ?? metaString(item, 'categoryLabel'),
    metaString(item, 'personName'),
    metaString(item, 'locationName'),
  ].filter(Boolean).join(' · ')
  return (
    <>
      {detail ? <p className="text-[11px] text-muted-foreground">{detail}</p> : null}
      <p className="text-xs text-foreground line-clamp-2">{item.message}</p>
    </>
  )
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
          <NotificationTitle item={item} />
          <NotificationBody item={item} />
          <p className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </p>
        </button>
      ) : (
        <div className="min-w-0 flex-1 space-y-0.5">
          <NotificationTitle item={item} />
          <NotificationBody item={item} />
          <p className="text-[10px] text-muted-foreground">
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
