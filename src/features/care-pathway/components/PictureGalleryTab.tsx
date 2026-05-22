import * as React from 'react'
import { Trash2, Upload } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { StandardIconImage } from '@/components/ui/standard-icon-image'
import {
  deleteUploadedPicture,
  listCarePictures,
  uploadCarePicture,
  type CarePictureRow,
} from '../api/picture-gallery.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth.store'
import { toastError, toastSuccess } from '@/lib/toast'

export function PictureGalleryTab() {
  const canUpload = useAuthStore(s => s.can('picture_gallery.upload'))
  const canDelete = useAuthStore(s => s.can('picture_gallery.delete'))
  const [standard, setStandard] = React.useState<CarePictureRow[]>([])
  const [uploaded, setUploaded] = React.useState<CarePictureRow[]>([])
  const [search, setSearch] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [uploadName, setUploadName] = React.useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [std, up] = await Promise.all([
        listCarePictures({ type: 'standard', search: search || undefined }),
        listCarePictures({ type: 'uploaded', search: search || undefined }),
      ])
      setStandard(std)
      setUploaded(up)
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Could not load gallery.')
    } finally {
      setLoading(false)
    }
  }, [search])

  React.useEffect(() => {
    const t = window.setTimeout(() => void load(), 200)
    return () => window.clearTimeout(t)
  }, [load])

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !canUpload) return
    const name = uploadName.trim() || file.name
    try {
      await uploadCarePicture(file, name)
      toastSuccess('Picture uploaded.')
      setUploadName('')
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Upload failed.')
    }
  }

  const onDelete = async (row: CarePictureRow) => {
    if (!canDelete || !window.confirm(`Delete "${row.name}"?`)) return
    try {
      await deleteUploadedPicture(row.id)
      toastSuccess('Picture deleted.')
      await load()
    } catch (e) {
      toastError(e instanceof ApiError ? e.message : 'Delete failed.')
    }
  }

  const PictureGrid = ({ items, showDelete }: { items: CarePictureRow[]; showDelete?: boolean }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
      {items.map(p => (
        <div
          key={p.id}
          className="relative overflow-hidden rounded-lg border border-border bg-muted/30 p-2 text-center"
        >
          <StandardIconImage
            src={p.fileUrl}
            label={p.name}
            className="mx-auto h-20 w-20"
            imgClassName="h-20 w-20"
          />
          <p className="mt-1 truncate text-xs">{p.name}</p>
          {showDelete && canDelete && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1 h-7 w-7"
              onClick={() => void onDelete(p)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6" data-testid="picture-gallery-tab">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-sky-700 dark:text-sky-400">Gallery</h2>
        <Input
          className="ml-auto max-w-xs"
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {canUpload && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-4">
          <Input
            className="max-w-xs"
            placeholder="Picture name"
            value={uploadName}
            onChange={e => setUploadName(e.target.value)}
          />
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onUpload} />
          <Button type="button" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1 h-4 w-4" />
            Upload image
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <section>
            <h3 className="mb-2 font-medium">Standard pictures</h3>
            {standard.length === 0 ? (
              <p className="text-sm text-muted-foreground">No standard pictures.</p>
            ) : (
              <PictureGrid items={standard} />
            )}
          </section>
          <section>
            <h3 className="mb-2 font-medium">Uploaded pictures</h3>
            {uploaded.length === 0 ? (
              <p className="text-sm text-muted-foreground">No uploaded pictures.</p>
            ) : (
              <PictureGrid items={uploaded} showDelete />
            )}
          </section>
        </>
      )}
    </div>
  )
}
