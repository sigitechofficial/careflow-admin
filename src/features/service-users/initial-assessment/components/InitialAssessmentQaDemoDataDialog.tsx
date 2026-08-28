import * as React from 'react'
import { AlertTriangle, CheckCircle2, Check, MinusCircle, FlaskConical } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { IA_AUTOFILL_LEVELS } from '@/features/service-users/initial-assessment/utils/ia-autofill-levels'
import type { IaAutofillLevel } from '@/features/service-users/initial-assessment/utils/ia-autofill-dev'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Currently-active QA scenario, or null if none picked yet. */
  activeLevel: IaAutofillLevel | null
  /** Set the active scenario. Selecting does NOT fill anything — each section fills itself. */
  onSelect: (level: IaAutofillLevel) => void
}

const LEVEL_BUTTON: Record<
  IaAutofillLevel,
  {
    variant: 'destructive' | 'warning' | 'success'
    hint: string
    Icon: React.ComponentType<{ className?: string }>
  }
> = {
  critical: {
    variant: 'destructive',
    hint: 'Safeguarding, falls, wounds, high scores',
    Icon: AlertTriangle,
  },
  normal: {
    variant: 'warning',
    hint: 'Routine risk flags, required fields',
    Icon: MinusCircle,
  },
  low: {
    variant: 'success',
    hint: 'Low-risk, stable / out of danger',
    Icon: CheckCircle2,
  },
}

function ScenarioButton({
  level,
  label,
  testId,
  tooltip,
  active,
  onSelect,
}: {
  level: IaAutofillLevel
  label: string
  testId: string
  tooltip: string
  active: boolean
  onSelect: (level: IaAutofillLevel) => void
}) {
  const { variant, hint, Icon } = LEVEL_BUTTON[level]

  const button = (
    <Button
      type="button"
      variant={active ? variant : 'outline'}
      size="lg"
      className={cn(
        'h-auto w-full flex-col items-stretch gap-1 rounded-lg px-4 py-3 text-left shadow-sm',
        'active:scale-[0.99]',
        active && 'ring-2 ring-offset-2',
      )}
      data-testid={testId}
      aria-pressed={active}
      aria-label={active ? `${label} scenario (selected)` : `Select ${label} scenario`}
      onClick={() => onSelect(level)}
    >
      <span className="flex w-full items-center gap-2">
        {active ? (
          <Check className="h-5 w-5 shrink-0" aria-hidden />
        ) : (
          <Icon className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
        )}
        <span className="flex-1 text-base font-semibold">{label}</span>
        {active ? <span className="text-xs font-medium uppercase opacity-90">Selected</span> : null}
      </span>
      <span className="w-full pl-7 text-xs font-normal leading-snug opacity-90">{hint}</span>
    </Button>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="left" className="max-w-sm text-left leading-snug">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export function InitialAssessmentQaDemoDataDialog({
  open,
  onOpenChange,
  activeLevel,
  onSelect,
}: Props) {
  const handleSelect = (level: IaAutofillLevel) => {
    onSelect(level)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" data-testid="ia-qa-demo-data-dialog">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-950">
              <FlaskConical className="h-5 w-5 text-teal-800 dark:text-teal-300" aria-hidden />
            </span>
            QA Demo Data
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 pt-1">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pick a QA scenario for this service user. Selecting a scenario does not change any data —
            it just decides what each section’s <strong>Fill Demo Data</strong> button will populate.
          </p>
          <TooltipProvider delayDuration={250}>
            <div className="flex flex-col gap-3">
              {IA_AUTOFILL_LEVELS.map(({ level, label, testId, title }) => (
                <ScenarioButton
                  key={level}
                  level={level}
                  label={label}
                  testId={testId}
                  tooltip={title}
                  active={activeLevel === level}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </TooltipProvider>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
