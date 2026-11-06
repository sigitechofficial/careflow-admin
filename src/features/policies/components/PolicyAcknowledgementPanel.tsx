import { AlertTriangle, CheckCircle2, BookOpenCheck } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { formatPolicyDate } from '@/features/policies/policy-format'
import type { PolicyAcknowledgementStatus } from '@/features/policies/types/policy.types'

type Props = {
  status: PolicyAcknowledgementStatus
  dueAt: string | null
  overdue: boolean
  acknowledgedAt: string | null
  versionLabel?: string | null
  pending?: boolean
  onAcknowledge: () => void
}

/**
 * Staff read-and-acknowledge panel shown above the policy content (which starts with the
 * "Key points for staff" section).
 */
export function PolicyAcknowledgementPanel({
  status,
  dueAt,
  overdue,
  acknowledgedAt,
  versionLabel,
  pending,
  onAcknowledge,
}: Props) {
  if (status === 'ACKNOWLEDGED') {
    return (
      <div
        id="policy-acknowledgement"
        role="status"
        className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3"
        data-testid="policy-acknowledgement-panel"
      >
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-success">Acknowledged on {formatPolicyDate(acknowledgedAt)}</p>
          <p className="mt-0.5 text-sm text-foreground/80">
            You have confirmed you read and understood this policy
            {versionLabel ? ` (${versionLabel})` : ''}.
          </p>
        </div>
      </div>
    )
  }

  const Icon = overdue ? AlertTriangle : BookOpenCheck
  return (
    <div
      id="policy-acknowledgement"
      role="region"
      aria-label="Read and acknowledge"
      className={cn(
        'flex flex-col gap-3 rounded-lg border px-4 py-4 sm:flex-row sm:items-center sm:justify-between',
        overdue ? 'border-destructive/40 bg-destructive/10' : 'border-warning/40 bg-warning/10',
      )}
      data-testid="policy-acknowledgement-panel"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', overdue ? 'text-destructive' : 'text-warning')} aria-hidden />
        <div className="space-y-1">
          <p className={cn('text-sm font-semibold', overdue ? 'text-destructive' : 'text-foreground')}>
            You need to read and acknowledge this policy by {formatPolicyDate(dueAt)}
            {overdue ? ' — this is now overdue' : ''}
          </p>
          <p className="text-sm text-foreground/80">
            Read the policy below, starting with the key points for staff, then confirm you have read and understood it
            {versionLabel ? ` (${versionLabel})` : ''}.
          </p>
        </div>
      </div>
      <Button
        type="button"
        className="shrink-0"
        onClick={onAcknowledge}
        disabled={pending}
        data-testid="policy-acknowledge-button"
      >
        {pending ? 'Saving…' : 'I have read and understood this policy'}
      </Button>
    </div>
  )
}
