import { cn } from '@/shared/lib/utils'
import {
  INCIDENT_WORKFLOW_STEPS,
  incidentWorkflowStageIndex,
  type IncidentStatus,
} from '@/features/incidents/types'

export function IncidentWorkflowStepper({
  status,
  hasFinalOutcome,
}: {
  status: IncidentStatus
  hasFinalOutcome: boolean
}) {
  const current = incidentWorkflowStageIndex(status, hasFinalOutcome)

  return (
    <div className="space-y-1.5" data-testid="incident-workflow-stepper">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {INCIDENT_WORKFLOW_STEPS.map((step, index) => {
          const complete = index < current
          const active = index === current
          return (
            <li key={step.id} className="flex items-center gap-2">
              {index > 0 ? (
                <span className="text-muted-foreground" aria-hidden>
                  →
                </span>
              ) : null}
              <span
                className={cn(
                  'font-medium',
                  active && 'text-foreground',
                  complete && 'text-muted-foreground',
                  !active && !complete && 'text-muted-foreground',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
      {status === 'AWAITING_CLOSURE' && !hasFinalOutcome ? (
        <p className="text-xs text-muted-foreground">
          Record the outcome, then close the incident.
        </p>
      ) : null}
      {status === 'CLOSED' && !hasFinalOutcome ? (
        <p className="text-xs text-muted-foreground">Closed — outcome still outstanding.</p>
      ) : null}
    </div>
  )
}
