import { Badge } from '@/shared/ui/badge'

/** Staff review status as worked out by the API from the dates (never stale). */
const REVIEW_STATUS_DISPLAY: Record<
  string,
  { label: string; variant: 'destructive' | 'warning' | 'secondary' | 'success' }
> = {
  OVERDUE: { label: 'Overdue', variant: 'destructive' },
  DUE_SOON: { label: 'Due soon', variant: 'warning' },
  SCHEDULED: { label: 'Scheduled', variant: 'secondary' },
  COMPLETED: { label: 'Completed', variant: 'success' },
}

export function ReviewStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>
  const display = REVIEW_STATUS_DISPLAY[status]
  return (
    <Badge variant={display?.variant ?? 'secondary'} size="sm" data-testid="review-status">
      {display?.label ?? status}
    </Badge>
  )
}
