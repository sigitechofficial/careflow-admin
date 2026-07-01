import * as React from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { usePortalProfile, useUploadPortalPhoto } from '@/features/service-user-portal/hooks/usePortalAboutMe'
import { formatPortalDateTime } from '@/features/service-user-portal/components/portal-display.util'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/toggle-controls'

const PHOTO_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'] as const

export default function PortalPhotosPage() {
  const { data, isLoading } = usePortalProfile()
  const upload = useUploadPortalPhoto()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [setAsProfile, setSetAsProfile] = React.useState(false)

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading photos…</p>
  }

  const photos = data.photos ?? []

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!PHOTO_ACCEPT.includes(file.type as (typeof PHOTO_ACCEPT)[number])) {
      toastError('Invalid file', 'Please use JPEG, PNG, or WebP.')
      return
    }

    try {
      await upload.mutateAsync({ file, setAsProfile })
      toastSuccess('Photo uploaded', setAsProfile ? 'Your profile photo was updated.' : 'Photo added to your record.')
      setSetAsProfile(false)
    } catch (err) {
      toastApiError(err, 'Upload failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Photos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Photos on your care record. Upload JPEG, PNG, or WebP images.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={setAsProfile}
              onCheckedChange={v => setSetAsProfile(v === true)}
              disabled={upload.isPending}
            />
            Set as profile photo
          </label>
          <Button
            type="button"
            className="gap-1.5"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {upload.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden />
            )}
            Add photo
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={PHOTO_ACCEPT.join(',')}
            className="sr-only"
            onChange={e => void onFileChange(e)}
          />
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center">
          <ImagePlus className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden />
          <p className="mt-3 text-sm text-muted-foreground">No photos on your record yet.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 gap-1.5"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" aria-hidden />
            Upload your first photo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {photos.map(p => {
            const src = resolveMediaUrl(p.fileUrl, p.uploadedAt)
            return (
              <figure
                key={p.id}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              >
                {src ? (
                  <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
                    <img
                      src={src}
                      alt={p.originalName ?? 'Photo'}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-muted text-sm text-muted-foreground">
                    Unavailable
                  </div>
                )}
                <figcaption className="flex min-h-[3.25rem] flex-col justify-center gap-1 border-t border-border p-3">
                  <p className="text-sm text-foreground">{formatPortalDateTime(p.uploadedAt)}</p>
                  {p.isProfilePhoto ? (
                    <span className="inline-block w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      Profile photo
                    </span>
                  ) : null}
                </figcaption>
              </figure>
            )
          })}
        </div>
      )}
    </div>
  )
}
