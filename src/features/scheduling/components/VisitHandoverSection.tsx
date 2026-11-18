import { ArrowRightLeft, NotebookPen } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatOpsClockTime } from '@/shared/lib/operational-day.util'
import { useVisitTimeline } from '@/features/scheduling/hooks/useVisitVoiceNotes'
import { VoiceNotePlayer } from '@/features/scheduling/components/VoiceNotePlayer'
import type { VisitTimelineItem } from '@/features/scheduling/api/scheduling.api'

/**
 * Handovers, visit notes and concerns written on a visit, as clear cards:
 * - Overview › "Notes from this visit": this visit's handovers first, then notes and concerns.
 * - Log tab › "Handover": this visit's handovers only, above the timeline.
 * - Overview › "Notes from the last visit" uses the same card (VisitPreviousNotesSection).
 * The rows also stay in the Log timeline in time order.
 */
export type VisitNoteKind = 'handover' | 'visit_note' | 'concern'

export type VisitNoteCardData = {
  id: string
  kind: VisitNoteKind
  title: string
  highPriority: boolean
  text: string
  outstandingAction: string | null
  author: string | null
  at: string | null
  voiceNotes: NonNullable<VisitTimelineItem['voiceNotes']>
}

const HIGH_PRIORITY = /^⚠\s*High priority$/i
const OUTSTANDING = /^Outstanding action:\s*/i
const KIND_ORDER: Record<VisitNoteKind, number> = { handover: 0, concern: 1, visit_note: 2 }

/** A handover's text is "⚠ High priority\n<text>\nOutstanding action: <action>" (each line optional). */
export function splitHandoverText(detail: string | null | undefined): {
  highPriority: boolean
  text: string
  outstandingAction: string | null
} {
  const lines = String(detail ?? '').split('\n')
  const actionLine = lines.find((l) => OUTSTANDING.test(l.trim()))
  return {
    highPriority: lines.some((l) => HIGH_PRIORITY.test(l.trim())),
    text: lines
      .filter((l) => !HIGH_PRIORITY.test(l.trim()) && !OUTSTANDING.test(l.trim()))
      .join('\n')
      .trim(),
    outstandingAction: actionLine ? actionLine.trim().replace(OUTSTANDING, '').trim() || null : null,
  }
}

export function toVisitNoteCard(item: VisitTimelineItem): VisitNoteCardData {
  const kind = item.type as VisitNoteKind
  const parts =
    kind === 'handover'
      ? splitHandoverText(item.detail)
      : { highPriority: false, text: String(item.detail ?? '').trim(), outstandingAction: null }
  return {
    id: item.id,
    kind,
    title: item.title,
    ...parts,
    author: item.author?.label ?? item.author?.name ?? null,
    at: item.occurredAt ?? null,
    voiceNotes: item.voiceNotes ?? [],
  }
}

/** Handovers first, then concerns, then notes; each group oldest first. */
export function visitNoteCards(timeline: VisitTimelineItem[], kinds: VisitNoteKind[]): VisitNoteCardData[] {
  return timeline
    .filter((item) => (kinds as string[]).includes(item.type))
    .map(toVisitNoteCard)
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
}

export function VisitNoteCard({ note }: { note: VisitNoteCardData }) {
  return (
    <li
      className={cn(
        'rounded-md border p-2 text-sm',
        note.highPriority || note.kind === 'concern'
          ? 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40'
          : note.kind === 'handover'
            ? 'border-primary/30 bg-primary/5'
            : 'border-border',
      )}
    >
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{note.title}</span>
        {note.highPriority ? (
          <span className="rounded bg-amber-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">High priority</span>
        ) : null}
        <span>
          {note.author ? `${note.author} · ` : ''}
          {note.at ? formatOpsClockTime(note.at) : ''}
        </span>
      </p>
      {note.text ? <p className="mt-1 whitespace-pre-wrap">{note.text}</p> : null}
      {note.outstandingAction ? (
        <p className="mt-1.5 rounded border border-amber-300/70 bg-background px-2 py-1 text-xs dark:border-amber-800">
          <span className="font-semibold">Outstanding action: </span>
          {note.outstandingAction}
        </p>
      ) : null}
      {note.voiceNotes.map((v) => (
        <VoiceNotePlayer key={v.id} voiceNote={v} className="mt-1.5" />
      ))}
    </li>
  )
}

/** Overview: everything written on this visit, handovers first. */
export function VisitThisVisitNotesSection({ jobId, className }: { jobId: string; className?: string }) {
  const q = useVisitTimeline(jobId)
  const notes = visitNoteCards(q.data?.timeline ?? [], ['handover', 'concern', 'visit_note'])
  return (
    <section className={cn('p-3', className)} data-testid="visit-this-visit-notes">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <NotebookPen className="h-4 w-4 text-muted-foreground" aria-hidden />
        Notes from this visit
      </h3>
      {q.isLoading ? (
        <p className="mt-2 text-xs text-muted-foreground">Loading…</p>
      ) : q.isError ? (
        <p className="mt-2 text-xs text-muted-foreground">Notes from this visit could not be loaded.</p>
      ) : notes.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No handover, notes or concerns have been written on this visit yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {notes.map((n) => (
            <VisitNoteCard key={n.id} note={n} />
          ))}
        </ul>
      )}
    </section>
  )
}

/** Log tab: this visit's handovers, above the timeline. Hidden when there are none. */
export function VisitHandoverSection({ jobId, className }: { jobId: string; className?: string }) {
  const q = useVisitTimeline(jobId)
  const handovers = visitNoteCards(q.data?.timeline ?? [], ['handover'])
  if (q.isLoading || q.isError || handovers.length === 0) return null
  return (
    <section className={cn('p-3', className)} data-testid="visit-handover-section">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
        Handover
      </h3>
      <ul className="mt-2 space-y-2">
        {handovers.map((h) => (
          <VisitNoteCard key={h.id} note={h} />
        ))}
      </ul>
    </section>
  )
}
