import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatOpsClockTime } from '@/shared/lib/operational-day.util'
import { useVisitTimeline } from '@/features/scheduling/hooks/useVisitVoiceNotes'
import { VisitPhotoThumbnails } from '@/features/scheduling/components/VisitPhotoThumbnails'
import { VoiceNotePlayer } from '@/features/scheduling/components/VoiceNotePlayer'
import { VoiceNoteList } from '@/features/scheduling/components/VoiceNoteList'

/**
 * Every recording has one home in the workspace. These play in their own tab
 * (Tasks, Medication, Observations, Body map) or on Overview (clock in / out,
 * unable to start, SOS) — the Log only plays notes, handovers, concerns,
 * incidents and records with no other home.
 */
const SOURCE_TYPES_PLAYED_ELSEWHERE = new Set([
  'task',
  'medication',
  'observation',
  'body_map',
  'check_in',
  'complete',
])
const ENTRY_TYPES_PLAYED_ELSEWHERE = new Set(['body_map', 'body_map_review', 'sos'])

/** Server placeholder for voice-only entries — redundant once the player shows. */
const VOICE_ONLY_DETAIL = /^(Voice note|\d+ voice notes)( \(\d+:\d{2}\))?$/

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
  const query = useVisitTimeline(jobId)

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading visit log…
      </div>
    )
  }

  const timeline = query.data?.timeline ?? []
  const otherVoiceNotes = (query.data?.otherVoiceNotes ?? []).filter(
    (g) => g.voiceNotes.length > 0 && !ENTRY_TYPES_PLAYED_ELSEWHERE.has(g.entryType),
  )

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Visit log</h3>
        <p className="text-xs text-muted-foreground">
          Same activity timeline the carer sees — clock in/out, tasks, medication, observations,
          visit notes, handovers, concerns and incidents. Times use the organisation operational
          timezone.
        </p>
      </div>

      {timeline.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No visit activity recorded yet.
        </p>
      ) : (
        <ul className="space-y-0">
          {timeline.map((item, index) => {
            const voiceNotes = SOURCE_TYPES_PLAYED_ELSEWHERE.has(item.sourceType)
              ? []
              : (item.voiceNotes ?? [])
            return (
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
                  {item.author ? (
                    <p className="text-xs text-muted-foreground" data-testid="visit-log-author">
                      {item.author.label} · {item.timeLabel || item.time}
                    </p>
                  ) : null}
                  {/* subtitle mirrors detail server-side, so only render detail */}
                  {item.detail && !(voiceNotes.length && VOICE_ONLY_DETAIL.test(item.detail)) ? (
                    <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {item.detail}
                    </p>
                  ) : null}
                  {voiceNotes.map((note) => (
                    <VoiceNotePlayer key={note.id} voiceNote={note} />
                  ))}
                  <VisitPhotoThumbnails photos={item.photos} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {otherVoiceNotes.length > 0 ? (
        <section
          className="space-y-3 border-t border-border/60 pt-3"
          data-testid="visit-log-other-voice-notes"
        >
          <div>
            <h4 className="text-sm font-semibold text-foreground">Other voice notes</h4>
            <p className="text-xs text-muted-foreground">
              Carer voice notes on records that have no row in the log above (check-in request).
            </p>
          </div>
          <ul className="space-y-3">
            {otherVoiceNotes.map((group) => {
              const recordedAt = group.voiceNotes[0]?.recordedAt
              return (
                <li key={`${group.entryType}-${group.entryId}`}>
                  <p className="text-sm font-medium text-foreground">
                    {group.label}
                    {recordedAt ? (
                      <span className="ml-1.5 text-xs font-medium tabular-nums text-muted-foreground">
                        {formatOpsClockTime(recordedAt)}
                      </span>
                    ) : null}
                  </p>
                  <VoiceNoteList voiceNotes={group.voiceNotes} className="mt-1" />
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
