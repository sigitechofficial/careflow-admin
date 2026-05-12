import * as React from "react"
import { Check, Circle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"

export interface StatusStep {
  id: string
  label: string
  description?: string
  date?: string | Date
  type?: "complete" | "current" | "upcoming" | "error"
}

interface StatusStepperProps {
  steps: StatusStep[]
  orientation?: "horizontal" | "vertical"
  size?: "sm" | "md"
  className?: string
}

const stepTypeConfig = {
  complete: { circle: "bg-success border-success", icon: <Check className="h-3 w-3 text-white" />, label: "text-foreground", connector: "bg-success" },
  current:  { circle: "bg-background border-primary border-2", icon: <div className="h-2 w-2 rounded-full bg-primary" />, label: "text-foreground font-semibold", connector: "bg-border" },
  upcoming: { circle: "bg-background border-muted-foreground/30", icon: <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />, label: "text-muted-foreground", connector: "bg-border" },
  error:    { circle: "bg-destructive border-destructive", icon: <AlertCircle className="h-3 w-3 text-white" />, label: "text-destructive", connector: "bg-border" },
}

function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function StatusStepper({ steps, orientation = "horizontal", size = "md", className }: StatusStepperProps) {
  const circleSize = size === "sm" ? "h-6 w-6" : "h-8 w-8"
  const isH = orientation === "horizontal"

  return (
    <div className={cn("flex", isH ? "items-start" : "flex-col", className)}>
      {steps.map((step, i) => {
        const cfg = stepTypeConfig[step.type ?? "upcoming"]
        const isLast = i === steps.length - 1

        return (
          <React.Fragment key={step.id}>
            <div className={cn("flex", isH ? "flex-col items-center" : "items-start gap-3", "relative")}>
              {/* Circle */}
              <div className={cn("flex shrink-0 items-center justify-center rounded-full border-2 transition-colors", circleSize, cfg.circle)}>
                {cfg.icon}
              </div>

              {/* Label (horizontal) */}
              {isH && (
                <div className="mt-2 text-center max-w-[80px]">
                  <p className={cn("text-xs leading-snug", cfg.label)}>{step.label}</p>
                  {step.date && step.type === "complete" && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(step.date)}</p>
                  )}
                </div>
              )}

              {/* Label (vertical) */}
              {!isH && (
                <div className="pb-6 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm leading-snug", cfg.label)}>{step.label}</p>
                    {step.type === "current" && <Badge variant="info" size="sm">Current</Badge>}
                    {step.type === "error" && <Badge variant="destructive" size="sm">Issue</Badge>}
                  </div>
                  {step.description && <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>}
                  {step.date && <p className="text-xs text-muted-foreground mt-0.5">{formatDate(step.date)}</p>}
                </div>
              )}
            </div>

            {/* Connector */}
            {!isLast && (
              isH
                ? <div className={cn("mt-4 h-0.5 flex-1 mx-1 min-w-[24px]", cfg.connector)} />
                : <div className={cn("ml-3.5 mb-2 -mt-4 w-0.5 h-5", cfg.connector)} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
