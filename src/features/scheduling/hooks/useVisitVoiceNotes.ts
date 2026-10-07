import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchVisitTimeline, fetchVisitVoiceNotes } from '@/features/scheduling/api/scheduling.api'
import type {
  VisitVoiceNote,
  VisitVoiceNoteEntryType,
  VisitVoiceNoteGroup,
} from '@/features/scheduling/types/visit-voice-note.types'

const NO_GROUPS: VisitVoiceNoteGroup[] = []

function flatten(groups: VisitVoiceNoteGroup[]): VisitVoiceNote[] {
  return groups.flatMap((group) => group.voiceNotes)
}

/**
 * All carer voice notes on a visit, grouped by carer-app record, plus lookups
 * so each admin surface can show the audio next to the matching record's text.
 */
export function useVisitVoiceNotes(jobId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['visit-voice-notes', jobId],
    queryFn: ({ signal }) => fetchVisitVoiceNotes(jobId as string, { signal }),
    enabled: Boolean(jobId),
  })

  const groups = query.data?.groups ?? NO_GROUPS

  return React.useMemo(
    () => ({
      groups,
      /** Voice notes on the server record (timeline sourceType + sourceId). */
      forSource: (sourceType: string, sourceId: string | null | undefined): VisitVoiceNote[] =>
        sourceId
          ? flatten(groups.filter((g) => g.sourceType === sourceType && g.sourceId === sourceId))
          : [],
      /** Voice notes on the carer-app record (entryType + entryId). */
      forEntry: (
        entryType: VisitVoiceNoteEntryType,
        entryId: string | null | undefined,
      ): VisitVoiceNote[] =>
        entryId
          ? flatten(groups.filter((g) => g.entryType === entryType && g.entryId === entryId))
          : [],
      /** Voice notes whose carer-app entry id starts with `prefix` (e.g. body map reviews). */
      byEntryPrefix: (entryType: VisitVoiceNoteEntryType, prefix: string): VisitVoiceNote[] =>
        prefix
          ? flatten(
              groups.filter((g) => g.entryType === entryType && g.entryId.startsWith(prefix)),
            )
          : [],
    }),
    [groups],
  )
}

/** Visit "Log" timeline (same activity list the carer sees in the app). */
export function useVisitTimeline(jobId: string) {
  return useQuery({
    queryKey: ['visit-timeline', jobId],
    queryFn: ({ signal }) => fetchVisitTimeline(jobId, { signal }),
    enabled: Boolean(jobId),
  })
}
