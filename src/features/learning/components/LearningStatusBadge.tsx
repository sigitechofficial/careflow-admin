import { Badge, type BadgeProps } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'

export function formatLearningLabel(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  if (trimmed.includes(' ') && trimmed !== trimmed.toUpperCase()) return trimmed
  return trimmed
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

const STATUS_VARIANTS: Record<string, BadgeProps['variant']> = {
  COMPLIANT: 'success',
  COMPLETED: 'success',
  ACTIVE: 'success',
  PUBLISHED: 'success',
  APPROVED: 'success',
  VERIFIED: 'success',
  ATTENDED: 'success',
  CONFIRMED: 'success',

  DRAFT: 'warning',
  PENDING: 'warning',
  NOT_STARTED: 'warning',
  IN_PROGRESS: 'info',
  ASSIGNED: 'info',
  AWAITING_ASSESSMENT: 'warning',
  AWAITING_APPROVAL: 'warning',
  DUE_SOON: 'warning',
  SCHEDULED: 'info',
  SUBMITTED: 'warning',

  OVERDUE: 'destructive',
  NON_COMPLIANT: 'destructive',
  EXPIRED: 'destructive',
  REVOKED: 'destructive',
  REJECTED: 'destructive',
  CANCELLED: 'muted',
  ARCHIVED: 'muted',
  EXEMPT: 'muted',
  NOT_ASSIGNED: 'secondary',
}

function variantForStatus(status: string): BadgeProps['variant'] {
  const key = status.trim().toUpperCase().replace(/\s+/g, '_')
  return STATUS_VARIANTS[key] ?? 'secondary'
}

export function LearningStatusBadge({
  status,
  className,
  size = 'md',
}: {
  status: string
  className?: string
  size?: BadgeProps['size']
}) {
  return (
    <Badge
      variant={variantForStatus(status)}
      size={size}
      className={cn('whitespace-nowrap font-medium normal-case', className)}
    >
      {formatLearningLabel(status)}
    </Badge>
  )
}
