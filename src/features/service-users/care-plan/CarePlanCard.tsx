import { ClipboardList } from 'lucide-react'
import { CarePlanReviewBadge } from '@/features/service-users/care-plans/components/CarePlanReviewBadge'
import type { CarePlanDisplayState } from '@/features/service-users/care-plan/care-plan-display-state'
import { resolveCarePlanCardPictureUrl } from '@/features/service-users/care-plan/care-plan-icon-resolve'
import type { CarePlanInstanceDisplayStatus, CarePlanReviewState } from '@/features/service-users/care-plans/types'
import { StandardIconImage } from '@/shared/ui/standard-icon-image'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'

function statusBadgeVariant(
  displayState?: CarePlanDisplayState,
  displayStatus?: CarePlanInstanceDisplayStatus,
): 'success' | 'warning' | 'secondary' | 'outline' | 'info' {
  if (displayState === 'LIVE' || displayState === 'LIVE_WITH_DRAFT') return 'success'
  if (displayState === 'IN_PROGRESS') return 'info'
  if (displayState === 'RECOMMENDED') return 'warning'
  switch (displayStatus) {
    case 'PUBLISHED':
    case 'PUBLISHED_WITH_DRAFT':
      return 'success'
    case 'DRAFT':
      return 'info'
    default:
      return 'outline'
  }
}

const CARD_SHELL =
  'group flex w-full flex-col items-stretch rounded border p-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-[border-color,box-shadow] hover:border-[#0d9488] hover:shadow-[0_2px_6px_rgba(13,148,136,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/40'

/** Care plan tile — same family as Recommended lifecycle cards. */
export function CarePlanCard({
  title,
  pictureUrl,
  onOpen,
  statusLabel,
  displayStatus,
  displayState,
  review,
  note,
  meta,
  actionLabel,
  secondaryBadge,
  appearance = 'default',
}: {
  title: string
  pictureUrl?: string | null
  onOpen: () => void
  statusLabel?: string | null
  displayStatus?: CarePlanInstanceDisplayStatus
  displayState?: CarePlanDisplayState
  review?: CarePlanReviewState | null
  note?: string | null
  meta?: string | null
  actionLabel?: string | null
  secondaryBadge?: string | null
  appearance?: 'default' | 'available'
}) {
  const iconSrc = resolveCarePlanCardPictureUrl(title, pictureUrl)

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        CARD_SHELL,
        appearance === 'available' ? 'border-[#d5dbe3] bg-[#f8fafc]' : 'border-[#c5cdd6] bg-white',
      )}
      data-testid={`care-plan-card-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          {iconSrc ? (
            <StandardIconImage
              src={iconSrc}
              label={title}
              className="h-10 w-10"
              imgClassName="h-10 w-10"
            />
          ) : (
            <ClipboardList
              className="h-8 w-8 text-[#94a3b8] group-hover:text-[#0d9488]"
              strokeWidth={1.25}
            />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-start justify-between gap-1.5">
            <p className="text-[13px] font-medium leading-snug text-[#1e293b]">{title}</p>
            {statusLabel || secondaryBadge ? (
              <div className="flex flex-wrap items-center gap-1">
                {statusLabel ? (
                  <Badge
                    variant={statusBadgeVariant(displayState, displayStatus)}
                    size="sm"
                    className="font-normal"
                  >
                    {statusLabel}
                  </Badge>
                ) : null}
                {secondaryBadge ? (
                  <Badge variant="info" size="sm" className="font-normal">
                    {secondaryBadge}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>
          <CarePlanReviewBadge review={review} compact />
          {note ? <p className="text-[11px] leading-snug text-muted-foreground">{note}</p> : null}
          {meta ? <p className="text-[11px] leading-snug text-muted-foreground">{meta}</p> : null}
          {actionLabel ? (
            <p
              className={cn(
                'pt-0.5 text-right text-[11px] font-medium',
                appearance === 'available' ? 'text-muted-foreground' : 'text-[#0f766e]',
              )}
            >
              {actionLabel}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  )
}
