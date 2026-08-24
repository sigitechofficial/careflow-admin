import { ChevronDown } from 'lucide-react'
import { formatDate } from '@/shared/lib/utils'
import { contentHelperClass } from '@/shared/ui/content-section'
import type { CarePlanRecommendation } from '@/features/service-users/initial-assessment/types'

export function CarePlanDeclinedHistory({
  recommendations,
}: {
  recommendations: CarePlanRecommendation[]
}) {
  const declined = recommendations.filter((r) => r.status === 'declined')
  if (declined.length === 0) return null

  return (
    <details className="group rounded border border-border/80 bg-card">
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs font-medium text-muted-foreground [&::-webkit-details-marker]:hidden"
        data-testid="declined-recommendations-toggle"
      >
        <span>
          View declined recommendations ({declined.length})
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <ul className="space-y-2 border-t border-border/80 px-3 py-2" data-testid="declined-recommendations-list">
        {declined.map((rec) => (
          <li key={rec.id} className="text-xs">
            <p className="font-medium text-foreground">
              {rec.carePathwayFormName || rec.title}
            </p>
            {rec.declineReason ? (
              <p className={contentHelperClass}>Reason: {rec.declineReason}</p>
            ) : null}
            {rec.decidedAt ? (
              <p className={contentHelperClass}>Declined {formatDate(rec.decidedAt)}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </details>
  )
}
