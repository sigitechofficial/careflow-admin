import type { ComponentProps } from 'react'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import { jobStatusLabel } from '@/features/scheduling/utils/scheduling-format'

type StatusTone = {
  variant: ComponentProps<typeof Badge>['variant']
  className?: string
}

function statusTone(status: string): StatusTone {
  switch (status) {
    case 'DRAFT':
    case 'UNALLOCATED':
    case 'ALLOCATED':
    case 'CONFIRMED':
    case 'PENDING':
      // Planned family — sky so it reads clearly vs completed green
      return {
        variant: 'info',
        className:
          'border-sky-300/70 bg-sky-100 text-sky-950 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100',
      }
    case 'IN_PROGRESS':
      return {
        variant: 'warning',
        className:
          'border-amber-400/80 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100',
      }
    case 'COMPLETED':
      return { variant: 'success' }
    case 'PARTIALLY_COMPLETED':
      return {
        variant: 'warning',
        className:
          'border-orange-300/80 bg-orange-50 text-orange-950 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100',
      }
    case 'MISSED':
    case 'NEEDS_ATTENTION':
      return { variant: 'destructive' }
    case 'CANCELLED':
    case 'CALLED_OFF':
      return { variant: 'muted' }
    default:
      return { variant: 'secondary' }
  }
}

type Props = {
  status: string
  className?: string
}

/** Coloured status pill for schedule list / compact surfaces. */
export function ScheduleJobStatusBadge({ status, className }: Props) {
  const tone = statusTone(status)
  return (
    <Badge
      variant={tone.variant}
      size="sm"
      className={cn('font-semibold', tone.className, className)}
    >
      {jobStatusLabel(status)}
    </Badge>
  )
}
