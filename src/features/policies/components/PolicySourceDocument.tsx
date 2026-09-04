import * as React from 'react'
import { Download, Eye, FileText } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { usePolicyDocumentFile } from '@/features/policies/hooks/usePolicies'
import { policyErrorCopy } from '@/features/policies/policy-error'
import { formatPolicyFileSize, policyFileTypeLabel } from '@/features/policies/policy-upload'
import { toastError } from '@/shared/lib/toast'
import type { PolicyVersion } from '@/features/policies/types/policy.types'

type Props = {
  policyId: string
  version: PolicyVersion
}

function openBlob(blob: Blob, fileName: string, mode: 'view' | 'download') {
  const url = URL.createObjectURL(blob)
  if (mode === 'view') {
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return
  }
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function PolicySourceDocument({ policyId, version }: Props) {
  const { fetchBlob } = usePolicyDocumentFile()
  const [pending, setPending] = React.useState<'view' | 'download' | null>(null)
  const isPdf = (version.mimeType ?? '').includes('pdf') || (version.fileName ?? '').toLowerCase().endsWith('.pdf')

  const run = async (mode: 'view' | 'download') => {
    setPending(mode)
    try {
      const result = await fetchBlob(policyId, version.id, mode === 'view' ? 'inline' : 'attachment')
      openBlob(result.blob, result.fileName || version.fileName || 'policy-document', mode)
    } catch (err) {
      const copy = policyErrorCopy(err)
      toastError(copy.title, copy.message)
    } finally {
      setPending(null)
    }
  }

  if (!version.hasDocument || !version.fileName) return null

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between" data-testid="policy-source-document">
      <div className="flex min-w-0 items-start gap-3">
        <FileText className="mt-0.5 h-8 w-8 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{version.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {policyFileTypeLabel(version.mimeType, version.fileName)} · {formatPolicyFileSize(version.fileSize)} · {version.versionLabel}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {isPdf ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void run('view')} disabled={pending !== null}>
            <Eye className="mr-1 h-4 w-4" />
            {pending === 'view' ? 'Opening…' : 'View document'}
          </Button>
        ) : null}
        <Button type="button" size="sm" onClick={() => void run('download')} disabled={pending !== null}>
          <Download className="mr-1 h-4 w-4" />
          {pending === 'download' ? 'Downloading…' : 'Download'}
        </Button>
      </div>
    </div>
  )
}
