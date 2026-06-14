import * as React from 'react'
import { Trash2, Upload } from 'lucide-react'
import {
  fileToStoredValue,
  parseStoredFileValue,
} from '@/features/care-pathway/utils/form-builder-file-value.util'
import { Button } from '@/shared/ui/button'
import { SignaturePad } from '@/shared/ui/signature-pad'

function StoredFilePreview({
  value,
  onClear,
  disabled,
}: {
  value: string
  onClear: () => void
  disabled?: boolean
}) {
  const stored = parseStoredFileValue(value)
  if (!stored) return null
  const isImage = stored.mimeType.startsWith('image/')

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
      {isImage ? (
        <img
          src={stored.dataUrl}
          alt={stored.fileName}
          className="max-h-48 rounded border border-border object-contain"
        />
      ) : (
        <p className="text-sm">
          <span className="font-medium">{stored.fileName}</span>
          <span className="text-muted-foreground"> ({stored.mimeType})</span>
        </p>
      )}
      {!disabled && (
        <Button type="button" size="sm" variant="outline" onClick={onClear}>
          <Trash2 className="mr-1 h-4 w-4" />
          Remove
        </Button>
      )}
    </div>
  )
}

export function CarePathwayPhotoField({
  value,
  onChange,
  disabled,
}: {
  value: string | boolean | undefined
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const stringValue = typeof value === 'string' ? value : ''

  const onPick = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    onChange(await fileToStoredValue(file))
  }

  return (
    <div className="space-y-2">
      {stringValue ? (
        <StoredFilePreview value={stringValue} disabled={disabled} onClear={() => onChange('')} />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-5 w-5" />
          Upload photo (JPEG, PNG, WebP)
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => void onPick(event.target.files)}
      />
    </div>
  )
}

export function CarePathwayFileUploadField({
  value,
  onChange,
  disabled,
}: {
  value: string | boolean | undefined
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const stringValue = typeof value === 'string' ? value : ''

  const onPick = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    onChange(await fileToStoredValue(file))
  }

  return (
    <div className="space-y-2">
      {stringValue ? (
        <StoredFilePreview value={stringValue} disabled={disabled} onClear={() => onChange('')} />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-5 w-5" />
          Upload file
        </button>
      )}
      <input ref={inputRef} type="file" className="sr-only" disabled={disabled} onChange={(event) => void onPick(event.target.files)} />
    </div>
  )
}

export function CarePathwaySignatureField({
  value,
  onChange,
  disabled,
}: {
  value: string | boolean | undefined
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const stringValue = typeof value === 'string' ? value : ''
  const [editing, setEditing] = React.useState(!stringValue)

  if (stringValue && !editing) {
    return (
      <div className="space-y-2">
        <img
          src={stringValue}
          alt="Signature"
          className="max-h-40 rounded border border-border bg-white object-contain"
        />
        {!disabled && (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Re-sign
          </Button>
        )}
      </div>
    )
  }

  return (
    <SignaturePad
      disabled={disabled}
      onChange={(dataUrl) => {
        if (dataUrl) {
          onChange(dataUrl)
          setEditing(false)
        }
      }}
    />
  )
}
