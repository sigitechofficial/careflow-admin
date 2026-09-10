import { resolveMediaUrl } from '@/shared/lib/media-url'

export type VisitPhotoThumb = {
  id: string
  fileUrl: string
  caption?: string | null
}

type Props = {
  photos?: VisitPhotoThumb[] | null
  label?: string
}

/** Thumbnail strip for carer-captured visit photos (observations, body map, incidents). */
export function VisitPhotoThumbnails({ photos, label = 'Photos' }: Props) {
  const items = (photos ?? []).filter((p) => p.fileUrl.trim())
  if (items.length === 0) return null

  return (
    <div className="mt-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <ul className="mt-1.5 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((photo) => {
          const src = resolveMediaUrl(photo.fileUrl)
          if (!src) return null
          return (
            <li key={photo.id}>
              <a href={src} target="_blank" rel="noreferrer">
                <img
                  src={src}
                  alt={photo.caption?.trim() || 'Visit photo'}
                  className="h-20 w-full rounded-md border border-border object-cover"
                />
              </a>
              {photo.caption?.trim() ? (
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{photo.caption}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
