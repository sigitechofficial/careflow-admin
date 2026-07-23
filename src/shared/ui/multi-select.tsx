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
  /** When set, the popover matches this element's width and aligns to it (e.g. a filter field container). */
  popoverAnchorRef?: React.RefObject<HTMLElement | null>
  checkPosition?: 'left' | 'right'
  isOptionSelected?: (option: MultiSelectOption, value: string[]) => boolean
  formatSelectedOptions?: (selected: MultiSelectOption[]) => MultiSelectOption[]
  onRemoveOption?: (option: MultiSelectOption, value: string[]) => string[]
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
  popoverAnchorRef,
  checkPosition = 'left',
  isOptionSelected = (option, selected) => selected.includes(option.value),
  formatSelectedOptions = (selected) => selected,
  onRemoveOption = (option, selected) => selected.filter((item) => item !== option.value),
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

  const remove = (opt: MultiSelectOption, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(onRemoveOption(opt, value))
  }

  const selectedLabels = formatSelectedOptions(
    value
      .map((v) => options.find((o) => o.value === v))
      .filter(Boolean) as MultiSelectOption[],
  )

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <div
          role="combobox"
          aria-expanded={open}
          aria-disabled={disabled || undefined}
          tabIndex={disabled ? -1 : 0}
          className={cn(
            "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors",
            "hover:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            open && "border-ring ring-2 ring-ring ring-offset-2",
            disabled && "cursor-not-allowed opacity-50",
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
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${opt.label}`}
                  onClick={(e) => remove(opt, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      remove(opt, e as unknown as React.MouseEvent)
                    }
                  }}
                  className="ml-0.5 rounded-full hover:bg-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </span>
              </Badge>
            ))
          )}
          <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={cn(
            "z-[100] w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-content-available-width)] rounded-lg border border-border bg-popover shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="border-b border-border p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div
            className="max-h-60 overflow-y-auto overscroll-contain p-1"
            onWheel={(e) => e.stopPropagation()}
          >
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">No options found</div>
            ) : (
              filtered.map((opt) => {
                const selected = isOptionSelected(opt, value)
                const checkBox = (
                  <div
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border transition-colors',
                      selected && 'border-primary bg-primary',
                    )}
                  >
                    {selected ? <Check className="h-3 w-3 text-primary-foreground" /> : null}
                  </div>
                )
                const checkMark = (
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0 text-primary',
                      selected ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                )
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={opt.disabled || (!selected && !!maxSelected && value.length >= maxSelected)}
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      selected && 'bg-accent/50',
                    )}
                  >
                    {checkPosition === 'left' ? checkBox : null}
                    {opt.icon ? <span className="shrink-0 text-muted-foreground">{opt.icon}</span> : null}
                    <span className="min-w-0 flex-1 text-left leading-snug">{opt.label}</span>
                    {checkPosition === 'right' ? checkMark : null}
                  </button>
                )
              })
            )}
          </div>

          {value.length > 0 && (
            <div className="border-t border-border p-2">
              <button
                type="button"
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
