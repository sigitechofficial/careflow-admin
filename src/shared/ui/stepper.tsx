import * as React from "react"
import { Check, Circle } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "./button"

export interface Step {
  id: string
  label: string
  description?: string
  optional?: boolean
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  onStepChange?: (step: number) => void
  orientation?: "horizontal" | "vertical"
  className?: string
}

type StepStatus = "complete" | "current" | "upcoming"

function getStatus(index: number, current: number): StepStatus {
  if (index < current) return "complete"
  if (index === current) return "current"
  return "upcoming"
}

export function Stepper({ steps, currentStep, onStepChange, orientation = "horizontal", className }: StepperProps) {
  const isHorizontal = orientation === "horizontal"

  return (
    <nav className={cn("flex", isHorizontal ? "items-start" : "flex-col gap-0", className)} aria-label="Steps">
      {steps.map((step, i) => {
        const status = getStatus(i, currentStep)
        const isLast = i === steps.length - 1

        return (
          <React.Fragment key={step.id}>
            <div className={cn("flex", isHorizontal ? "flex-col items-center" : "items-start gap-3", "relative")}>
              {/* Circle */}
              <button
                onClick={() => status === "complete" && onStepChange?.(i)}
                disabled={status === "upcoming"}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  status === "complete" && "border-primary bg-primary text-primary-foreground cursor-pointer",
                  status === "current" && "border-primary bg-background text-primary",
                  status === "upcoming" && "border-muted-foreground/30 bg-background text-muted-foreground cursor-not-allowed"
                )}
              >
                {status === "complete" ? <Check className="h-4 w-4" /> : <span>{i + 1}</span>}
              </button>

              {/* Label (horizontal) */}
              {isHorizontal && (
                <div className="mt-2 text-center">
                  <p className={cn("text-xs font-medium", status === "upcoming" ? "text-muted-foreground" : "text-foreground")}>{step.label}</p>
                  {step.optional && <p className="text-[10px] text-muted-foreground">Optional</p>}
                </div>
              )}

              {/* Label (vertical) */}
              {!isHorizontal && (
                <div className="pb-6">
                  <p className={cn("text-sm font-medium leading-none", status === "upcoming" ? "text-muted-foreground" : "text-foreground")}>{step.label}</p>
                  {step.description && <p className="text-xs text-muted-foreground mt-1">{step.description}</p>}
                  {step.optional && <p className="text-xs text-muted-foreground italic">Optional</p>}
                </div>
              )}
            </div>

            {/* Connector */}
            {!isLast && (
              isHorizontal ? (
                <div className={cn("mt-4 h-0.5 flex-1 mx-2", i < currentStep ? "bg-primary" : "bg-muted-foreground/20")} />
              ) : (
                <div className={cn("ml-4 w-0.5 h-6 -mt-4 mb-2", i < currentStep ? "bg-primary" : "bg-muted-foreground/20")} />
              )
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

// â”€â”€â”€ Stepper Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface StepperControlsProps {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onNext: () => void
  onComplete?: () => void
  nextLabel?: string
  completeLabel?: string
  isLoading?: boolean
  canProceed?: boolean
  className?: string
}

export function StepperControls({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onComplete,
  nextLabel = "Continue",
  completeLabel = "Complete",
  isLoading,
  canProceed = true,
  className,
}: StepperControlsProps) {
  const isLast = currentStep === totalSteps - 1
  return (
    <div className={cn("flex items-center justify-between pt-4", className)}>
      <Button variant="outline" onClick={onBack} disabled={currentStep === 0}>Back</Button>
      <span className="text-sm text-muted-foreground">Step {currentStep + 1} of {totalSteps}</span>
      <Button onClick={isLast ? onComplete : onNext} disabled={!canProceed} loading={isLoading}>
        {isLast ? completeLabel : nextLabel}
      </Button>
    </div>
  )
}
