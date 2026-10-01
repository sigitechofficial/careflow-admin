import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import type { IncidentStatus } from '@/features/incidents/types'

export type WorkflowStepState = 'complete' | 'current' | 'upcoming'

export type IncidentDetailWorkflowStepId =
  | 'raise'
  | 'investigate'
  | 'actions'
  | 'outcome'

export function resolveIncidentDetailWorkflow(
  status: IncidentStatus,
  hasFinalOutcome: boolean,
): {
  steps: { id: IncidentDetailWorkflowStepId; label: string; hint: string; state: WorkflowStepState }[]
  currentId: IncidentDetailWorkflowStepId
} {
  const currentId: IncidentDetailWorkflowStepId =
    status === 'REPORTED'
      ? 'raise'
      : status === 'ACTIONS_REQUIRED'
        ? 'actions'
        : status === 'AWAITING_CLOSURE' || status === 'CLOSED'
          ? 'outcome'
          : 'investigate'

  const order: IncidentDetailWorkflowStepId[] = ['raise', 'investigate', 'actions', 'outcome']
  const currentIndex = order.indexOf(currentId)

  const meta: Record<IncidentDetailWorkflowStepId, { label: string; hint: string }> = {
    raise: {
      label: '1. Raise',
      hint:
        status === 'REPORTED'
          ? 'Next: start the investigation.'
          : 'Incident has been raised.',
    },
    investigate: {
      label: '2. Investigate',
      hint:
        currentId === 'investigate'
          ? 'Complete the investigation, then move to corrective measures.'
          : 'Internal or external investigation.',
    },
    actions: {
      label: '3. Corrective measures',
      hint:
        currentId === 'actions'
          ? 'Complete corrective measures, then choose Ready to close.'
          : currentId === 'investigate'
            ? 'After investigation: add measures if needed, then Ready to close.'
            : 'Track and complete corrective measures, then Ready to close.',
    },
    outcome: {
      label: '4. Outcome & close',
      hint:
        status === 'AWAITING_CLOSURE'
          ? hasFinalOutcome
            ? 'Next: close the incident.'
            : 'Next: record the final outcome, then close.'
          : status === 'CLOSED'
            ? 'Incident closed.'
            : 'After Ready to close: record outcome and close.',
    },
  }

  return {
    currentId,
    steps: order.map((id, index) => ({
      id,
      ...meta[id],
      state:
        status === 'CLOSED' && hasFinalOutcome
          ? 'complete'
          : index < currentIndex
            ? 'complete'
            : index === currentIndex
              ? 'current'
              : 'upcoming',
    })),
  }
}

export function IncidentWorkflowStepCard({
  stepNumber,
  title,
  hint,
  state,
  nextAction,
  children,
}: {
  stepNumber: number
  title: string
  hint: string
  state: WorkflowStepState
  nextAction?: React.ReactNode
  children: React.ReactNode
}) {
  const isCurrent = state === 'current'
  const isComplete = state === 'complete'

  return (
    <section
      className={cn(
        'rounded-xl border bg-card shadow-sm transition-colors',
        isCurrent && 'border-primary ring-1 ring-primary/20',
        isComplete && 'border-border',
        state === 'upcoming' && 'border-border/70 opacity-80',
      )}
      aria-current={isCurrent ? 'step' : undefined}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
              isComplete && 'border-success bg-success text-white',
              isCurrent && 'border-primary bg-background text-primary',
              state === 'upcoming' && 'border-muted-foreground/30 text-muted-foreground',
            )}
            aria-hidden
          >
            {isComplete ? <Check className="h-3.5 w-3.5" /> : stepNumber}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {isCurrent && (
                <Badge variant="info" size="sm">
                  Current step
                </Badge>
              )}
              {isComplete && (
                <Badge variant="success" size="sm">
                  Done
                </Badge>
              )}
              {state === 'upcoming' && (
                <Badge variant="muted" size="sm">
                  Up next later
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          </div>
        </div>
        {nextAction ? <div className="flex flex-wrap gap-2">{nextAction}</div> : null}
      </header>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  )
}
