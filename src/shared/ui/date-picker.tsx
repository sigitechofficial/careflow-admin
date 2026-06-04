import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { DayPicker, type DateRange } from "react-day-picker"
import { cn } from "@/shared/lib/utils"
import { Button } from "./button"
import { Textarea } from "./form-field"

// â”€â”€â”€ Calendar Primitive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function Calendar({ className, classNames, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center relative items-center pt-1",
        caption_label: "text-sm font-medium",
        nav: "flex items-center justify-between absolute inset-x-0 top-3 px-1",
        button_previous: cn(
          "inline-flex items-center justify-center rounded-md text-muted-foreground",
          "h-7 w-7 bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors"
        ),
        button_next: cn(
          "inline-flex items-center justify-center rounded-md text-muted-foreground",
          "h-7 w-7 bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex items-center justify-center",
        week: "flex w-full mt-1",
        day: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-accent/50",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md"
        ),
        day_button: cn(
          "h-9 w-9 p-0 font-normal inline-flex items-center justify-center rounded-md",
          "hover:bg-accent hover:text-accent-foreground transition-colors",
          "aria-selected:opacity-100"
        ),
        range_start: "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground rounded-l-md",
        range_end: "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground rounded-r-md",
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-md",
        today: "bg-accent text-accent-foreground font-semibold",
        outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  )
}

// â”€â”€â”€ Date Picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  className?: string
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", disabled, minDate, maxDate, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className={cn("relative w-full", className)}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm transition-colors",
              "hover:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !value && "text-muted-foreground",
              value && "pr-9",
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-left">
              {value ? format(value, "PPP") : placeholder}
            </span>
          </button>
        </PopoverPrimitive.Trigger>
        {value && !disabled ? (
          <button
            type="button"
            aria-label="Clear date"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-accent"
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              onChange?.(undefined)
            }}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ) : null}
      </div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-50 rounded-lg border border-border bg-popover shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          align="start"
          sideOffset={4}
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => { onChange?.(d); setOpen(false) }}
            disabled={(d) => (minDate ? d < minDate : false) || (maxDate ? d > maxDate : false)}
            autoFocus
          />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

// â”€â”€â”€ Date Range Picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DateRangePicker({ value, onChange, placeholder = "Pick a date range", disabled, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className={cn("relative w-full", className)}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm transition-colors",
              "hover:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              !value?.from && "text-muted-foreground",
              value?.from && "pr-9",
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-left">
              {value?.from
                ? value.to
                  ? `${format(value.from, "MMM d")} – ${format(value.to, "MMM d, yyyy")}`
                  : format(value.from, "PPP")
                : placeholder}
            </span>
          </button>
        </PopoverPrimitive.Trigger>
        {value?.from && !disabled ? (
          <button
            type="button"
            aria-label="Clear date range"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-accent"
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              onChange?.(undefined)
            }}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ) : null}
      </div>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-50 rounded-lg border border-border bg-popover shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          align="start"
          sideOffset={4}
        >
          <Calendar
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            autoFocus
          />
          <div className="flex justify-end gap-2 border-t border-border p-3">
            <Button size="sm" variant="outline" onClick={() => { onChange?.(undefined); setOpen(false) }}>Clear</Button>
            <Button size="sm" onClick={() => setOpen(false)}>Apply</Button>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
