import { Badge, type BadgeProps } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import type { PolicyStatus } from '@/features/policies/types/policy.types'

const STATUS_LABELS: Record<PolicyStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  SUPERSEDED: 'Superseded',
  ARCHIVED: 'Archived',
}

const STATUS_VARIANTS: Record<PolicyStatus, BadgeProps['variant']> = {
  DRAFT: 'warning',
  IN_REVIEW: 'info',
  APPROVED: 'warning',
  PUBLISHED: 'success',
  SUPERSEDED: 'muted',
  ARCHIVED: 'muted',
}

export function PolicyStatusBadge({
  status,
  className,
  size = 'md',
}: {
  status: PolicyStatus | string
  className?: string
  size?: BadgeProps['size']
}) {
  const key = status.trim().toUpperCase().replace(/\s+/g, '_') as PolicyStatus
  const label = STATUS_LABELS[key] ?? status.replace(/_/g, ' ')
  return (
    <Badge
      variant={STATUS_VARIANTS[key] ?? 'secondary'}
      size={size}
      className={cn('whitespace-nowrap font-medium normal-case', className)}
      data-testid="policy-status-badge"
    >
      <span className="sr-only">Status: </span>
      {label}
    </Badge>
  )
}
