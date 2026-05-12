import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Badge } from "./badge"

export interface ActivityItem {
  id: string
  user?: { name: string; avatar?: string }
  action: string
  subject?: string
  meta?: string
  timestamp: string | Date
  type?: "default" | "success" | "warning" | "destructive" | "info"
  icon?: React.ReactNode
}

interface ActivityFeedProps {
  items: ActivityItem[]
  showTimeline?: boolean
  compact?: boolean
  className?: string
}

const typeColors = {
  default: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
}

function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 60) return "just now"
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export function ActivityFeed({ items, showTimeline = true, compact = false, className }: ActivityFeedProps) {
  return (
    <ul className={cn("space-y-0", className)}>
      {items.map((item, i) => (
        <li key={item.id} className={cn("relative flex gap-3", !compact && "pb-4", compact && "pb-2")}>
          {/* Timeline line */}
          {showTimeline && i < items.length - 1 && (
            <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
          )}

          {/* Icon / Avatar */}
          <div className="relative z-10 shrink-0">
            {item.user ? (
              <Avatar size="sm">
                <AvatarImage src={item.user.avatar} alt={item.user.name} />
                <AvatarFallback>{item.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
            ) : (
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-white text-xs", typeColors[item.type ?? "default"])}>
                {item.icon ?? <span className="sr-only">Event</span>}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className={cn("flex items-start justify-between gap-2", compact ? "py-1" : "pt-1")}>
              <p className="text-sm leading-snug">
                {item.user && <span className="font-medium">{item.user.name} </span>}
                <span className="text-muted-foreground">{item.action}</span>
                {item.subject && <span className="font-medium"> {item.subject}</span>}
              </p>
              <time className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{timeAgo(item.timestamp)}</time>
            </div>
            {item.meta && <p className="text-xs text-muted-foreground mt-0.5">{item.meta}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

// ─── Notification Item ────────────────────────────────────────────────────────
export interface NotificationItem {
  id: string
  title: string
  description?: string
  timestamp: string | Date
  read?: boolean
  type?: "default" | "success" | "warning" | "destructive" | "info"
  action?: { label: string; onClick: () => void }
}

interface NotificationListProps {
  items: NotificationItem[]
  onRead?: (id: string) => void
  onReadAll?: () => void
  className?: string
}

export function NotificationList({ items, onRead, onReadAll, className }: NotificationListProps) {
  const unread = items.filter(n => !n.read).length
  return (
    <div className={cn("", className)}>
      {unread > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-xs text-muted-foreground">{unread} unread</span>
          <button onClick={onReadAll} className="text-xs text-primary hover:underline">Mark all read</button>
        </div>
      )}
      <ul className="divide-y divide-border">
        {items.map((n) => (
          <li
            key={n.id}
            onClick={() => !n.read && onRead?.(n.id)}
            className={cn(
              "flex items-start gap-3 px-4 py-3 transition-colors",
              !n.read && "bg-primary/5 cursor-pointer hover:bg-primary/10"
            )}
          >
            <div className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : typeColors[n.type ?? "info"])} />
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm", !n.read && "font-medium")}>{n.title}</p>
              {n.description && <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>}
              <div className="flex items-center gap-3 mt-1">
                <time className="text-xs text-muted-foreground">{timeAgo(n.timestamp)}</time>
                {n.action && (
                  <button onClick={(e) => { e.stopPropagation(); n.action!.onClick() }} className="text-xs text-primary hover:underline">
                    {n.action.label}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
