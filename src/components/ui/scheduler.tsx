import * as React from "react"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Badge } from "./badge"

export interface SchedulerEvent {
  id: string
  title: string
  start: Date
  end: Date
  color?: string
  carer?: string
  type?: string
}

interface SchedulerProps {
  events?: SchedulerEvent[]
  onEventClick?: (event: SchedulerEvent) => void
  onSlotClick?: (date: Date, hour: number) => void
  className?: string
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 07:00 – 20:00
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function startOfWeek(d: Date) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(d: Date, n: number) {
  const date = new Date(d)
  date.setDate(date.getDate() + n)
  return date
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const DEFAULT_COLORS = ["#008060","#3b82f6","#8b5cf6","#f97316","#ec4899","#14b8a6"]

export function WeekScheduler({ events = [], onEventClick, onSlotClick, className }: SchedulerProps) {
  const [weekStart, setWeekStart] = React.useState(() => startOfWeek(new Date()))
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today = new Date()

  const prev = () => setWeekStart(d => addDays(d, -7))
  const next = () => setWeekStart(d => addDays(d, 7))
  const goToday = () => setWeekStart(startOfWeek(new Date()))

  const weekLabel = `${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${addDays(weekStart, 6).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`

  const getEventsForSlot = (day: Date, hour: number) =>
    events.filter(ev => sameDay(ev.start, day) && ev.start.getHours() <= hour && ev.end.getHours() > hour)

  return (
    <div className={cn("flex flex-col rounded-xl border border-border overflow-hidden bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{weekLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={goToday}>Today</Button>
          <Button size="icon-sm" variant="ghost" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="icon-sm" variant="ghost" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="overflow-auto">
        <div className="min-w-[640px]">
          {/* Day headers */}
          <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-b border-border">
            <div className="border-r border-border" />
            {weekDays.map((day, i) => (
              <div key={i} className={cn("px-2 py-2 text-center border-r border-border last:border-r-0", sameDay(day, today) && "bg-primary/5")}>
                <p className="text-xs text-muted-foreground">{DAYS[i]}</p>
                <p className={cn("text-base font-semibold", sameDay(day, today) ? "text-primary" : "text-foreground")}>
                  {day.getDate()}
                </p>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-[3rem_repeat(7,1fr)]">
            {HOURS.map(hour => (
              <React.Fragment key={hour}>
                <div className="border-r border-border border-b border-b-border/50 py-2 pr-2 text-right">
                  <span className="text-[10px] text-muted-foreground">{hour.toString().padStart(2,"0")}:00</span>
                </div>
                {weekDays.map((day, di) => {
                  const slotEvents = getEventsForSlot(day, hour)
                  return (
                    <div
                      key={di}
                      onClick={() => onSlotClick?.(day, hour)}
                      className={cn(
                        "relative border-r border-border last:border-r-0 border-b border-b-border/50 h-12 cursor-pointer",
                        "hover:bg-accent/30 transition-colors",
                        sameDay(day, today) && "bg-primary/3"
                      )}
                    >
                      {slotEvents.map(ev => (
                        <div
                          key={ev.id}
                          onClick={e => { e.stopPropagation(); onEventClick?.(ev) }}
                          style={{ backgroundColor: ev.color ?? DEFAULT_COLORS[0] }}
                          className="absolute inset-x-0.5 inset-y-0.5 rounded px-1.5 py-0.5 cursor-pointer hover:brightness-90 transition-all z-10 overflow-hidden"
                        >
                          <p className="text-[10px] font-semibold text-white truncate leading-tight">{ev.title}</p>
                          {ev.carer && <p className="text-[9px] text-white/80 truncate">{ev.carer}</p>}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
