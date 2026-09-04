import * as React from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { PolicySectionLayout } from '@/features/policies/components/PolicySectionLayout'
import {
  PolicyForm,
  firstPolicyFormError,
  formFromPolicy,
  policyFormToWriteInput,
  validatePolicyDraft,
  type PolicyFormValues,
} from '@/features/policies/components/PolicyForm'
import { PolicyUnsavedChangesGuard } from '@/features/policies/components/PolicyUnsavedChangesGuard'
import {
  useDeletePolicy,
  usePolicy,
  usePolicyVersions,
  useRemovePolicyDocument,
  useUpdatePolicy,
  useUploadPolicyDocument,
} from '@/features/policies/hooks/usePolicies'
import { POLICY_PATHS } from '@/features/policies/policy-routes'
import { policyErrorCopy } from '@/features/policies/policy-error'
import { POLICY_UPLOAD_ERROR_COPY, policyUploadErrorFromHttp } from '@/features/policies/policy-upload'
import { POLICY_IN_PROGRESS_STATUSES } from '@/features/policies/types/policy.types'
import { canPermanentlyDeletePolicy, policyDeleteConfirmCopy } from '@/features/policies/policy-actions'
import { useAuthStore } from '@/features/auth/store'
import { toastError, toastSuccess } from '@/shared/lib/toast'
import { Skeleton } from '@/shared/ui/misc'
import { Button } from '@/shared/ui/button'
import { PolicyConfirmDialog } from '@/features/policies/components/PolicyConfirmDialog'
import { ApiError } from '@/shared/api/api-client'

export default function PolicyEditPage() {
  const { policyId } = useParams({ strict: false }) as { policyId: string }
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const canArchive = useAuthStore(s => s.can('policies.archive'))
  const userId = user?.id ?? ''
  const restricted = Boolean(user?.assignedLocationIds && user.assignedLocationIds.length > 0)
  const policyQuery = usePolicy(policyId)
  const versionsQuery = usePolicyVersions(policyId)
  const updateMut = useUpdatePolicy()
  const deleteMut = useDeletePolicy()
  const uploadMut = useUploadPolicyDocument()
  const removeMut = useRemovePolicyDocument()
  const [values, setValues] = React.useState<PolicyFormValues | null>(null)
  const [errors, setErrors] = React.useState<Partial<Record<keyof PolicyFormValues, string>>>({})
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = React.useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const snapshot = React.useRef('')

  const working = (versionsQuery.data ?? []).find(row => POLICY_IN_PROGRESS_STATUSES.includes(row.status))
  const canEdit =
    working?.status === 'DRAFT' ||
    (!working && policyQuery.data?.status === 'DRAFT' && policyQuery.data.currentVersion?.status === 'DRAFT')
  const versionId = working?.id ?? policyQuery.data?.currentVersion?.id
  const canDelete =
    Boolean(policyQuery.data) &&
    canArchive &&
    canPermanentlyDeletePolicy({
      documentStatus: policyQuery.data?.status ?? 'DRAFT',
      versions: versionsQuery.data,
      currentVersionStatus: policyQuery.data?.currentVersion?.status,
    })

  React.useEffect(() => {
    if (!policyQuery.data) return
    const next = formFromPolicy(policyQuery.data, working ?? policyQuery.data.currentVersion, userId)
    setValues(next)
    snapshot.current = JSON.stringify(next)
    setPendingFile(null)
    setUploadStatus(next.uploadedFile ? 'success' : 'idle')
    setUploadError(null)
  }, [policyQuery.data, working, userId])

  React.useEffect(() => {
    if (policyQuery.isLoading || versionsQuery.isLoading) return
    if (!canEdit && policyQuery.data) {
      void navigate({ to: POLICY_PATHS.detail, params: { policyId } })
    }
  }, [canEdit, navigate, policyId, policyQuery.data, policyQuery.isLoading, versionsQuery.isLoading])

  if (policyQuery.isError) {
    return (
      <PolicySectionLayout title="Edit policy" description="" testId="policy-edit-page">
        <p className="text-sm text-destructive" role="alert">
          {policyErrorCopy(policyQuery.error).message}
        </p>
      </PolicySectionLayout>
    )
  }

  if (policyQuery.isLoading || versionsQuery.isLoading || !values) {
    return (
      <PolicySectionLayout title="Edit policy" description="Update draft content." testId="policy-edit-page">
        <div className="space-y-3" data-testid="policy-detail-skeleton">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PolicySectionLayout>
    )
  }

  if (!canEdit) {
    return (
      <PolicySectionLayout title="Edit policy" description="" testId="policy-edit-page">
        <p className="text-sm text-muted-foreground">
          Published policies cannot be edited. Open the policy to create a new version.
        </p>
      </PolicySectionLayout>
    )
  }

  const dirty = JSON.stringify(values) !== snapshot.current || Boolean(pendingFile)

  const uploadSelected = async (file: File) => {
    if (!versionId) {
      setPendingFile(file)
      setUploadStatus('success')
      return
    }
    setPendingFile(file)
    setUploadStatus('uploading')
    setUploadProgress(0)
    setUploadError(null)
    try {
      const uploaded = await uploadMut.mutateAsync({
        policyId,
        versionId,
        file,
        onProgress: setUploadProgress,
      })
      setPendingFile(null)
      setUploadStatus('success')
      setValues(current =>
        current
          ? {
              ...current,
              contentMode: 'UPLOAD',
              pendingFileName: '',
              uploadedFile: uploaded.fileName
                ? { fileName: uploaded.fileName, mimeType: uploaded.mimeType ?? '', fileSize: uploaded.fileSize ?? 0 }
                : current.uploadedFile,
            }
          : current,
      )
    } catch (err) {
      const code = err instanceof ApiError ? policyUploadErrorFromHttp(err.status, err.message) : 'failed'
      setUploadStatus('error')
      setUploadError(POLICY_UPLOAD_ERROR_COPY[code])
      const copy = policyErrorCopy(err)
      toastError(copy.title, copy.message)
    }
  }

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
      await updateMut.mutateAsync({ id: policyId, body: policyFormToWriteInput(values) })
      if (values.contentMode === 'UPLOAD' && pendingFile && versionId) {
        setUploadStatus('uploading')
        await uploadMut.mutateAsync({
          policyId,
          versionId,
          file: pendingFile,
          onProgress: setUploadProgress,
        })
        setUploadStatus('success')
        setPendingFile(null)
      }
      snapshot.current = JSON.stringify(values)
      toastSuccess('Draft saved')
      void navigate({ to: POLICY_PATHS.detail, params: { policyId } })
    } catch (err) {
      const copy = policyErrorCopy(err)
      toastError(copy.title, copy.message)
    }
  }

  return (
    <PolicySectionLayout
      title={`Edit ${policyQuery.data?.title ?? 'policy'}`}
      description="Only the current draft can be edited. Published versions stay read-only."
      testId="policy-edit-page"
    >
      <PolicyUnsavedChangesGuard
        dirty={dirty && !updateMut.isPending && !uploadMut.isPending && !deleteMut.isPending && !deleteOpen}
      />
      {canDelete ? (
        <div className="mb-4 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setDeleteOpen(true)} disabled={deleteMut.isPending}>
            Delete
          </Button>
        </div>
      ) : null}
      <PolicyForm
        values={values}
        onChange={setValues}
        onSubmit={() => void onSubmit()}
        submitLabel="Save draft"
        pending={updateMut.isPending || uploadMut.isPending || removeMut.isPending || deleteMut.isPending}
        hasChanges={dirty}
        errors={errors}
        pendingFile={pendingFile}
        onPendingFileChange={file => {
          if (file) void uploadSelected(file)
          else {
            setPendingFile(null)
            setUploadStatus(values.uploadedFile ? 'success' : 'idle')
          }
        }}
        uploadStatus={uploadStatus}
        uploadProgress={uploadProgress}
        uploadError={uploadError}
        onRemoveUploaded={() => {
          if (!versionId || !values.uploadedFile) return
          void removeMut
            .mutateAsync({ policyId, versionId })
            .then(() => {
              setValues(current => (current ? { ...current, uploadedFile: null, pendingFileName: '' } : current))
              setPendingFile(null)
              setUploadStatus('idle')
              toastSuccess('Document removed')
            })
            .catch(err => {
              const copy = policyErrorCopy(err)
              toastError(copy.title, copy.message)
            })
        }}
        removingDocument={removeMut.isPending}
      />
      <PolicyConfirmDialog
        open={deleteOpen}
        onOpenChange={open => {
          if (!deleteMut.isPending) setDeleteOpen(open)
        }}
        title={policyDeleteConfirmCopy(policyQuery.data?.title ?? 'this policy').title}
        description={policyDeleteConfirmCopy(policyQuery.data?.title ?? 'this policy').description}
        confirmLabel={policyDeleteConfirmCopy(policyQuery.data?.title ?? 'this policy').confirmLabel}
        destructive
        pending={deleteMut.isPending}
        onConfirm={() => {
          void deleteMut
            .mutateAsync(policyId)
            .then(() => {
              setDeleteOpen(false)
              toastSuccess('Policy deleted successfully.')
              void navigate({ to: POLICY_PATHS.library })
            })
            .catch(err => {
              const copy = policyErrorCopy(err)
              toastError(copy.title, copy.message)
            })
        }}
      />
    </PolicySectionLayout>
  )
}
