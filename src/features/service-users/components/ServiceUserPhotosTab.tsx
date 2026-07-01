import type { ServiceUserDetail } from '@/features/service-users/api/service-users.api'
import { resolveMediaUrl } from '@/shared/lib/media-url'

function formatPhotoDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ServiceUserPhotosTab({ detail }: { detail: ServiceUserDetail }) {
  const photos = detail.photos ?? []

  if (photos.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-sky-600 dark:text-sky-400">Photographs</h2>
        <p className="text-sm text-muted-foreground">No photographs on file.</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">Photographs</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {photos.length} photo{photos.length === 1 ? '' : 's'} on record, including uploads from the service user portal.
      </p>
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
                <p className="text-sm text-foreground">{formatPhotoDateTime(p.uploadedAt)}</p>
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
    </section>
  )
}
