import * as React from "react"
import { Star } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface RatingProps {
  value?: number
  onChange?: (value: number) => void
  max?: number
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  showLabel?: boolean
  labels?: string[]
  className?: string
}

const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" }

export function Rating({
  value = 0, onChange, max = 5, size = "md", disabled, showLabel, labels, className,
}: RatingProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const display = hovered ?? value
  const defaultLabels = ["Poor", "Fair", "Good", "Very good", "Excellent"]
  const labelList = labels ?? defaultLabels.slice(0, max)

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1">
        {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(star === value ? 0 : star)}
            onMouseEnter={() => !disabled && setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            className={cn("transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50", !disabled && "cursor-pointer")}
          >
            <Star
              className={cn(
                sizes[size],
                "transition-colors",
                star <= display ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-muted-foreground"
              )}
            />
          </button>
        ))}
        {showLabel && display > 0 && (
          <span className="ml-2 text-sm font-medium text-foreground">{labelList[display - 1]}</span>
        )}
      </div>
    </div>
  )
}

// â”€â”€â”€ Read-only display â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface RatingDisplayProps {
  value: number
  max?: number
  size?: "sm" | "md" | "lg"
  showValue?: boolean
  className?: string
}

export function RatingDisplay({ value, max = 5, size = "sm", showValue, className }: RatingDisplayProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <Star key={star} className={cn(sizes[size], star <= Math.round(value) ? "fill-yellow-400 text-yellow-400" : "fill-transparent text-muted-foreground")} />
      ))}
      {showValue && <span className="ml-1 text-sm text-muted-foreground">{value.toFixed(1)}</span>}
    </div>
  )
}
