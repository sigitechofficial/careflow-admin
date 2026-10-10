import * as React from 'react'
import { AlertCircle, Loader2, Mic, Pause, Play } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useVisitVoiceNoteAudio } from '@/features/scheduling/hooks/useVisitVoiceNoteAudio'
import type { VisitVoiceNote } from '@/features/scheduling/types/visit-voice-note.types'

function formatClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00'
  const s = Math.floor(totalSeconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * WhatsApp-style player for a carer voice note. The audio is behind a
 * permission-checked endpoint, so it is fetched with the bearer token on the
 * first ▶ (not on render) and played from an object URL revoked on unmount.
 */
export function VoiceNotePlayer({
  voiceNote,
  className,
}: {
  voiceNote: VisitVoiceNote
  className?: string
}) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const { src, load } = useVisitVoiceNoteAudio(voiceNote)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [playing, setPlaying] = React.useState(false)
  const [current, setCurrent] = React.useState(0)
  const [mediaDuration, setMediaDuration] = React.useState<number | null>(null)

  const knownDuration = voiceNote.durationMs != null ? voiceNote.durationMs / 1000 : null
  // Some m4a files report Infinity/NaN until fully read — fall back to the recorded length.
  const duration =
    mediaDuration != null && Number.isFinite(mediaDuration) && mediaDuration > 0
      ? mediaDuration
      : (knownDuration ?? 0)

  // New recording on the same row → reset the player (the hook drops the old audio).
  React.useEffect(() => {
    const audio = audioRef.current
    audio?.pause()
    audio?.removeAttribute('src')
    setPlaying(false)
    setCurrent(0)
    setMediaDuration(null)
    setError(null)
  }, [voiceNote.id])

  async function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      return
    }
    setError(null)
    try {
      if (!src) {
        setLoading(true)
        audio.src = await load()
      }
      await audio.play()
    } catch {
      setError('Could not play this voice note.')
    } finally {
      setLoading(false)
    }
  }

  function seek(next: number) {
    const audio = audioRef.current
    if (!audio || !src) return
    audio.currentTime = next
    setCurrent(next)
  }

  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0

  return (
    <div
      className={cn(
        'mt-2 flex w-full max-w-sm items-center gap-3 rounded-full border border-border bg-muted/50 py-1.5 pl-1.5 pr-4',
        className,
      )}
      data-testid="voice-note-player"
    >
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : playing ? (
          <Pause className="h-4 w-4" aria-hidden />
        ) : (
          <Play className="ml-0.5 h-4 w-4" aria-hidden />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Mic className="h-3 w-3" aria-hidden />
          Voice note
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(current, duration || 0)}
          disabled={!src}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek voice note"
          className="mt-1 h-1 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary disabled:cursor-default"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) ${progress}%, hsl(var(--border)) ${progress}%)`,
          }}
        />
        {error ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" aria-hidden />
            {error}
          </p>
        ) : null}
      </div>

      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {playing || current > 0 ? formatClock(current) : formatClock(duration)}
      </span>

      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          setCurrent(0)
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setMediaDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setMediaDuration(e.currentTarget.duration)}
        className="hidden"
      />
    </div>
  )
}
