import { useQuery } from '@tanstack/react-query'
import { MessageSquareText } from 'lucide-react'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { formatOrganisationDate, formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { cn } from '@/shared/lib/utils'

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

const KIND_LABEL: Record<PreviousVisitNotes['notes'][number]['kind'], string> = {
  visit_note: 'Note',
  handover: 'Handover',
  concern: 'Concern',
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
          {data.notes.map((n, i) => (
            <li key={i} className={cn('rounded-md border p-2 text-sm', n.kind === 'concern' ? 'border-warning/40 bg-warning/5' : 'border-border')}>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{KIND_LABEL[n.kind]}</span> · {n.title} · {formatOrganisationDateTime(n.at)}
              </p>
              <p className="mt-1 whitespace-pre-wrap">{n.text}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
