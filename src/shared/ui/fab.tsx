import * as React from "react"
import { Plus } from "lucide-react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/shared/lib/utils"

interface FabAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
  color?: string
}

interface FabProps {
  icon?: React.ReactNode
  label?: string
  actions?: FabAction[]
  position?: "bottom-right" | "bottom-left" | "bottom-center"
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizes = { sm: "h-10 w-10", md: "h-14 w-14", lg: "h-16 w-16" }
const iconSizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-7 w-7" }
const positions = {
  "bottom-right": "bottom-6 right-6",
  "bottom-left": "bottom-6 left-6",
  "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
}

export function Fab({ icon, label = "Add", actions, position = "bottom-right", size = "md", className }: FabProps) {
  const [open, setOpen] = React.useState(false)

  const hasActions = actions && actions.length > 0

  return (
    <div className={cn("fixed z-40 flex flex-col-reverse items-center gap-3", positions[position], className)}>
      {/* Speed dial actions */}
      {hasActions && open && (
        <div className="flex flex-col-reverse gap-3 items-center mb-1">
          {actions!.map((action, i) => (
            <TooltipPrimitive.Provider key={i}>
              <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                  <button
                    onClick={() => { action.onClick(); setOpen(false) }}
                    style={action.color ? { backgroundColor: action.color } : undefined}
                    className={cn(
                      "h-10 w-10 rounded-full shadow-lg flex items-center justify-center text-white transition-all",
                      "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      !action.color && "bg-foreground"
                    )}
                  >
                    {action.icon}
                  </button>
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                  <TooltipPrimitive.Content
                    side="left"
                    className="z-50 overflow-hidden rounded-md border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md"
                  >
                    {action.label}
                  </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
              </TooltipPrimitive.Root>
            </TooltipPrimitive.Provider>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={hasActions ? () => setOpen(o => !o) : undefined}
        aria-label={label}
        className={cn(
          sizes[size],
          "rounded-full bg-primary text-primary-foreground shadow-lg",
          "flex items-center justify-center transition-all",
          "hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "active:scale-95"
        )}
      >
        <Plus className={cn(iconSizes[size], "transition-transform", hasActions && open && "rotate-45")} />
      </button>
    </div>
  )
}
