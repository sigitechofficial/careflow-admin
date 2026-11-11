import * as React from "react"
import { Clock } from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/shared/lib/utils"

const pad = (n: number) => String(n).padStart(2, "0")
/** Minutes offered in the list; any minute can still be typed. */
const MINUTE_STEPS = Array.from({ length: 12 }, (_, i) => pad(i * 5))

/** One scrolling column of the clock list; the chosen value is scrolled into view when it opens. */
function TimeColumn({ label, options, selected, onPick }: { label: string; options: string[]; selected: string; onPick: (v: string) => void }) {
  const listRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "center" })
  }, [])
  return (
    <div className="flex flex-col">
      <span className="px-2 pb-1 text-center text-xs font-medium text-muted-foreground">{label}</span>
      <div ref={listRef} role="listbox" aria-label={label} className="h-48 w-14 overflow-y-auto overscroll-contain pr-1">
        {options.map((o) => {
          const isSelected = selected !== "" && Number(o) === Number(selected)
          return (
            <button
              key={o}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => onPick(o)}
              className={cn(
                "block w-full rounded-md px-2 py-1 text-center text-sm tabular-nums transition-colors hover:bg-accent",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary",
              )}
            >
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

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
  const [open, setOpen] = React.useState(false)
  const hourOptions = use24Hour ? Array.from({ length: 24 }, (_, i) => pad(i)) : Array.from({ length: 12 }, (_, i) => pad(i + 1))

  // From the clock list: an hour keeps the minutes (00 if none yet); a minute completes the time and closes it.
  const pickHour = (h: string) => {
    const m = minutes || "00"
    setHours(h)
    setMinutes(m)
    emit(h, m)
  }
  const pickMinute = (m: string) => {
    const h = hours || (use24Hour ? "00" : "12")
    setHours(h)
    setMinutes(m)
    emit(h, m)
    setOpen(false)
  }

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
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild disabled={disabled}>
          <button
            type="button"
            aria-label="Choose a time"
            className="-ml-1 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none"
          >
            <Clock className="h-4 w-4" />
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            className="z-50 flex gap-1 rounded-lg border border-border bg-popover p-2 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            align="start"
            sideOffset={8}
          >
            <TimeColumn label="Hour" options={hourOptions} selected={hours} onPick={pickHour} />
            <TimeColumn label="Min" options={MINUTE_STEPS} selected={minutes} onPick={pickMinute} />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
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

// â”€â”€â”€ Time Range â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
