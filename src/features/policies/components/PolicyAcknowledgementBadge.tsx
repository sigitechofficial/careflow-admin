import { Badge, type BadgeProps } from '@/shared/ui/badge'
import type { PolicyAcknowledgementStatus } from '@/features/policies/types/policy.types'

export const ACKNOWLEDGEMENT_STATUS_LABEL: Record<PolicyAcknowledgementStatus, string> = {
  PENDING: 'Not opened',
  VIEWED: 'Opened, not acknowledged',
  ACKNOWLEDGED: 'Acknowledged',
}

const VARIANT: Record<PolicyAcknowledgementStatus, BadgeProps['variant']> = {
  PENDING: 'muted',
  VIEWED: 'info',
  ACKNOWLEDGED: 'success',
}

/** Read-and-acknowledge status, plus an Overdue badge when past the due date. */
export function PolicyAcknowledgementBadge({
  status,
  overdue,
  size = 'md',
}: {
  status: PolicyAcknowledgementStatus
  overdue?: boolean
  size?: BadgeProps['size']
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1" data-testid="policy-acknowledgement-badge">
      <Badge variant={VARIANT[status]} size={size} className="whitespace-nowrap font-medium normal-case">
        {ACKNOWLEDGEMENT_STATUS_LABEL[status]}
      </Badge>
      {overdue ? (
        <Badge variant="destructive" size={size} className="whitespace-nowrap font-medium normal-case">
          Overdue
        </Badge>
      ) : null}
    </span>
  )
}
