import * as React from 'react'
import { Check, FileText, Trash2, Upload, X } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import {
  useDeleteHrDocument,
  useHrDocuments,
  useUpdateHrDocumentStatus,
  useUploadHrDocument,
} from '@/features/hr/hooks/useHr'
import type { HrDocumentStatus, HrDocumentType } from '@/features/hr/api/hr.api'
import {
  canDeleteHrDocuments,
  canUploadHrDocuments,
  documentExpiry,
  documentStatusLabel,
  documentTypeLabel,
  HR_DOCUMENT_STATUS_OPTIONS,
  HR_DOCUMENT_TYPE_OPTIONS,
} from '@/features/hr/utils/hr-display.util'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn, formatDate } from '@/shared/lib/utils'

const ACCEPT =
  'application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const STATUS_CHIP: Record<HrDocumentStatus, string> = {
  PENDING: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  REJECTED: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

const EXPIRY_CHIP = {
  expired: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  soon: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
} as const

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', className)}>
      {children}
    </span>
  )
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function HrDocumentsTab({ employeeId }: { employeeId: string }) {
  const can = useAuthStore(s => s.can)
  const canUpload = canUploadHrDocuments(can)
  const canDelete = canDeleteHrDocuments(can)

  const docsQuery = useHrDocuments(employeeId)
  const uploadMutation = useUploadHrDocument(employeeId)
  const deleteMutation = useDeleteHrDocument(employeeId)
  const statusMutation = useUpdateHrDocumentStatus(employeeId)

  const docs = docsQuery.data ?? []
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [docTitle, setDocTitle] = React.useState('')
  const [documentType, setDocumentType] = React.useState<HrDocumentType>('CONTRACT')
  const [expiryDate, setExpiryDate] = React.useState('')
  const [status, setStatus] = React.useState<HrDocumentStatus>('PENDING')
  const fileRef = React.useRef<HTMLInputElement>(null)

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setActionError(null)
    try {
      await uploadMutation.mutateAsync({
        file,
        documentType,
        name: docTitle.trim() || file.name,
        expiryDate: expiryDate || undefined,
        status,
      })
      setDocTitle('')
      setExpiryDate('')
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Upload failed.')
    }
  }

  const onDelete = async (documentId: string) => {
    if (!window.confirm('Remove this HR document?')) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(documentId)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Delete failed.')
    }
  }

  const onSetStatus = async (documentId: string, next: HrDocumentStatus) => {
    setActionError(null)
    try {
      await statusMutation.mutateAsync({ documentId, status: next })
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not update the document.')
    }
  }

  return (
    <div className="space-y-6">
      {canUpload ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
          <h3 className="text-sm font-medium">Upload document</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Document type</span>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={documentType}
                onChange={e => setDocumentType(e.target.value as HrDocumentType)}
              >
                {HR_DOCUMENT_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Title</span>
              <Input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Optional" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Expiry date</span>
              <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Status</span>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={status}
                onChange={e => setStatus(e.target.value as HrDocumentStatus)}
              >
                {HR_DOCUMENT_STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={onPickFile} />
            <Button
              type="button"
              variant="outline"
              disabled={uploadMutation.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadMutation.isPending ? 'Uploading…' : 'Choose file'}
            </Button>
          </div>
        </div>
      ) : null}

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      <div className="space-y-2">
        <h3 className="text-sm font-medium">HR documents</h3>
        {docsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading documents…</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No HR documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {docs.map(doc => {
              const expiry = documentExpiry(doc.expiryDate)
              const busy = statusMutation.isPending && statusMutation.variables?.documentId === doc.id
              return (
              <li key={doc.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <a
                      href={resolveMediaUrl(doc.fileUrl) ?? doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 truncate font-medium text-primary hover:underline"
                    >
                      {doc.name}
                    </a>
                    {doc.status ? <Chip className={STATUS_CHIP[doc.status]}>{documentStatusLabel(doc.status)}</Chip> : null}
                    {expiry && expiry.tone !== 'ok' ? (
                      <Chip className={EXPIRY_CHIP[expiry.tone]}>{expiry.label}</Chip>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {documentTypeLabel(doc.documentType)} · {formatBytes(doc.fileSize)} · Uploaded{' '}
                    {formatDate(doc.uploadedDate)}
                    {doc.expiryDate ? ` · Expires ${formatDate(doc.expiryDate)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {canUpload && doc.status !== 'APPROVED' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void onSetStatus(doc.id, 'APPROVED')}
                    >
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                  ) : null}
                  {canUpload && doc.status !== 'REJECTED' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void onSetStatus(doc.id, 'REJECTED')}
                    >
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      aria-label={`Remove ${doc.name}`}
                      onClick={() => void onDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
