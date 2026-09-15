import { Clock } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { TimeSensitiveStatus } from '@/features/scheduling/types/scheduling.types'
import { timeSensitiveClockClass } from '@/features/scheduling/utils/schedule-job-time-sensitive.util'

type Props = {
  status: TimeSensitiveStatus
  title: string
  className?: string
  position?: 'inline' | 'corner'
}

export function TimeSensitiveClock({ status, title, className, position = 'inline' }: Props) {
  return (
    <span
      className={cn(position === 'corner' && 'absolute right-1 top-1 z-[4]', className)}
      title={title}
      aria-label={title}
    >
      <Clock
        className={cn(
          'shrink-0',
          position === 'corner' ? 'h-3 w-3' : 'h-3 w-3',
          timeSensitiveClockClass(status),
        )}
        strokeWidth={2.4}
        aria-hidden
      />
    </span>
  )
}
