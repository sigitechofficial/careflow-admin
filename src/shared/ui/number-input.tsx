import * as React from "react"
import { Minus, Plus } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface NumberInputProps {
  value?: number
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  prefix?: string
  suffix?: string
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function NumberInput({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  prefix,
  suffix,
  disabled,
  placeholder = "0",
  className,
}: NumberInputProps) {
  const [internal, setInternal] = React.useState(value?.toString() ?? "")

  React.useEffect(() => {
    if (value !== undefined) setInternal(value.toString())
  }, [value])

  const clamp = (v: number) => Math.min(max, Math.max(min, v))

  const commit = (raw: string) => {
    const parsed = parseFloat(raw)
    if (!isNaN(parsed)) {
      const clamped = clamp(parsed)
      setInternal(clamped.toString())
      onChange?.(clamped)
    } else {
      setInternal(value?.toString() ?? "")
    }
  }

  const increment = () => {
    const current = parseFloat(internal) || 0
    const next = clamp(current + step)
    setInternal(next.toString())
    onChange?.(next)
  }

  const decrement = () => {
    const current = parseFloat(internal) || 0
    const next = clamp(current - step)
    setInternal(next.toString())
    onChange?.(next)
  }

  const canDec = (parseFloat(internal) || 0) > min
  const canInc = (parseFloat(internal) || 0) < max

  return (
    <div className={cn(
      "flex h-10 items-center rounded-lg border border-border bg-background text-sm transition-colors",
      "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:border-ring",
      disabled && "opacity-50 pointer-events-none",
      className
    )}>
      <button
        type="button"
        onClick={decrement}
        disabled={disabled || !canDec}
        className="flex h-full items-center justify-center px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-l-lg"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <div className="flex flex-1 items-center justify-center gap-1">
        {prefix && <span className="text-muted-foreground">{prefix}</span>}
        <input
          type="number"
          value={internal}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setInternal(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(internal) }}
          className="w-16 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && <span className="text-muted-foreground">{suffix}</span>}
      </div>

      <button
        type="button"
        onClick={increment}
        disabled={disabled || !canInc}
        className="flex h-full items-center justify-center px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-r-lg"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
