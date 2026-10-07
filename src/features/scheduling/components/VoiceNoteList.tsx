import { cn } from '@/shared/lib/utils'
import { VoiceNotePlayer } from '@/features/scheduling/components/VoiceNotePlayer'
import type { VisitVoiceNote } from '@/features/scheduling/types/visit-voice-note.types'

/** Stacked carer voice note players; renders nothing when there are none. */
export function VoiceNoteList({
  voiceNotes,
  label,
  className,
}: {
  voiceNotes: VisitVoiceNote[] | null | undefined
  /** Optional small caption above the players, e.g. "Carer voice notes". */
  label?: string
  className?: string
}) {
  if (!voiceNotes?.length) return null
  return (
    <div className={cn('mt-2', className)} data-testid="voice-note-list">
      {label ? <p className="text-xs text-muted-foreground">{label}</p> : null}
      <div className={cn('flex flex-col gap-2', label && 'mt-1')}>
        {voiceNotes.map((note) => (
          <VoiceNotePlayer key={note.id} voiceNote={note} className="mt-0" />
        ))}
      </div>
    </div>
  )
}
