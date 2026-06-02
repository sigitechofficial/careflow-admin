import * as React from "react"
import { cn } from "@/shared/lib/utils"

interface PinInputProps {
  length?: number
  value?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  masked?: boolean
  disabled?: boolean
  error?: boolean
  className?: string
}

export function PinInput({
  length = 4,
  value = "",
  onChange,
  onComplete,
  masked = false,
  disabled,
  error,
  className,
}: PinInputProps) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? "")

  const handleChange = (index: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = digit
    const joined = next.join("")
    onChange?.(joined)
    if (digit && index < length - 1) refs.current[index + 1]?.focus()
    if (joined.length === length) onComplete?.(joined)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits]; next[index] = ""; onChange?.(next.join(""))
      } else if (index > 0) {
        refs.current[index - 1]?.focus()
        const next = [...digits]; next[index - 1] = ""; onChange?.(next.join(""))
      }
    } else if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus()
    else if (e.key === "ArrowRight" && index < length - 1) refs.current[index + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    onChange?.(pasted)
    if (pasted.length === length) onComplete?.(pasted)
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type={masked ? "password" : "text"}
          inputMode="numeric"
          maxLength={1}
          value={digits[i]}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          disabled={disabled}
          className={cn(
            "h-12 w-12 rounded-lg border text-center text-lg font-semibold tracking-widest transition-colors outline-none",
            "focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-ring",
            error ? "border-destructive bg-destructive/5" : "border-border bg-background",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      ))}
    </div>
  )
}
