import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { PolicySectionLayout } from '@/features/policies/components/PolicySectionLayout'
import {
  PolicyForm,
  emptyPolicyForm,
  firstPolicyFormError,
  policyFormToWriteInput,
  validatePolicyDraft,
  type PolicyFormValues,
} from '@/features/policies/components/PolicyForm'
import { PolicyUnsavedChangesGuard } from '@/features/policies/components/PolicyUnsavedChangesGuard'
import { useCreatePolicy, useUploadPolicyDocument } from '@/features/policies/hooks/usePolicies'
import { POLICY_PATHS } from '@/features/policies/policy-routes'
import { policyErrorCopy } from '@/features/policies/policy-error'
import { POLICY_UPLOAD_ERROR_COPY, policyUploadErrorFromHttp } from '@/features/policies/policy-upload'
import { useAuthStore } from '@/features/auth/store'
import { toastError, toastSuccess } from '@/shared/lib/toast'
import { ApiError } from '@/shared/api/api-client'

export default function PolicyNewPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const restricted = Boolean(user?.assignedLocationIds && user.assignedLocationIds.length > 0)
  const [values, setValues] = React.useState<PolicyFormValues>(() =>
    emptyPolicyForm(user?.id ?? '', !restricted),
  )
  const [errors, setErrors] = React.useState<Partial<Record<keyof PolicyFormValues, string>>>({})
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const createMut = useCreatePolicy()
  const uploadMut = useUploadPolicyDocument()
  const initial = React.useRef(JSON.stringify(values))
  const dirty = JSON.stringify(values) !== initial.current || Boolean(pendingFile)

  const onSubmit = async () => {
    const nextErrors = validatePolicyDraft(values, {
      locationRestricted: restricted,
      allowedLocationIds: restricted ? (user?.assignedLocationIds ?? undefined) : undefined,
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      toastError('Cannot save draft', firstPolicyFormError(nextErrors) ?? 'Complete the required fields.')
      return
    }
    try {
      const created = await createMut.mutateAsync(policyFormToWriteInput(values))
      const versionId = created.currentVersion?.id
      if (values.contentMode === 'UPLOAD' && pendingFile && versionId) {
        setUploadStatus('uploading')
        setUploadProgress(0)
        setUploadError(null)
        await uploadMut.mutateAsync({
          policyId: created.id,
          versionId,
          file: pendingFile,
          onProgress: setUploadProgress,
        })
        setUploadStatus('success')
      }
      initial.current = JSON.stringify(values)
      toastSuccess('Policy created')
      void navigate({ to: POLICY_PATHS.detail, params: { policyId: created.id } })
    } catch (err) {
      const copy = policyErrorCopy(err)
      if (err instanceof ApiError && values.contentMode === 'UPLOAD') {
        const code = policyUploadErrorFromHttp(err.status, err.message)
        setUploadStatus('error')
        setUploadError(POLICY_UPLOAD_ERROR_COPY[code])
      }
      toastError(copy.title, copy.message)
    }
  }

  return (
    <PolicySectionLayout
      title="Create policy"
      description="Write the policy in CareFlow or upload an existing PDF or Word document."
      testId="policy-new-page"
    >
      <PolicyUnsavedChangesGuard dirty={dirty && !createMut.isPending && !uploadMut.isPending} />
      <PolicyForm
        values={values}
        onChange={setValues}
        onSubmit={() => void onSubmit()}
        submitLabel="Save draft"
        pending={createMut.isPending || uploadMut.isPending}
        hasChanges={dirty}
        errors={errors}
        pendingFile={pendingFile}
        onPendingFileChange={file => {
          setPendingFile(file)
          setUploadStatus(file ? 'success' : 'idle')
          setUploadError(null)
        }}
        uploadStatus={uploadStatus}
        uploadProgress={uploadProgress}
        uploadError={uploadError}
      />
    </PolicySectionLayout>
  )
}
