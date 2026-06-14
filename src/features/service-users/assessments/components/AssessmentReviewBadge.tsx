import { AlertTriangle, CalendarClock, Info } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { formatDate } from '@/shared/lib/utils'
import { formatReviewIntervalLabel } from '@/features/service-users/assessments/assessment-review-schedule'
import type { AssessmentReviewState } from '@/features/service-users/assessments/types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip'

type Props = {
  review?: AssessmentReviewState | null
  compact?: boolean
}

export function AssessmentReviewBadge({ review, compact }: Props) {
  if (!review) return null

  const intervalLabel = formatReviewIntervalLabel(review.effectiveIntervalDays)

  if (review.status === 'not_started') {
    return (
      <Badge variant="outline" className="text-xs font-normal">
        Not yet completed
      </Badge>
    )
  }

  if (review.status === 'event_driven') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1 text-xs font-normal">
              <Info className="h-3 w-3" />
              {compact ? 'Event-driven' : 'Review when needed'}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p className="font-medium">{review.guidanceSource}</p>
            <p className="mt-1 text-muted-foreground">{review.guidanceSummary}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

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
            <p className="mt-1 text-muted-foreground">{review.guidanceSummary}</p>
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
              {review.nextReviewDueAt ? formatDate(review.nextReviewDueAt) : '—'}
              {intervalLabel ? ` (${intervalLabel})` : ''}.
            </p>
            <p className="mt-1 text-muted-foreground">{review.guidanceSummary}</p>
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
            <p>
              {intervalLabel ? `${intervalLabel}. ` : ''}
              Source: {review.guidanceSource}.
            </p>
            <p className="mt-1 text-muted-foreground">{review.guidanceSummary}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return null
}
