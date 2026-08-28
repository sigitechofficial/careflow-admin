import * as React from 'react'
import { FileText, Upload } from 'lucide-react'
import {
  useCandidateDocuments,
  useUploadCandidateDocument,
} from '@/features/hr/recruitment/hooks/useRecruitment'
import { candidateDocumentTypeLabel } from '@/features/hr/recruitment/utils/recruitment-display.util'
import type { CandidateDocumentType } from '@/features/hr/recruitment/api/recruitment.api'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useAuthStore } from '@/features/auth/store'

const DOC_TYPES: CandidateDocumentType[] = ['CV', 'CERTIFICATE', 'ID_DOCUMENT', 'OTHER']

export function CandidateDocumentsPanel({ candidateId }: { candidateId: string }) {
  const canUpload = useAuthStore.getState().can('hr.candidates.update')
  const docsQuery = useCandidateDocuments(candidateId)
  const uploadMutation = useUploadCandidateDocument(candidateId)
  const [documentType, setDocumentType] = React.useState<CandidateDocumentType>('CV')
  const fileRef = React.useRef<HTMLInputElement>(null)

  const docs = docsQuery.data ?? []
  const apiBase = getApiBaseUrl()

  function resolveUrl(path: string) {
    if (path.startsWith('http')) return path
    return `${apiBase?.replace(/\/$/, '') ?? ''}${path}`
  }

  async function handleUpload(file: File) {
    await uploadMutation.mutateAsync({ file, documentType })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {canUpload ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 sm:flex-row sm:items-end">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Document type</label>
            <Select
              value={documentType}
              onValueChange={v => setDocumentType(v as CandidateDocumentType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{candidateDocumentTypeLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) void handleUpload(file)
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Upload className="h-4 w-4" />}
              disabled={uploadMutation.isPending}
              onClick={() => fileRef.current?.click()}
            >
              {uploadMutation.isPending ? 'Uploading…' : 'Upload document'}
            </Button>
          </div>
        </div>
      ) : null}

      {docsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents uploaded.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {docs.map(doc => (
            <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {candidateDocumentTypeLabel(doc.documentType)} ·{' '}
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <a
                href={resolveUrl(doc.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline shrink-0"
              >
                View
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
