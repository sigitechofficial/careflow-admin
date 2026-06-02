import * as React from "react"
import { X, ChevronDown, Check } from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/shared/lib/utils"
import { Badge } from "./badge"

export interface MultiSelectOption {
  value: string
  label: string
  icon?: React.ReactNode
  disabled?: boolean
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value?: string[]
  onChange?: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  maxSelected?: number
  disabled?: boolean
  className?: string
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  maxSelected,
  disabled,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (val: string) => {
    if (value.includes(val)) {
      onChange?.(value.filter((v) => v !== val))
    } else {
      if (maxSelected && value.length >= maxSelected) return
      onChange?.([...value, val])
    }
  }

  const remove = (val: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(value.filter((v) => v !== val))
  }

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v))
    .filter(Boolean) as MultiSelectOption[]

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          disabled={disabled}
          className={cn(
            "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors",
            "hover:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            open && "border-ring ring-2 ring-ring ring-offset-2",
            className
          )}
        >
          {selectedLabels.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedLabels.map((opt) => (
              <Badge
                key={opt.value}
                variant="secondary"
                className="gap-1 py-0.5 pr-1 text-xs"
              >
                {opt.label}
                <button
                  onClick={(e) => remove(opt.value, e)}
                  className="ml-0.5 rounded-full hover:bg-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
          <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={cn(
            "z-50 w-[var(--radix-popover-trigger-width)] rounded-lg border border-border bg-popover shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          align="start"
          sideOffset={4}
        >
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">No options found</div>
            ) : (
              filtered.map((opt) => {
                const selected = value.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    disabled={opt.disabled || (!selected && !!maxSelected && value.length >= maxSelected)}
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      selected && "bg-accent/50"
                    )}
                  >
                    <div className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border border-border transition-colors",
                      selected && "border-primary bg-primary"
                    )}>
                      {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    {opt.icon && <span className="text-muted-foreground">{opt.icon}</span>}
                    {opt.label}
                  </button>
                )
              })
            )}
          </div>

          {value.length > 0 && (
            <div className="border-t border-border p-2">
              <button
                onClick={() => onChange?.([])}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all ({value.length} selected)
              </button>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
