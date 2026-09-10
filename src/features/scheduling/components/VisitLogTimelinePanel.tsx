import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { fetchVisitTimeline } from '@/features/scheduling/api/scheduling.api'
import { VisitPhotoThumbnails } from '@/features/scheduling/components/VisitPhotoThumbnails'

/** Tone → dot colour, mirroring the carer-app visit timeline. */
const TONE_DOT: Record<string, string> = {
  success: 'bg-teal-500',
  danger: 'bg-rose-500',
  warning: 'bg-amber-500',
  teal: 'bg-teal-500',
  ink: 'bg-muted-foreground',
  primary: 'bg-indigo-500',
}

/**
 * Visit workspace "Log" tab — the same activity timeline the carer sees in the
 * app (clock in/out, tasks, medication, observations, visit notes, handovers,
 * concerns, incidents), oldest → newest.
 */
export function VisitLogTimelinePanel({ jobId }: { jobId: string }) {
  const query = useQuery({
    queryKey: ['visit-timeline', jobId],
    queryFn: ({ signal }) => fetchVisitTimeline(jobId, { signal }),
    enabled: Boolean(jobId),
  })

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading visit log…
      </div>
    )
  }

  const timeline = query.data?.timeline ?? []

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Visit log</h3>
        <p className="text-xs text-muted-foreground">
          Same activity timeline the carer sees — clock in/out, tasks, medication, observations,
          visit notes, handovers, concerns and incidents.
        </p>
      </div>

      {timeline.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No visit activity recorded yet.
        </p>
      ) : (
        <ul className="space-y-0">
          {timeline.map((item, index) => (
            <li key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                    TONE_DOT[item.tone ?? 'primary'] ?? TONE_DOT.primary,
                  )}
                />
                {index < timeline.length - 1 ? (
                  <span className="w-px flex-1 bg-border" aria-hidden />
                ) : null}
              </div>
              <span className="w-12 shrink-0 pt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {item.timeLabel || item.time}
              </span>
              <div className="min-w-0 flex-1 pb-4">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {/* subtitle mirrors detail server-side, so only render detail */}
                {item.detail ? (
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {item.detail}
                  </p>
                ) : null}
                <VisitPhotoThumbnails photos={item.photos} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
