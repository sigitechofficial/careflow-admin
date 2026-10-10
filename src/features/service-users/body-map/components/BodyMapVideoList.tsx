import * as React from 'react'
import { Film, Play } from 'lucide-react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import type { BodyMapVideo } from '@/features/service-users/body-map/types'

function apiUrl(path: string): string {
  return /^https?:\/\//i.test(path) ? path : `${getApiBaseUrl()}${path}`
}

export function formatVideoDuration(ms: number | null | undefined): string | null {
  if (ms == null) return null
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function formatVideoSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`
}

function videoMeta(video: BodyMapVideo): string {
  return [
    formatVideoDuration(video.durationMs),
    formatVideoSize(video.fileSize),
    video.source === 'camera' ? 'Recorded' : video.source === 'gallery' ? 'From phone' : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

type Props = {
  videos?: BodyMapVideo[] | null
  label?: string
}

/** Carer body map video: thumbnail with play overlay; click opens a player (seekable). */
export function BodyMapVideoList({ videos, label = 'Video' }: Props) {
  const items = videos ?? []
  const [playing, setPlaying] = React.useState<BodyMapVideo | null>(null)
  if (items.length === 0) return null

  return (
    <div className="mt-2" data-testid="body-map-videos">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <ul className="mt-1.5 space-y-2">
        {items.map(video => (
          <li key={video.id}>
            <button
              type="button"
              onClick={() => setPlaying(video)}
              className="flex w-full items-center gap-3 rounded-md border border-border bg-background p-2 text-left hover:bg-muted/40"
              aria-label={`Play video ${video.originalName ?? ''}`.trim()}
            >
              <VideoThumb video={video} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {video.originalName ?? 'Body map video'}
                </span>
                <span className="block text-xs text-muted-foreground">{videoMeta(video)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <VideoPlayerDialog video={playing} onClose={() => setPlaying(null)} />
    </div>
  )
}

function VideoThumb({ video }: { video: BodyMapVideo }) {
  const [failed, setFailed] = React.useState(false)
  const src = video.thumbnailUrl && !failed ? apiUrl(video.thumbnailUrl) : null
  return (
    <span className="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <Film className="h-6 w-6 text-muted-foreground" aria-hidden />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="rounded-full bg-black/55 p-1.5">
          <Play className="h-4 w-4 fill-white text-white" aria-hidden />
        </span>
      </span>
    </span>
  )
}

function VideoPlayerDialog({ video, onClose }: { video: BodyMapVideo | null; onClose: () => void }) {
  const [failed, setFailed] = React.useState(false)
  React.useEffect(() => setFailed(false), [video?.id])
  return (
    <Dialog open={video != null} onOpenChange={open => (open ? undefined : onClose())}>
      <DialogContent size="lg">
        {video ? (
          <>
            <DialogHeader>
              <DialogTitle className="truncate">{video.originalName ?? 'Body map video'}</DialogTitle>
              <DialogDescription>
                {videoMeta(video)} · uploaded {formatOrganisationDateTime(video.createdAt)}
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              {failed ? (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  This video could not be loaded. Close and reopen the record to try again.
                </p>
              ) : (
                <video
                  key={video.id}
                  data-testid="body-map-video-player"
                  src={apiUrl(video.videoUrl)}
                  poster={video.thumbnailUrl ? apiUrl(video.thumbnailUrl) : undefined}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  onError={() => setFailed(true)}
                  className="max-h-[70vh] w-full rounded-md bg-black"
                />
              )}
            </DialogBody>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
