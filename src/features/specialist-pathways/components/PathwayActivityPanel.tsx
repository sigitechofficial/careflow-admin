import { CalendarClock } from 'lucide-react'
import { Card, CardContent } from '@/shared/ui/card'
import { fmtDateTime } from '@/features/specialist-pathways/pathway-labels'
import type { PathwayCase } from '@/features/specialist-pathways/types/specialist-pathway.types'

/** Dot colour for a timeline event, by its action text. */
function eventTone(action: string): string {
  const a = action.toLowerCase()
  if (a.includes('approved') || a.includes('reopened')) return 'bg-emerald-500'
  if (a.includes('closed') || a.includes('returned')) return 'bg-red-500'
  if (a.startsWith('risk')) return 'bg-orange-500'
  if (a.startsWith('review')) return 'bg-indigo-500'
  if (a.includes('care plan')) return 'bg-violet-500'
  if (a.includes('opened')) return 'bg-sky-500'
  return 'bg-muted-foreground'
}

export function PathwayActivityPanel({ caseData }: { caseData: PathwayCase }) {
  const events = caseData.events
  return (
    <Card data-testid="pathway-activity-panel">
      <CardContent className="py-5">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ol className="relative ml-1.5 flex flex-col gap-5 border-l border-border pl-6">
            {events.map(ev => (
              <li key={ev.id} className="relative">
                <span
                  className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-card ${eventTone(ev.action)}`}
                  aria-hidden
                />
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <p className="text-sm font-medium">{ev.action}</p>
                  <p className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" aria-hidden />
                    {fmtDateTime(ev.at)}
                    {ev.userName && <span> · {ev.userName}</span>}
                  </p>
                </div>
                {ev.note && <p className="mt-1 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{ev.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
