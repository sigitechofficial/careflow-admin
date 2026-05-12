import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  showValue?: boolean
  prefix?: string
  suffix?: string
  marks?: { value: number; label: string }[]
}

export const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, showValue, prefix, suffix, marks, ...props }, ref) => {
    const values = props.value ?? props.defaultValue ?? [0]
    const isRange = values.length > 1
    const displayVal = isRange ? `${prefix ?? ""}${values[0]}${suffix ?? ""} – ${prefix ?? ""}${values[1]}${suffix ?? ""}` : `${prefix ?? ""}${values[0]}${suffix ?? ""}`

    return (
      <div className="space-y-2">
        {showValue && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Value</span>
            <span className="text-sm font-medium">{displayVal}</span>
          </div>
        )}
        <SliderPrimitive.Root
          ref={ref}
          className={cn("relative flex w-full touch-none select-none items-center", className)}
          {...props}
        >
          <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
            <SliderPrimitive.Range className="absolute h-full bg-primary" />
          </SliderPrimitive.Track>
          {values.map((_, i) => (
            <SliderPrimitive.Thumb
              key={i}
              className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110"
            />
          ))}
        </SliderPrimitive.Root>
        {marks && (
          <div className="relative w-full flex justify-between mt-1">
            {marks.map(m => (
              <span key={m.value} className="text-[10px] text-muted-foreground">{m.label}</span>
            ))}
          </div>
        )}
      </div>
    )
  }
)
Slider.displayName = "Slider"
