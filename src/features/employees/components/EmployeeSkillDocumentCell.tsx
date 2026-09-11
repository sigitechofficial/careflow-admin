import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { useAuthStore } from '@/features/auth/store'
import { uploadEmployeeDocument } from '@/features/employees/api'
import { useUpdateEmployeeSkillMutation } from '@/features/employees/hooks/useEmployeeMutations'

export const SKILL_DOCUMENT_ACCEPT =
  'application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export async function uploadSkillEvidence(employeeId: string, file: File): Promise<string> {
  const uploaded = await uploadEmployeeDocument(employeeId, file, {
    name: file.name,
    description: 'Skill documentation',
  })
  return uploaded.fileUrl
}

export function EmployeeSkillDocumentCell({
  employeeId,
  skillId,
  documentUrl,
  canUpdate,
  onError,
}: {
  employeeId: string
  skillId: string
  documentUrl?: string | null
  canUpdate: boolean
  onError?: (message: string) => void
}) {
  const canUploadDocs = useAuthStore(s => s.can('employees.documents.upload'))
  const updateMutation = useUpdateEmployeeSkillMutation()
  const fileRef = React.useRef<HTMLInputElement>(null)
  const href = resolveMediaUrl(documentUrl)
  const uploading = updateMutation.isPending

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!canUploadDocs) {
      onError?.('You do not have permission to upload documents.')
      return
    }
    try {
      const documentUrlNext = await uploadSkillEvidence(employeeId, file)
      await updateMutation.mutateAsync({
        employeeId,
        skillId,
        body: { documentUrl: documentUrlNext },
      })
    } catch (err) {
      onError?.(err instanceof ApiError ? err.message : 'Could not upload skill document.')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          View
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
      {canUpdate ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept={SKILL_DOCUMENT_ACCEPT}
            className="sr-only"
            onChange={e => void onPick(e)}
          />
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            disabled={uploading || !canUploadDocs}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Uploading…' : href ? 'Replace' : 'Upload'}
          </button>
        </>
      ) : null}
    </div>
  )
}
