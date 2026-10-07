import * as React from 'react'
import { fetchVisitVoiceNoteObjectUrl } from '@/features/scheduling/api/scheduling.api'
import type { VisitVoiceNote } from '@/features/scheduling/types/visit-voice-note.types'

/**
 * Lazily loads a protected voice note as an object URL (on first play, not on
 * render) and revokes it when the note changes or the component unmounts.
 */
export function useVisitVoiceNoteAudio(voiceNote: Pick<VisitVoiceNote, 'id' | 'downloadUrl'>) {
  const urlRef = React.useRef<string | null>(null)
  const [src, setSrc] = React.useState<string | null>(null)

  const revoke = React.useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = null
  }, [])

  React.useEffect(() => {
    setSrc(null)
    return revoke
  }, [voiceNote.id, revoke])

  const load = React.useCallback(async (): Promise<string> => {
    if (urlRef.current) return urlRef.current
    const url = await fetchVisitVoiceNoteObjectUrl(voiceNote)
    urlRef.current = url
    setSrc(url)
    return url
  }, [voiceNote])

  return { src, load }
}
