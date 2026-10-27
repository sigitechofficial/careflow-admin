import * as React from 'react'
import { Download, FileText, Image as ImageIcon, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { FileUpload } from '@/shared/ui/file-upload'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { downloadPathwayDocument } from '@/features/specialist-pathways/api/specialist-pathways.api'
import {
  useRemovePathwayDocument,
  useUploadPathwayDocument,
} from '@/features/specialist-pathways/hooks/useSpecialistPathways'
import { DOCUMENT_CATEGORIES, fmtDate, fmtFileSize } from '@/features/specialist-pathways/pathway-labels'
import type { PathwayCase } from '@/features/specialist-pathways/types/specialist-pathway.types'

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp'
const MAX_BYTES = 15 * 1024 * 1024

export function PathwayDocumentsPanel({ caseData }: { caseData: PathwayCase }) {
  const canManage = useAuthStore(s => s.can)('specialist_pathways.manage') && caseData.status !== 'CLOSED'
  const upload = useUploadPathwayDocument(caseData.id)
  const remove = useRemovePathwayDocument(caseData.id)
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)
  const categories = DOCUMENT_CATEGORIES[caseData.pathwayType] ?? []

  const reset = () => {
    setOpen(false)
    setTitle('')
    setCategory('')
    setFile(null)
  }

  const submit = () => {
    if (!file) {
      toastApiError(null, 'Choose a file to upload')
      return
    }
    if (file.size > MAX_BYTES) {
      toastApiError(null, 'The file is larger than 15 MB')
      return
    }
    const t = title.trim() || category.trim() || file.name
    upload.mutate(
      { file, title: t, category: category.trim() || undefined },
      {
        onSuccess: () => {
          toastSuccess('Document uploaded')
          reset()
        },
        onError: e => toastApiError(e, 'Could not upload document'),
      },
    )
  }

  const onDownload = (docId: string) => {
    const doc = caseData.documents.find(d => d.id === docId)
    if (!doc) return
    downloadPathwayDocument(caseData.id, doc).catch(e => toastApiError(e, 'Could not download document'))
  }

  return (
    <div className="flex flex-col gap-4" data-testid="pathway-documents-panel">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">PDF or image files, up to 15 MB</p>
        {canManage && !open && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Upload document
          </Button>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Category</span>
              <Input list="pathway-document-categories" value={category} onChange={e => setCategory(e.target.value)} />
              <datalist id="pathway-document-categories">
                {categories.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Title</span>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. DNACPR signed 12 Oct" />
            </label>
          </div>
          <FileUpload accept={ACCEPT} maxSize={MAX_BYTES} onChange={files => setFile(files[0] ?? null)} />
          <div className="flex gap-2">
            <Button onClick={submit} disabled={upload.isPending}>
              {upload.isPending ? 'Uploading…' : 'Upload'}
            </Button>
            <Button variant="ghost" onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {caseData.documents.length === 0 ? (
        !open && (
          <Card>
            <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
              <FileText className="h-5 w-5" aria-hidden />
              No documents uploaded yet.
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {caseData.documents.map(d => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  {d.mimeType.startsWith('image/') ? (
                    <ImageIcon className="h-5 w-5 shrink-0 text-sky-600" aria-hidden />
                  ) : (
                    <FileText className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.category && `${d.category} · `}
                      {fmtDate(d.createdAt)}
                      {d.uploadedByName && ` · ${d.uploadedByName}`} · {fmtFileSize(d.fileSize)}
                    </p>
                  </div>
                </div>
                <span className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onDownload(d.id)}>
                    <Download className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Download
                  </Button>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={remove.isPending}
                      aria-label={`Remove ${d.title}`}
                      onClick={() => {
                        if (!window.confirm(`Remove "${d.title}"?`)) return
                        remove.mutate(d.id, {
                          onSuccess: () => toastSuccess('Document removed'),
                          onError: e => toastApiError(e, 'Could not remove document'),
                        })
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
