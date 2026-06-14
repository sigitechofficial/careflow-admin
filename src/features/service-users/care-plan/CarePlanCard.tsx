import { ClipboardList } from 'lucide-react'
import { CarePlanReviewBadge } from '@/features/service-users/care-plans/components/CarePlanReviewBadge'
import type { CarePlanInstanceDisplayStatus, CarePlanReviewState } from '@/features/service-users/care-plans/types'
import { StandardIconImage } from '@/shared/ui/standard-icon-image'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'

function statusBadgeVariant(
  displayStatus: CarePlanInstanceDisplayStatus | undefined,
): 'success' | 'warning' | 'secondary' | 'outline' {
  switch (displayStatus) {
    case 'PUBLISHED':
      return 'success'
    case 'PUBLISHED_WITH_DRAFT':
      return 'secondary'
    case 'DRAFT':
      return 'warning'
    default:
      return 'outline'
  }
}

/** Care plan tile — matches Care 20:20 Figma inactive care plan cards (node 354-10508). */
export function CarePlanCard({
  title,
  pictureUrl,
  onOpen,
  statusLabel,
  displayStatus,
  review,
}: {
  title: string
  pictureUrl?: string | null
  onOpen: () => void
  statusLabel?: string | null
  displayStatus?: CarePlanInstanceDisplayStatus
  review?: CarePlanReviewState | null
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex min-h-[4.75rem] w-full flex-col items-stretch rounded border border-[#c5cdd6] bg-white p-2 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06)]',
        'transition-[border-color,box-shadow] hover:border-[#0d9488] hover:shadow-[0_2px_6px_rgba(13,148,136,0.15)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]/40',
      )}
      data-testid={`care-plan-card-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="flex flex-1 items-center gap-2.5">
        <div className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center">
          {pictureUrl ? (
            <StandardIconImage
              src={pictureUrl}
              label={title}
              className="h-[3.25rem] w-[3.25rem]"
              imgClassName="h-[3.25rem] w-[3.25rem]"
            />
          ) : (
            <ClipboardList
              className="h-9 w-9 text-[#94a3b8] group-hover:text-[#0d9488]"
              strokeWidth={1.25}
            />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[13px] font-normal leading-snug text-[#1e293b]">{title}</p>
          {statusLabel || review ? (
            <div className="flex flex-wrap items-center gap-1">
              {statusLabel ? (
                <Badge variant={statusBadgeVariant(displayStatus)} size="sm" className="font-normal">
                  {statusLabel}
                </Badge>
              ) : null}
              <CarePlanReviewBadge review={review} compact />
            </div>
          ) : null}
        </div>
      </div>
    </button>
  )
}
