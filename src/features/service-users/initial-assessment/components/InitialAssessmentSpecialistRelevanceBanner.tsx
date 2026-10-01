import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { cn, formatDate } from '@/shared/lib/utils'
import {
  IA_CALLOUT_AMBER_CLASS,
  IA_CALLOUT_NEUTRAL_CLASS,
  IA_CALLOUT_TEAL_CLASS,
  IA_HINT_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import {
  overrideNeedsReason,
  type SpecialistOverride,
  type SpecialistRelevance,
  type SpecialistStatus,
} from '@/features/service-users/initial-assessment/utils/specialist-relevance-rules'

export const SPECIALIST_STATUS_LABEL: Record<SpecialistStatus, string> = {
  required: 'Required',
  suggested: 'Suggested',
  not_needed: 'Not needed',
  pending: 'Screening pending',
}

const STATUS_CLASS: Record<SpecialistStatus, string> = {
  required: IA_CALLOUT_AMBER_CLASS,
  suggested: IA_CALLOUT_TEAL_CLASS,
  not_needed: IA_CALLOUT_NEUTRAL_CLASS,
  pending: IA_CALLOUT_NEUTRAL_CLASS,
}

type Props = {
  relevance: SpecialistRelevance & { overridden?: SpecialistOverride; computed?: SpecialistRelevance }
  disabled?: boolean
  onOverride: (next: SpecialistOverride['status'] | null, reason?: string) => void
}

/**
 * Top of a specialist tab: whether the Core IA screening makes it Required / Suggested / Not needed /
 * Screening pending, why, and an override. Downgrading a trigger needs a reason (kept with who / when).
 */
export function InitialAssessmentSpecialistRelevanceBanner({ relevance, disabled, onOverride }: Props) {
  const [choosing, setChoosing] = React.useState<SpecialistOverride['status'] | null>(null)
  const [reason, setReason] = React.useState('')
  const computed = relevance.computed ?? relevance
  const needsReason = choosing ? overrideNeedsReason(computed.status, choosing) : false
  const override = relevance.overridden

  const confirm = () => {
    if (!choosing) return
    if (needsReason && !reason.trim()) return
    onOverride(choosing, reason.trim() || undefined)
    setChoosing(null)
    setReason('')
  }

  return (
    <div className={cn(STATUS_CLASS[relevance.status], 'mb-4 text-sm')} data-testid="ia-specialist-relevance">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold" data-testid="ia-specialist-status">
            {SPECIALIST_STATUS_LABEL[relevance.status]}
          </p>
          {relevance.status === 'pending' && relevance.pendingHint ? (
            <p>{relevance.pendingHint}</p>
          ) : relevance.reasons.length ? (
            <p>{relevance.reasons.join(' · ')}</p>
          ) : null}
          {override ? (
            <p className={IA_HINT_CLASS} data-testid="ia-specialist-override">
              Changed from {SPECIALIST_STATUS_LABEL[computed.status].toLowerCase()} by {override.byName ?? 'a user'}
              {override.at ? ` on ${formatDate(override.at)}` : ''}.
            </p>
          ) : null}
        </div>
        {!disabled ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            {override ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onOverride(null)}>
                Use screening result
              </Button>
            ) : null}
            {relevance.status !== 'not_needed' ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setChoosing('not_needed')}>
                Mark not needed
              </Button>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={() => setChoosing('required')}>
                Complete anyway
              </Button>
            )}
          </div>
        ) : null}
      </div>
      {choosing ? (
        <div className="mt-3 space-y-2" data-testid="ia-specialist-override-form">
          {needsReason ? (
            <>
              <p className="font-medium">Why is this not needed? (required — kept in the audit trail)</p>
              <textarea
                className="min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-label="Reason this assessment is not needed"
                data-testid="ia-specialist-override-reason"
              />
            </>
          ) : (
            <p className={IA_HINT_CLASS}>
              {choosing === 'required' ? 'This assessment will be treated as needed.' : 'No reason needed.'}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={needsReason && !reason.trim()} onClick={confirm}>
              Confirm
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setChoosing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
