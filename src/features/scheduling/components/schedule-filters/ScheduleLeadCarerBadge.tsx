import { Crown } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'

type Props = {
  className?: string
}

/** Compact badge for the lead carer on a double-up (or multi-carer) visit. */
export function ScheduleLeadCarerBadge({ className }: Props) {
  return (
    <Badge
      variant="warning"
      size="sm"
      className={cn('gap-0.5 font-semibold', className)}
      title="Lead carer"
    >
      <Crown className="h-2.5 w-2.5" aria-hidden />
      Lead
    </Badge>
  )
}
