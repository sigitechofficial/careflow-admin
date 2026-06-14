import { AlertTriangle, CalendarClock } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { formatDate } from '@/shared/lib/utils'
import type { CarePlanReviewState } from '@/features/service-users/care-plans/types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip'

type Props = {
  review?: CarePlanReviewState | null
  compact?: boolean
}

export function CarePlanReviewBadge({ review, compact }: Props) {
  if (!review || review.status === 'none') return null

  if (review.status === 'overdue') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="gap-1 text-xs font-normal">
              <AlertTriangle className="h-3 w-3" />
              Review overdue
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p>
              Scheduled review was due{' '}
              {review.nextReviewDueAt ? formatDate(review.nextReviewDueAt) : '—'}.
            </p>
            {review.guidanceSummary ? (
              <p className="mt-1 text-muted-foreground">{review.guidanceSummary}</p>
            ) : null}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (review.status === 'due_soon') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="warning" className="gap-1 text-xs font-normal">
              <CalendarClock className="h-3 w-3" />
              Review due soon
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p>
              Next review{' '}
              {review.nextReviewDueAt ? formatDate(review.nextReviewDueAt) : '—'}.
            </p>
            {review.guidanceSummary ? (
              <p className="mt-1 text-muted-foreground">{review.guidanceSummary}</p>
            ) : null}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (review.status === 'ok' && review.nextReviewDueAt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-xs font-normal text-muted-foreground">
              <CalendarClock className="h-3 w-3" />
              {compact
                ? `Due ${formatDate(review.nextReviewDueAt)}`
                : `Next review ${formatDate(review.nextReviewDueAt)}`}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            {review.guidanceSummary ? (
              <p className="text-muted-foreground">{review.guidanceSummary}</p>
            ) : null}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return null
}
