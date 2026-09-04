import { cn } from '@/shared/lib/utils'
import type { PolicyStatus } from '@/features/policies/types/policy.types'

const STEPS: Array<{ status: PolicyStatus; label: string }> = [
  { status: 'DRAFT', label: 'Draft' },
  { status: 'IN_REVIEW', label: 'In review' },
  { status: 'APPROVED', label: 'Approved' },
  { status: 'PUBLISHED', label: 'Published' },
]

function stepIndex(status: PolicyStatus): number {
  if (status === 'IN_REVIEW') return 1
  if (status === 'APPROVED') return 2
  if (status === 'PUBLISHED' || status === 'SUPERSEDED' || status === 'ARCHIVED') return 3
  return 0
}

export function PolicyWorkflowStepper({ status }: { status: PolicyStatus }) {
  const current = stepIndex(status)
  const approvedNotLive = status === 'APPROVED'

  return (
    <div className="space-y-1.5" data-testid="policy-workflow-stepper">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {STEPS.map((step, index) => {
          const complete = index < current
          const active = index === current
          return (
            <li key={step.status} className="flex items-center gap-2">
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
                  !active && !complete && 'text-muted-foreground/70',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
      {approvedNotLive ? (
        <p className="text-xs text-muted-foreground" data-testid="policy-approved-not-live">
          Approved but not yet live
        </p>
      ) : null}
    </div>
  )
}
