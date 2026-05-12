import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Avatar, AvatarFallback } from "./avatar"
import { Badge } from "./badge"

export interface RotaShift {
  id: string
  staffId: string
  day: number   // 0=Mon … 6=Sun
  startHour: number
  endHour: number
  label?: string
  color?: string
  type?: "day" | "night" | "on-call" | "training" | "leave"
}

export interface RotaStaff {
  id: string
  name: string
  role: string
  avatar?: string
}

interface RotaProps {
  staff: RotaStaff[]
  shifts: RotaShift[]
  weekLabel?: string
  onPrev?: () => void
  onNext?: () => void
  onShiftClick?: (shift: RotaShift) => void
  className?: string
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const SHIFT_COLORS: Record<string, string> = {
  day: "#008060",
  night: "#1d4ed8",
  "on-call": "#d97706",
  training: "#7c3aed",
  leave: "#94a3b8",
}

function hoursLabel(start: number, end: number) {
  const fmt = (h: number) => `${h.toString().padStart(2,"0")}:00`
  return `${fmt(start)}–${fmt(end)}`
}

function shiftWidth(s: number, e: number) { return ((e - s) / 24) * 100 }
function shiftLeft(s: number) { return (s / 24) * 100 }

export function RotaGrid({ staff, shifts, weekLabel = "This Week", onPrev, onNext, onShiftClick, className }: RotaProps) {
  return (
    <div className={cn("rounded-xl border border-border overflow-hidden bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/30">
        <span className="text-sm font-semibold">{weekLabel}</span>
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" onClick={onPrev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="icon-sm" variant="ghost" onClick={onNext}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="overflow-auto">
        <div className="min-w-[600px]">
          {/* Day column headers */}
          <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-border bg-muted/20">
            <div className="border-r border-border px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">Staff Member</span>
            </div>
            {DAYS.map(d => (
              <div key={d} className="border-r border-border last:border-r-0 px-2 py-2 text-center">
                <span className="text-xs font-medium text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>

          {/* Staff rows */}
          {staff.map(s => {
            const staffShifts = shifts.filter(sh => sh.staffId === s.id)
            const totalHours = staffShifts.reduce((acc, sh) => acc + (sh.endHour - sh.startHour), 0)
            return (
              <div key={s.id} className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-border last:border-b-0 min-h-[56px]">
                {/* Staff info */}
                <div className="flex items-center gap-2 border-r border-border px-3 py-2">
                  <Avatar size="sm">
                    <AvatarFallback>{s.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role} · {totalHours}h</p>
                  </div>
                </div>
                {/* Day cells */}
                {DAYS.map((_, di) => {
                  const dayShifts = staffShifts.filter(sh => sh.day === di)
                  return (
                    <div key={di} className="relative border-r border-border last:border-r-0 px-1 py-1.5 flex flex-col gap-1">
                      {dayShifts.map(sh => (
                        <button
                          key={sh.id}
                          onClick={() => onShiftClick?.(sh)}
                          title={hoursLabel(sh.startHour, sh.endHour)}
                          style={{ backgroundColor: sh.color ?? SHIFT_COLORS[sh.type ?? "day"] ?? SHIFT_COLORS.day }}
                          className="w-full rounded px-1.5 py-0.5 text-left hover:brightness-90 transition-all"
                        >
                          <p className="text-[10px] font-semibold text-white truncate leading-tight">
                            {sh.label ?? hoursLabel(sh.startHour, sh.endHour)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 border-t border-border px-4 py-2 bg-muted/20">
        {Object.entries(SHIFT_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-muted-foreground capitalize">{type.replace("-", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
