import * as React from 'react'
import { FileText, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { PolicyConfirmDialog } from '@/features/policies/components/PolicyConfirmDialog'
import {
  formatPolicyFileSize,
  POLICY_UPLOAD_ACCEPT,
  POLICY_UPLOAD_ERROR_COPY,
  policyFileTypeLabel,
  validatePolicyUploadFile,
  type PolicyUploadErrorCode,
} from '@/features/policies/policy-upload'
import { cn } from '@/shared/lib/utils'

export type PolicyUploadedMeta = {
  fileName: string
  mimeType: string
  fileSize: number
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

type Props = {
  uploaded: PolicyUploadedMeta | null
  pendingFile: File | null
  status: UploadStatus
  progress: number
  error: string | null
  disabled?: boolean
  onSelectFile: (file: File) => void
  onClearPending: () => void
  onRemoveUploaded?: () => void
  removing?: boolean
}

export function PolicyDocumentUploader({
  uploaded,
  pendingFile,
  status,
  progress,
  error,
  disabled,
  onSelectFile,
  onClearPending,
  onRemoveUploaded,
  removing,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const [localError, setLocalError] = React.useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = React.useState(false)

  const displayError = localError ?? error
  const successMeta: PolicyUploadedMeta | null = pendingFile
    ? { fileName: pendingFile.name, mimeType: pendingFile.type, fileSize: pendingFile.size }
    : uploaded

  const acceptFile = (incoming: File | undefined) => {
    if (!incoming || disabled) return
    const code = validatePolicyUploadFile(incoming)
    if (code) {
      setLocalError(POLICY_UPLOAD_ERROR_COPY[code as PolicyUploadErrorCode])
      return
    }
    setLocalError(null)
    onSelectFile(incoming)
  }

  if (status === 'uploading') {
    return (
      <div
        className="rounded-lg border border-border bg-muted/20 p-4"
        data-testid="policy-upload-progress"
        role="status"
      >
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{pendingFile?.name ?? uploaded?.fileName ?? 'Uploading document'}</p>
            <p className="text-xs text-muted-foreground">Uploading… {Math.max(0, Math.min(100, progress))}%</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${Math.max(4, Math.min(100, progress))}%` }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if ((status === 'success' || pendingFile || uploaded) && successMeta && status !== 'error') {
    return (
      <div className="rounded-lg border border-border p-4" data-testid="policy-upload-success">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-8 w-8 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{successMeta.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {policyFileTypeLabel(successMeta.mimeType, successMeta.fileName)} · {formatPolicyFileSize(successMeta.fileSize)}
              {uploaded && !pendingFile ? ' · Uploaded' : ' · Ready to save'}
            </p>
          </div>
          {!disabled ? (
            <div className="flex shrink-0 gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (uploaded && !pendingFile && onRemoveUploaded) setConfirmRemove(true)
                  else onClearPending()
                }}
                disabled={removing}
              >
                Remove
              </Button>
            </div>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={POLICY_UPLOAD_ACCEPT}
          disabled={disabled}
          onChange={e => {
            acceptFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <PolicyConfirmDialog
          open={confirmRemove}
          onOpenChange={setConfirmRemove}
          title="Remove document"
          description="Remove this uploaded document from the draft? The published version is not affected."
          confirmLabel="Remove"
          destructive
          pending={removing}
          onConfirm={() => {
            setConfirmRemove(false)
            onRemoveUploaded?.()
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-2" data-testid="policy-upload-dropzone">
      <div
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 py-8 text-center',
          dragging && 'border-primary bg-muted/40',
          disabled && 'cursor-not-allowed opacity-60',
        )}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          acceptFile(e.dataTransfer.files[0])
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        aria-label="Upload policy document"
      >
        <Upload className="mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Drag & drop your policy here</p>
        <p className="mt-1 text-sm text-muted-foreground">or Choose document</p>
        <p className="mt-3 text-xs text-muted-foreground">PDF, DOC, DOCX · Maximum 25 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={POLICY_UPLOAD_ACCEPT}
        disabled={disabled}
        data-testid="policy-upload-input"
        onChange={e => {
          acceptFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {displayError ? (
        <p className="flex items-start gap-1 text-sm text-destructive" role="alert" data-testid="policy-upload-error">
          <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {displayError}
        </p>
      ) : null}
    </div>
  )
}
