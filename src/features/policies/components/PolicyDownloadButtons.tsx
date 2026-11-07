import * as React from 'react'
import { FileDown, FileText, Loader2 } from 'lucide-react'
import { getApiBaseUrl, ApiError } from '@/shared/api/api-client'
import { useAuthStore } from '@/features/auth/store'
import { toastError } from '@/shared/lib/toast'

export type PolicyExportTarget = { kind: 'policy'; policyId: string; versionId?: string | null } | { kind: 'library'; libraryId: string }

/** Where a policy's PDF or Word file is made (GET, signed in). */
export function policyExportPath(target: PolicyExportTarget, format: 'pdf' | 'docx'): string {
  if (target.kind === 'library') return `/policy-library/${target.libraryId}/export?format=${format}`
  const qs = new URLSearchParams({ format })
  if (target.versionId) qs.set('versionId', target.versionId)
  return `/policies/${target.policyId}/export?${qs}`
}

/** Fetches a made file and saves it under the name the API gives. */
export async function downloadPolicyExport(target: PolicyExportTarget, format: 'pdf' | 'docx'): Promise<string> {
  const base = getApiBaseUrl()
  if (!base) throw new ApiError('API base URL is not configured (set VITE_API_BASE_URL).', 0)
  const token = useAuthStore.getState().accessToken
  const res = await fetch(`${base}${policyExportPath(target, format)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) {
    let message = res.status === 403 ? 'You do not have permission to download this policy.' : 'The download could not be made.'
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) message = body.message
    } catch {
      /* not JSON */
    }
    throw new ApiError(message, res.status)
  }
  const blob = await res.blob()
  const header = res.headers.get('Content-Disposition') ?? ''
  const star = header.match(/filename\*=UTF-8''([^;]+)/i)
  const plain = header.match(/filename="([^"]+)"/i)
  const fileName = star?.[1] ? decodeURIComponent(star[1]) : (plain?.[1] ?? `policy.${format}`)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return fileName
}

/**
 * Download PDF / Download Word for a policy or a ready-made one. `className` styles each button (the print
 * toolbar and the app use different looks).
 */
export function PolicyDownloadButtons({ target, className }: { target: PolicyExportTarget; className: string }) {
  const [pending, setPending] = React.useState<'pdf' | 'docx' | null>(null)
  const run = async (format: 'pdf' | 'docx') => {
    setPending(format)
    try {
      await downloadPolicyExport(target, format)
    } catch (err) {
      toastError('Download failed', err instanceof Error ? err.message : 'The download could not be made.')
    } finally {
      setPending(null)
    }
  }
  return (
    <>
      <button type="button" className={className} onClick={() => void run('pdf')} disabled={pending !== null} data-testid="policy-download-pdf">
        {pending === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileDown className="h-4 w-4" aria-hidden />}
        {pending === 'pdf' ? 'Making PDF…' : 'Download PDF'}
      </button>
      <button type="button" className={className} onClick={() => void run('docx')} disabled={pending !== null} data-testid="policy-download-word">
        {pending === 'docx' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileText className="h-4 w-4" aria-hidden />}
        {pending === 'docx' ? 'Making Word file…' : 'Download Word'}
      </button>
    </>
  )
}
