import * as React from "react"
import { Upload, X, File, Image, FileText, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface UploadedFile {
  id: string
  file: File
  preview?: string
  error?: string
}

interface FileUploadProps {
  accept?: string
  multiple?: boolean
  maxSize?: number // bytes
  maxFiles?: number
  onChange?: (files: File[]) => void
  disabled?: boolean
  className?: string
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <Image className="h-5 w-5 text-blue-500" />
  if (type.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />
  return <File className="h-5 w-5 text-muted-foreground" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUpload({
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 10,
  onChange,
  disabled,
  className,
}: FileUploadProps) {
  const [files, setFiles] = React.useState<UploadedFile[]>([])
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const newFiles: UploadedFile[] = []
    for (const file of Array.from(incoming)) {
      const id = Math.random().toString(36).slice(2)
      const error = file.size > maxSize ? `Exceeds ${formatBytes(maxSize)} limit` : undefined
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined
      newFiles.push({ id, file, preview, error })
    }
    const updated = multiple
      ? [...files, ...newFiles].slice(0, maxFiles)
      : newFiles.slice(0, 1)
    setFiles(updated)
    onChange?.(updated.filter(f => !f.error).map(f => f.file))
  }

  const remove = (id: string) => {
    const updated = files.filter(f => f.id !== id)
    setFiles(updated)
    onChange?.(updated.filter(f => !f.error).map(f => f.file))
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); !disabled && setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) addFiles(e.dataTransfer.files)
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-6 py-10 text-center cursor-pointer transition-colors",
          "hover:border-primary/50 hover:bg-accent/30",
          dragging && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-50 pointer-events-none"
        )}
      >
        <div className="rounded-full bg-muted p-3">
          <Upload className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Drop files here or <span className="text-primary">browse</span></p>
          <p className="text-xs text-muted-foreground mt-1">
            {accept ? `Accepted: ${accept}` : "Any file type"} · Max {formatBytes(maxSize)}
            {multiple && maxFiles && ` · Up to ${maxFiles} files`}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f) => (
            <li key={f.id} className={cn(
              "flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2",
              f.error && "border-destructive/50 bg-destructive/5"
            )}>
              {f.preview
                ? <img src={f.preview} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                : <FileIcon type={f.file.type} />
              }
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{f.file.name}</p>
                <p className={cn("text-xs", f.error ? "text-destructive flex items-center gap-1" : "text-muted-foreground")}>
                  {f.error ? <><AlertCircle className="h-3 w-3" />{f.error}</> : formatBytes(f.file.size)}
                </p>
              </div>
              <Button size="icon-sm" variant="ghost" onClick={() => remove(f.id)}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
