import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Check } from "lucide-react"
import { cn } from "@/shared/lib/utils"

const PRESETS = [
  "#ef4444","#f97316","#eab308","#22c55e","#14b8a6",
  "#3b82f6","#6366f1","#a855f7","#ec4899","#64748b",
  "#0ea5e9","#10b981","#f59e0b","#8b5cf6","#06b6d4",
  "#84cc16","#f43f5e","#d946ef","#0d9488","#1d4ed8",
]

interface ColorPickerProps {
  value?: string
  onChange?: (value: string) => void
  disabled?: boolean
  className?: string
}

export function ColorPicker({ value = "#3b82f6", onChange, disabled, className }: ColorPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [hex, setHex] = React.useState(value)

  const commit = (v: string) => {
    setHex(v)
    onChange?.(v)
  }

  const handleHex = (v: string) => {
    setHex(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange?.(v)
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          disabled={disabled}
          className={cn(
            "flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm transition-colors",
            "hover:border-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className="h-5 w-5 rounded border border-border/50 shrink-0" style={{ backgroundColor: value }} />
          <span className="font-mono text-xs text-muted-foreground">{value.toUpperCase()}</span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className="z-50 w-64 rounded-lg border border-border bg-popover p-3 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          align="start" sideOffset={4}
        >
          {/* Presets */}
          <div className="grid grid-cols-10 gap-1 mb-3">
            {PRESETS.map(c => (
              <button
                key={c}
                onClick={() => { commit(c); setOpen(false) }}
                className="relative h-5 w-5 rounded border border-border/30 transition-transform hover:scale-110"
                style={{ backgroundColor: c }}
              >
                {c === value && <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />}
              </button>
            ))}
          </div>

          {/* Large preview */}
          <div className="h-12 w-full rounded-md border border-border mb-3" style={{ backgroundColor: hex }} />

          {/* Hex input */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">#</span>
            <input
              value={hex.replace("#", "")}
              onChange={e => handleHex(`#${e.target.value}`)}
              maxLength={6}
              className="flex-1 bg-transparent font-mono text-sm outline-none border-b border-input pb-0.5 focus:border-primary transition-colors"
              placeholder="3b82f6"
            />
            <input
              type="color"
              value={value}
              onChange={e => commit(e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
