import * as React from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import {
  useDeleteEmployeeDocument,
  useEmployeeDocuments,
  useUploadEmployeeDocument,
} from '@/features/employees/hooks/useEmployeeProfileExtras'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn, formatDate } from '@/shared/lib/utils'

const ACCEPT =
  'application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function EmployeeDocumentsSection({
  employeeId,
  apiReady,
}: {
  employeeId: string | null
  apiReady: boolean
}) {
  const canRead = useAuthStore(s => s.can('employees.documents.read'))
  const canUpload = useAuthStore(s => s.can('employees.documents.upload'))
  const canDelete = useAuthStore(s => s.can('employees.documents.delete'))

  const enabled = !!employeeId && apiReady && canRead
  const docsQuery = useEmployeeDocuments(employeeId, enabled)
  const uploadMutation = useUploadEmployeeDocument(employeeId ?? '')
  const deleteMutation = useDeleteEmployeeDocument(employeeId ?? '')

  const docs = docsQuery.data ?? []
  const loading = docsQuery.isLoading
  const uploading = uploadMutation.isPending
  const [actionError, setActionError] = React.useState<string | null>(null)
  const error =
    actionError ??
    (docsQuery.error instanceof ApiError
      ? docsQuery.error.message
      : docsQuery.error
        ? 'Could not load documents.'
        : null)
  const [docTitle, setDocTitle] = React.useState('')
  const [docDescription, setDocDescription] = React.useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !employeeId || !apiReady) return
    setActionError(null)
    try {
      await uploadMutation.mutateAsync({
        file,
        name: docTitle.trim() || file.name,
        description: docDescription.trim() || undefined,
      })
      setDocTitle('')
      setDocDescription('')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Upload failed.'
      setActionError(msg)
    }
  }

  const onDelete = async (documentId: string) => {
    if (!employeeId || !apiReady) return
    if (!window.confirm('Remove this document from the employee record?')) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(documentId)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Delete failed.'
      setActionError(msg)
    }
  }

  if (!employeeId || !apiReady) {
    return (
      <p className="text-xs text-muted-foreground">
        Save personal details once to attach documents (insurance, right-to-work, training certificates, etc.).
      </p>
    )
  }

  if (!canRead && !canUpload) {
    return (
      <p className="text-xs text-muted-foreground">
        Your role does not include employee document permissions. Ask an administrator if you need to upload files here.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
      ) : null}

      {canUpload ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <p className="text-xs font-medium text-foreground">Upload a file</p>
          <p className="text-xs text-muted-foreground">
            PDF, Word, JPEG, or PNG — max 10 MB per file (same limits as the server).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="emp-doc-title">
                Title (optional)
              </label>
              <Input
                id="emp-doc-title"
                placeholder="e.g. Professional indemnity 2026"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                disabled={uploading}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="emp-doc-desc">
                Description (optional)
              </label>
              <Input
                id="emp-doc-desc"
                placeholder="Short note for HR / auditors"
                value={docDescription}
                onChange={e => setDocDescription(e.target.value)}
                disabled={uploading}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={e => void onPickFile(e)} />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading…' : 'Choose file'}
            </Button>
          </div>
        </div>
      ) : null}

      {canRead ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Document</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Size</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Uploaded</th>
                <th className="w-24 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    Loading documents…
                  </td>
                </tr>
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    No documents yet.
                  </td>
                </tr>
              ) : (
                docs.map(d => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-start gap-2">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <a
                            href={resolveMediaUrl(d.fileUrl) ?? d.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary underline-offset-2 hover:underline"
                          >
                            {d.name}
                          </a>
                          {d.description ? (
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{d.description}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{formatBytes(d.fileSize)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground text-xs">
                      {formatDate(d.uploadedDate)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canDelete ? (
                        <button
                          type="button"
                          title="Remove document"
                          className={cn(
                            'inline-flex rounded-md p-1.5 text-muted-foreground transition-colors',
                            'hover:bg-destructive/10 hover:text-destructive',
                          )}
                          onClick={() => void onDelete(d.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
