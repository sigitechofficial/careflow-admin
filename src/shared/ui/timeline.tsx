import * as React from "react"
import { cn } from "@/shared/lib/utils"
import { Badge } from "./badge"

export interface TimelineEvent {
  id: string
  title: string
  description?: string
  date: string | Date
  category?: string
  type?: "default" | "success" | "warning" | "destructive" | "info"
  icon?: React.ReactNode
  author?: string
  metadata?: Record<string, string>
}

interface TimelineProps {
  events: TimelineEvent[]
  groupByDate?: boolean
  className?: string
}

const typeColors: Record<string, string> = {
  default: "bg-muted-foreground border-muted-foreground",
  success: "bg-success border-success",
  warning: "bg-warning border-warning",
  destructive: "bg-destructive border-destructive",
  info: "bg-info border-info",
}

const typeBadge: Record<string, "default" | "success" | "warning" | "destructive" | "info"> = {
  default: "default", success: "success", warning: "warning", destructive: "destructive", info: "info",
}

function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function formatTime(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

function groupEvents(events: TimelineEvent[]) {
  const groups: Record<string, TimelineEvent[]> = {}
  for (const ev of events) {
    const key = formatDate(ev.date)
    if (!groups[key]) groups[key] = []
    groups[key].push(ev)
  }
  return groups
}

export function Timeline({ events, groupByDate = true, className }: TimelineProps) {
  if (groupByDate) {
    const groups = groupEvents(events)
    return (
      <div className={cn("space-y-6", className)}>
        {Object.entries(groups).map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">{date}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <TimelineList events={items} />
          </div>
        ))}
      </div>
    )
  }
  return <TimelineList events={events} className={className} />
}

function TimelineList({ events, className }: { events: TimelineEvent[]; className?: string }) {
  return (
    <ul className={cn("relative space-y-0", className)}>
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
      {events.map((ev, i) => (
        <li key={ev.id} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Dot */}
          <div className={cn("relative z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-background shadow-sm", typeColors[ev.type ?? "default"])}>
            {ev.icon
              ? <span className="text-white text-xs">{ev.icon}</span>
              : <div className="h-2 w-2 rounded-full bg-white" />
            }
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{ev.title}</p>
                {ev.author && <p className="text-xs text-muted-foreground mt-0.5">by {ev.author}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {ev.category && <Badge variant={typeBadge[ev.type ?? "default"]} size="sm">{ev.category}</Badge>}
                <time className="text-xs text-muted-foreground whitespace-nowrap">{formatTime(ev.date)}</time>
              </div>
            </div>
            {ev.description && <p className="text-sm text-muted-foreground mt-1">{ev.description}</p>}
            {ev.metadata && (
              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {Object.entries(ev.metadata).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1">
                    <dt className="text-xs text-muted-foreground">{k}:</dt>
                    <dd className="text-xs font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
