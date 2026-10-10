/** Carer voice note on a visit note / handover / concern (admin visit timeline). */
export type VisitVoiceNote = {
  id: string
  clientVoiceNoteId: string
  durationMs: number | null
  mimeType: string
  sizeBytes: number
  recordedAt: string | null
  /** Permission-checked API path — fetch with the bearer token, never a plain src. */
  downloadUrl: string
}

/** Carer-app record a voice note group belongs to. */
export type VisitVoiceNoteEntryType =
  | 'visit_note'
  | 'handover'
  | 'concern'
  | 'incident'
  | 'task'
  | 'medication'
  | 'observation'
  | 'body_map'
  | 'body_map_review'
  | 'check_in'
  | 'clock_out'
  | 'unable_to_start'
  | 'check_in_request'
  | 'sos'

/**
 * Voice notes recorded against one carer-app record on a visit.
 * `entryId` is the carer-app record id; `sourceType`/`sourceId` match the
 * server record (and timeline row) when one exists.
 */
export type VisitVoiceNoteGroup = {
  entryType: VisitVoiceNoteEntryType
  label: string
  entryId: string
  timelineEventId: string | null
  sourceType: string | null
  sourceId: string | null
  /** entryType 'incident': the Incident register row id. */
  registerIncidentId: string | null
  voiceNotes: VisitVoiceNote[]
}

export type VisitVoiceNotesResponse = { jobId: string; groups: VisitVoiceNoteGroup[] }
