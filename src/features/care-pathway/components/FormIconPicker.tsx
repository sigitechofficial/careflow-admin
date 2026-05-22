import * as React from 'react'
import { ImagePlus, X } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { resolveMediaUrl } from '@/lib/media-url'
import { StandardIconImage } from '@/components/ui/standard-icon-image'
import { listCarePictures } from '../api/picture-gallery.api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toastError } from '@/lib/toast'

type GalleryPicture = { name: string; fileUrl: string }

export function FormIconPicker({
  pictureUrl,
  onPictureUrlChange,
  pendingFile,
  onPendingFileChange,
  disabled,
  label = 'Form icon',
}: {
  pictureUrl: string | null
  onPictureUrlChange: (url: string | null) => void
  pendingFile: File | null
  onPendingFileChange: (file: File | null) => void
  disabled?: boolean
  label?: string
}) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [standardIcons, setStandardIcons] = React.useState<GalleryPicture[]>([])
  const [loadingIcons, setLoadingIcons] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingIcons(true)
      try {
        const rows = await listCarePictures({ type: 'standard' })
        if (!cancelled) {
          setStandardIcons(
            rows.map(r => ({ name: r.name, fileUrl: r.fileUrl })).filter(r => r.fileUrl),
          )
        }
      } catch (e) {
        if (!cancelled) {
          toastError(e instanceof ApiError ? e.message : 'Could not load standard icons.')
        }
      } finally {
        if (!cancelled) setLoadingIcons(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const previewUrl = React.useMemo(() => {
    if (pendingFile) return URL.createObjectURL(pendingFile)
    return resolveMediaUrl(pictureUrl)
  }, [pendingFile, pictureUrl])

  React.useEffect(() => {
    return () => {
      if (pendingFile && previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [pendingFile, previewUrl])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    onPendingFileChange(file)
    onPictureUrlChange(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const clearIcon = () => {
    onPendingFileChange(null)
    onPictureUrlChange(null)
  }

  const selectStandard = (url: string) => {
    onPendingFileChange(null)
    onPictureUrlChange(url)
  }

  return (
    <div className="space-y-3" data-testid="form-icon-picker">
      <span className="text-sm font-medium">{label}</span>
      <p className="text-xs text-muted-foreground">
        Shown on the service user care plan page next to the form title. Choose a standard icon or upload
        your own image (JPG, PNG, WebP, or SVG).
      </p>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 p-1">
          {previewUrl ? (
            pendingFile ? (
              <img src={previewUrl} alt="" className="h-16 w-16 object-contain" />
            ) : (
              <StandardIconImage
                src={pictureUrl}
                label="Form icon"
                className="h-16 w-16"
                imgClassName="h-16 w-16"
              />
            )
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" strokeWidth={1.25} />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
          >
            Upload image
          </Button>
          {(pictureUrl || pendingFile) && (
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={clearIcon}>
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml,.svg"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Standard icons</p>
        {loadingIcons ? (
          <p className="text-xs text-muted-foreground">Loading icons…</p>
        ) : (
          <div className="grid max-h-40 grid-cols-6 gap-2 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-8">
            {standardIcons.map(icon => {
              const selected = !pendingFile && pictureUrl === icon.fileUrl
              return (
                <button
                  key={icon.fileUrl}
                  type="button"
                  title={icon.name}
                  disabled={disabled}
                  onClick={() => selectStandard(icon.fileUrl)}
                  className={cn(
                    'flex h-14 w-full flex-col items-center justify-center gap-0.5 rounded border p-1 transition-colors',
                    selected
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-transparent hover:border-border hover:bg-muted/50',
                  )}
                >
                  <StandardIconImage
                    src={icon.fileUrl}
                    label={icon.name}
                    className="h-9 w-9 shrink-0"
                    imgClassName="h-9 w-9"
                  />
                  <span className="max-w-full truncate px-0.5 text-[9px] leading-tight text-muted-foreground">
                    {icon.name}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
