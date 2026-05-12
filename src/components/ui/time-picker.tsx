import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string // "HH:mm"
  onChange?: (value: string) => void
  disabled?: boolean
  use24Hour?: boolean
  className?: string
}

export function TimePicker({ value = "", onChange, disabled, use24Hour = true, className }: TimePickerProps) {
  const [hours, setHours] = React.useState(() => value.split(":")[0] || "")
  const [minutes, setMinutes] = React.useState(() => value.split(":")[1] || "")
  const [period, setPeriod] = React.useState<"AM" | "PM">("AM")

  const emit = (h: string, m: string) => {
    if (h && m) onChange?.(`${h.padStart(2, "0")}:${m.padStart(2, "0")}`)
  }

  const handleHours = (v: string) => {
    const num = v.replace(/\D/g, "")
    const max = use24Hour ? 23 : 12
    if (num === "" || parseInt(num) <= max) {
      setHours(num)
      emit(num, minutes)
    }
  }

  const handleMinutes = (v: string) => {
    const num = v.replace(/\D/g, "")
    if (num === "" || parseInt(num) <= 59) {
      setMinutes(num)
      emit(hours, num)
    }
  }

  return (
    <div className={cn("flex h-10 items-center gap-1 rounded-lg border border-border bg-background px-3 text-sm transition-colors", "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:border-ring", "disabled:opacity-50", className)}>
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        placeholder={use24Hour ? "HH" : "hh"}
        value={hours}
        onChange={(e) => handleHours(e.target.value)}
        disabled={disabled}
        className="w-7 bg-transparent text-center outline-none placeholder:text-muted-foreground"
      />
      <span className="text-muted-foreground">:</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        placeholder="mm"
        value={minutes}
        onChange={(e) => handleMinutes(e.target.value)}
        disabled={disabled}
        className="w-7 bg-transparent text-center outline-none placeholder:text-muted-foreground"
      />
      {!use24Hour && (
        <button
          disabled={disabled}
          onClick={() => setPeriod(p => p === "AM" ? "PM" : "AM")}
          className="ml-1 rounded px-1.5 py-0.5 text-xs font-medium bg-muted hover:bg-accent transition-colors"
        >
          {period}
        </button>
      )}
    </div>
  )
}

// ─── Time Range ───────────────────────────────────────────────────────────────
interface TimeRangePickerProps {
  from?: string
  to?: string
  onChange?: (range: { from: string; to: string }) => void
  disabled?: boolean
  className?: string
}

export function TimeRangePicker({ from = "", to = "", onChange, disabled, className }: TimeRangePickerProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <TimePicker value={from} onChange={(v) => onChange?.({ from: v, to })} disabled={disabled} />
      <span className="text-muted-foreground text-sm shrink-0">to</span>
      <TimePicker value={to} onChange={(v) => onChange?.({ from, to: v })} disabled={disabled} />
    </div>
  )
}
