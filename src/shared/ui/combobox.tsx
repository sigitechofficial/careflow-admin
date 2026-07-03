import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/shared/lib/utils"

export interface ComboboxOption {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
  disabled?: boolean
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  loading?: boolean
  onSearchChange?: (search: string) => void
  className?: string
  id?: string
  error?: boolean
  'aria-label'?: string
  'data-testid'?: string
  /** When false, clicking the selected option again does not clear the value */
  allowDeselect?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled,
  loading,
  onSearchChange,
  className,
  id,
  error,
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
  allowDeselect = true,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filtered = options.filter((o) => {
    const q = search.toLowerCase()
    return (
      o.label.toLowerCase().includes(q) ||
      o.value.toLowerCase().includes(q) ||
      o.description?.toLowerCase().includes(q)
    )
  })

  const selected = options.find((o) => o.value === value)

  const handleSearch = (v: string) => {
    setSearch(v)
    onSearchChange?.(v)
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          id={id}
          type="button"
          data-testid={dataTestId}
          aria-label={ariaLabel}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors',
            'ring-offset-background placeholder:text-muted-foreground/60',
            'hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
            'data-[state=open]:border-ring data-[state=open]:ring-2 data-[state=open]:ring-ring data-[state=open]:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !selected && 'text-muted-foreground',
            error && 'border-destructive focus:ring-destructive/30',
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
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
          <div className="border-b border-border p-2">
            <div className="relative">
              <input
                autoFocus
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className={cn(
                  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm',
                  'placeholder:text-muted-foreground/60',
                  'outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
                  loading && 'pr-9',
                )}
              />
              {loading ? (
                <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-1" role="listbox">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  disabled={opt.disabled}
                  onClick={() => {
                    if (allowDeselect && opt.value === value) {
                      onChange?.("")
                    } else {
                      onChange?.(opt.value)
                    }
                    setOpen(false)
                    setSearch("")
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    opt.value === value && "bg-accent/50"
                  )}
                >
                  {opt.icon && <span className="shrink-0 text-muted-foreground">{opt.icon}</span>}
                  <span className="flex min-w-0 flex-1 flex-col items-start text-left">
                    <span>{opt.label}</span>
                    {opt.description && <span className="text-xs text-muted-foreground">{opt.description}</span>}
                  </span>
                  <Check className={cn("h-4 w-4 shrink-0 text-primary", opt.value === value ? "opacity-100" : "opacity-0")} />
                </button>
              ))
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
