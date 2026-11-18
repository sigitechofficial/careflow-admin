import { ShieldAlert } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatOpsClockTime } from '@/shared/lib/operational-day.util'
import { useVisitTimeline } from '@/features/scheduling/hooks/useVisitVoiceNotes'
import type { VisitTimelineItem } from '@/features/scheduling/api/scheduling.api'

/**
 * Log rows the API writes for arrival and on-site safety (careflow-api visit-safety-timeline.util.ts):
 * how the person was found, a fake (mock) phone location, clocking in outside the area, and leaving the area
 * mid-visit until the office allowed the visit to continue. The same rows appear in the Log tab.
 */
const SAFETY_PREFIXES = ['arrival:', 'mock_location:', 'outside_area:', 'area_lock:', 'area_allow:']

export function isArrivalSafetyItem(item: Pick<VisitTimelineItem, 'sourceId'>): boolean {
  const id = item.sourceId ?? ''
  return SAFETY_PREFIXES.some((p) => id.startsWith(p))
}

const TONE_CARD: Record<string, string> = {
  danger: 'border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40',
  warning: 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
  success: 'border-border',
}

export function VisitArrivalSafetySection({ jobId, className }: { jobId: string; className?: string }) {
  const q = useVisitTimeline(jobId)
  const items = (q.data?.timeline ?? []).filter(isArrivalSafetyItem)
  return (
    <section className={cn('p-3', className)} data-testid="visit-arrival-safety">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden />
        On arrival and on site
      </h3>
      {q.isLoading ? (
        <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
      ) : q.isError ? (
        <p className="mt-2 text-xs text-muted-foreground">This could not be loaded.</p>
      ) : !items.length ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No arrival answers or location warnings were recorded for this visit.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn('rounded-md border p-2 text-sm', TONE_CARD[item.tone ?? ''] ?? 'border-border')}
            >
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{item.title}</span>
                {' · '}
                {item.author?.name ? `${item.author.name} · ` : ''}
                {item.occurredAt ? formatOpsClockTime(item.occurredAt) : item.timeLabel}
              </p>
              {item.detail ? <p className="mt-1 whitespace-pre-wrap">{item.detail}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
