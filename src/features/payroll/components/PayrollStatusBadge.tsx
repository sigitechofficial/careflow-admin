import { Badge } from '@/shared/ui/badge'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  DRAFT: 'secondary',
  ACTIVE: 'success',
  READY: 'success',
  OPEN: 'default',
  IN_RUN: 'warning',
  EMPLOYEES_ENROLLED: 'warning',
  GROSS_CALCULATED: 'success',
  STATUTORY_CALCULATED: 'success',
  CLOSED: 'secondary',
  CANCELLED: 'destructive',
  ARCHIVED: 'secondary',
  SUSPENDED: 'warning',
  SUPERSEDED: 'secondary',
  TERMINATED: 'destructive',
}

export function PayrollStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'default'} className="font-normal">
      {status.replaceAll('_', ' ')}
    </Badge>
  )
}
