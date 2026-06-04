import * as React from 'react'
import { AlertTriangle, CheckCircle2, Loader2, MinusCircle, TestTube2 } from 'lucide-react'
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
  runningLevel: IaAutofillLevel | null
  onRun: (level: IaAutofillLevel) => void | Promise<void>
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
    hint: 'Full assessment — safeguarding, falls, wounds, high scores',
    Icon: AlertTriangle,
  },
  normal: {
    variant: 'warning',
    hint: 'Required fields and hubs — routine risk flags',
    Icon: MinusCircle,
  },
  low: {
    variant: 'success',
    hint: 'Low-risk answers — stable / out of danger',
    Icon: CheckCircle2,
  },
}

function AutofillLevelButton({
  level,
  label,
  testId,
  tooltip,
  running,
  anyRunning,
  onRun,
}: {
  level: IaAutofillLevel
  label: string
  testId: string
  tooltip: string
  running: boolean
  anyRunning: boolean
  onRun: (level: IaAutofillLevel) => void
}) {
  const { variant, hint, Icon } = LEVEL_BUTTON[level]
  const disabled = anyRunning

  const button = (
    <Button
      type="button"
      variant={variant}
      size="lg"
      className={cn(
        'h-auto w-full flex-col items-stretch gap-1 rounded-lg px-4 py-3 text-left shadow-sm',
        'active:scale-[0.99]',
      )}
      data-testid={testId}
      disabled={disabled}
      aria-busy={running}
      aria-label={running ? `${label} autofill running` : `${label} autofill`}
      onClick={() => onRun(level)}
    >
      <span className="flex w-full items-center gap-2">
        {running ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
        ) : (
          <Icon className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
        )}
        <span className="flex-1 text-base font-semibold">{running ? 'Running…' : label}</span>
      </span>
      <span className="w-full pl-7 text-xs font-normal leading-snug opacity-90">{hint}</span>
    </Button>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {disabled ? <span className="inline-flex w-full cursor-not-allowed">{button}</span> : button}
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-sm text-left leading-snug">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export function InitialAssessmentPlaywrightTestsDialog({
  open,
  onOpenChange,
  runningLevel,
  onRun,
}: Props) {
  const anyRunning = runningLevel !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" data-testid="ia-playwright-tests-dialog">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-950">
              <TestTube2 className="h-5 w-5 text-teal-800 dark:text-teal-300" aria-hidden />
            </span>
            Playwright Tests
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 pt-1">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Autofill this service user&apos;s assessment to simulate how critical their condition
            appears. One run at a time — the active button shows a spinner until Playwright finishes.
          </p>
          <TooltipProvider delayDuration={250}>
            <div className="flex flex-col gap-3">
              {IA_AUTOFILL_LEVELS.map(({ level, label, testId, title }) => (
                <AutofillLevelButton
                  key={level}
                  level={level}
                  label={label}
                  testId={testId}
                  tooltip={title}
                  running={runningLevel === level}
                  anyRunning={anyRunning}
                  onRun={(l) => void onRun(l)}
                />
              ))}
            </div>
          </TooltipProvider>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
