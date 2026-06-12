import { CheckCircle2, MapPinned, ShieldAlert } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'
import type { CareActivationStatus } from '@/features/service-users/initial-assessment/types'
import { formatRichTextForDisplay } from '@/features/service-users/initial-assessment/utils/submission-display'

type Props = {
  careActivation: CareActivationStatus | null | undefined
  serviceUserId?: string
}

export function InitialAssessmentCareActivationPanel({ careActivation, serviceUserId }: Props) {
  if (!careActivation) {
    return (
      <p className="text-sm text-muted-foreground">Care activation status unavailable.</p>
    )
  }

  const { eligible, approvedForCareStart, blockers, careStartConditions } = careActivation

  return (
    <div
      className={cn(
        'rounded-xl border p-4 shadow-sm',
        eligible
          ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30'
          : 'border-border bg-card',
      )}
      data-testid="ia-care-activation"
    >
      <div className="flex items-start gap-3">
        {eligible ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Care package activation</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {eligible
              ? 'This assessment meets the requirements to activate the care package.'
              : 'Care cannot start until all blockers are resolved and a manager approves care start.'}
          </p>
          <p className="mt-2 text-sm">
            Manager approved care start:{' '}
            <strong>{approvedForCareStart ? 'Yes' : 'No'}</strong>
          </p>
          {careStartConditions ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Conditions: {formatRichTextForDisplay(careStartConditions)}
            </p>
          ) : null}
          {blockers.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-amber-950 dark:text-amber-100">
              {blockers.map((b) => (
                <li key={b} className="flex gap-2">
                  <span aria-hidden>•</span>
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
          {eligible && approvedForCareStart && serviceUserId ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-white/70 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
              <p className="text-xs text-muted-foreground">
                A draft visit plan is created when a manager approves care start. Review the call pattern, activate the
                plan, then generate rota visits.
              </p>
              <Link
                to="/service-users/$serviceUserId/visit-plan"
                params={{ serviceUserId }}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
              >
                <MapPinned className="h-4 w-4" aria-hidden />
                Open Visit Plan
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
