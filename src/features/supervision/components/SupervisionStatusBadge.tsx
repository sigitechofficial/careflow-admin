import { Badge } from '@/shared/ui/badge'
import { SUPERVISION_STATUS_LABELS, type SupervisionSessionStatus } from '@/features/supervision/api'

const VARIANT: Record<SupervisionSessionStatus, 'secondary' | 'info' | 'warning' | 'success' | 'destructive'> = {
  SCHEDULED: 'secondary',
  IN_PROGRESS: 'info',
  AWAITING_SIGN_OFF: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
}

export function SupervisionStatusBadge({ status }: { status: SupervisionSessionStatus }) {
  return (
    <Badge variant={VARIANT[status]} size="sm" data-testid="supervision-status">
      {SUPERVISION_STATUS_LABELS[status]}
    </Badge>
  )
}
