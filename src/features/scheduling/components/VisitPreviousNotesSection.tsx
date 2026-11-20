import { useQuery } from '@tanstack/react-query'
import { MessageSquareText } from 'lucide-react'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { cn } from '@/shared/lib/utils'
import {
  splitHandoverText,
  VisitNoteCard,
  type VisitNoteCardData,
} from '@/features/scheduling/components/VisitHandoverSection'

export type PreviousVisitNotes = {
  jobId: string
  visitStart: string
  notes: { kind: 'visit_note' | 'handover' | 'concern'; title: string; text: string; at: string }[]
}

export async function fetchPreviousVisitNotes(jobId: string): Promise<PreviousVisitNotes | null> {
  const res = await apiJson<ApiEnvelope<PreviousVisitNotes | null>>(
    `/scheduled-jobs-housekeeping/jobs/${jobId}/previous-visit-notes`,
  )
  const d = res?.data
  return d && Array.isArray(d.notes) && d.notes.length ? d : null
}

/** Last visit's notes as cards: handovers first (with priority and outstanding action), then concerns, then notes. */
export function previousNoteCards(data: PreviousVisitNotes): VisitNoteCardData[] {
  const order = { handover: 0, concern: 1, visit_note: 2 } as const
  return data.notes
    .map((n, i) => {
      const parts =
        n.kind === 'handover'
          ? splitHandoverText(n.text)
          : { highPriority: false, text: n.text, outstandingAction: null }
      return {
        id: `${data.jobId}-${i}`,
        kind: n.kind,
        title: n.title,
        ...parts,
        author: null,
        at: n.at,
        voiceNotes: [],
      }
    })
    .sort((a, b) => order[a.kind] - order[b.kind])
}

/** Notes, handover and concerns from this person's last visit, at the top of the visit window. */
export function VisitPreviousNotesSection({ jobId, className }: { jobId: string; className?: string }) {
  const q = useQuery({
    queryKey: ['visit-previous-notes', jobId],
    queryFn: () => fetchPreviousVisitNotes(jobId),
    staleTime: 60_000,
    retry: false,
  })
  const data = q.data
  return (
    <section className={cn('p-3', className)} data-testid="visit-previous-notes">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <MessageSquareText className="h-4 w-4 text-muted-foreground" aria-hidden />
        Notes from the last visit
        {data ? <span className="text-xs font-normal text-muted-foreground">{formatOrganisationDate(data.visitStart)}</span> : null}
      </h3>
      {q.isLoading ? (
        <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
      ) : q.isError ? (
        <p className="mt-2 text-xs text-muted-foreground">Notes from the last visit could not be loaded.</p>
      ) : !data ? (
        <p className="mt-2 text-xs text-muted-foreground">No notes were written on earlier visits.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {previousNoteCards(data).map((n) => (
            <VisitNoteCard key={n.id} note={n} />
          ))}
        </ul>
      )}
    </section>
  )
}

export type VisitPurpose = { text: string; source: 'regular' | 'extra' }

export async function fetchVisitPurpose(jobId: string): Promise<VisitPurpose | null> {
  const res = await apiJson<ApiEnvelope<VisitPurpose | null>>(`/scheduled-jobs-housekeeping/jobs/${jobId}/visit-purpose`)
  const d = res?.data
  return d && typeof d.text === 'string' && d.text.trim() ? d : null
}

/** What this visit is for, from the visit plan. Nothing is shown when none was written. */
export function VisitPurposeLine({ jobId, className }: { jobId: string; className?: string }) {
  const q = useQuery({ queryKey: ['visit-purpose', jobId], queryFn: () => fetchVisitPurpose(jobId), staleTime: 60_000, retry: false })
  if (!q.data) return null
  return (
    <p className={cn('rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm', className)} data-testid="visit-purpose">
      <span className="font-medium">{q.data.source === 'extra' ? 'Extra visit: ' : 'Visit for: '}</span>
      {q.data.text}
    </p>
  )
}
