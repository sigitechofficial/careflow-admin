import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import type { ServiceUserDetail } from '@/features/service-users/types'
import type { CareFormDetail } from '@/features/care-pathway/types/care-pathway.types'
import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'
import { CarePlanFormWorkspace } from '@/features/service-users/care-plan/CarePlanFormWorkspace'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { useAuthStore } from '@/features/auth/store'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useCarePlanFormPage } from '@/features/service-users/hooks/useCarePlanFormPage'
import { serviceUserDisplayName } from '@/features/service-users/lib/service-user-display'
import {
  ensureCarePlanInstance,
  fetchCarePlanCompose,
} from '@/features/service-users/care-plans/api'
import {
  mergeComposedValues,
  useCarePlanCompose,
  useCarePlanInstance,
  usePublishCarePlan,
  useSaveCarePlanDraft,
} from '@/features/service-users/care-plans/hooks/useServiceUserCarePlanInstances'
import { CarePlanEvidencePanel } from '@/features/service-users/care-plans/components/CarePlanEvidencePanel'
import { CarePlanFactsheetPanel } from '@/features/service-users/care-plans/components/CarePlanFactsheetPanel'
import { CarePlanPublishDialog } from '@/features/service-users/care-plans/components/CarePlanPublishDialog'
import { hasPublishableCarePlanValues } from '@/features/service-users/care-plans/care-plan-publish.util'
import { CarePlanReviewBadge } from '@/features/service-users/care-plans/components/CarePlanReviewBadge'
import { CarePlanVersionHistoryPanel } from '@/features/service-users/care-plans/components/CarePlanVersionHistoryPanel'
import { Button } from '@/shared/ui/button'

export default function ServiceUserCarePlanFormPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string; formId?: string }
  const serviceUserId = params.serviceUserId ?? ''
  const formId = params.formId ?? ''
  const navigate = useNavigate()
  const canUpdate = useAuthStore((s) => s.can('service_users.update'))
  const apiConfigured = Boolean(getApiBaseUrl())

  const { profile, form: formQuery, isLoading, error: loadErrorObj } = useCarePlanFormPage(
    serviceUserId,
    formId,
    apiConfigured,
  )
  const detail = profile.data ?? null
  const form: CareFormDetail | null = formQuery.data ?? null
  const loading = isLoading
  const error =
    loadErrorObj instanceof ApiError
      ? loadErrorObj.message
      : loadErrorObj instanceof Error
        ? loadErrorObj.message
        : null

  const [values, setValues] = React.useState<CarePlanDraftValues>({})
  const [valuesHydrated, setValuesHydrated] = React.useState(false)
  const [publishOpen, setPublishOpen] = React.useState(false)
  const [ensuringInstance, setEnsuringInstance] = React.useState(false)

  const instanceQuery = useCarePlanInstance(serviceUserId, formId, apiConfigured && Boolean(formId))
  const composeQuery = useCarePlanCompose(serviceUserId, formId, apiConfigured && Boolean(formId))
  const saveDraftMutation = useSaveCarePlanDraft(serviceUserId, formId)
  const publishMutation = usePublishCarePlan(serviceUserId, formId)

  React.useEffect(() => {
    if (!apiConfigured || !serviceUserId || !formId || instanceQuery.isLoading) return
    if (instanceQuery.data) return
    let cancelled = false
    setEnsuringInstance(true)
    void ensureCarePlanInstance(serviceUserId, formId)
      .then(() => instanceQuery.refetch())
      .catch((e) => toastApiError(e, 'Could not initialise care plan'))
      .finally(() => {
        if (!cancelled) setEnsuringInstance(false)
      })
    return () => {
      cancelled = true
    }
  }, [apiConfigured, serviceUserId, formId, instanceQuery.data, instanceQuery.isLoading, instanceQuery])

  React.useEffect(() => {
    if (valuesHydrated || instanceQuery.isLoading) return
    const draftValues = instanceQuery.data?.draft?.values
    if (draftValues && Object.keys(draftValues).length > 0) {
      setValues(draftValues)
      setValuesHydrated(true)
      return
    }
    if (composeQuery.data?.values) {
      setValues(mergeComposedValues({}, composeQuery.data.values, 'empty_only'))
      setValuesHydrated(true)
    }
  }, [valuesHydrated, instanceQuery.isLoading, instanceQuery.data, composeQuery.data])

  const refreshFromSources = async () => {
    try {
      const compose = await fetchCarePlanCompose(serviceUserId, formId)
      setValues((current) => mergeComposedValues(current, compose.values, 'empty_only'))
      await saveDraftMutation.mutateAsync({
        values: mergeComposedValues(values, compose.values, 'empty_only'),
        composedFrom: compose.composedFrom,
        gaps: compose.gaps,
      })
      toastSuccess('Refreshed', 'Empty fields updated from assessment and profile sources.')
      void composeQuery.refetch()
    } catch (e) {
      toastApiError(e, 'Could not refresh from sources')
    }
  }

  const onSaveDraft = () => {
    void saveDraftMutation
      .mutateAsync({
        values,
        composedFrom: composeQuery.data?.composedFrom,
        gaps: composeQuery.data?.gaps,
      })
      .then(() => toastSuccess('Draft saved', 'Care plan draft saved to the server.'))
      .catch((e) => toastApiError(e, 'Could not save draft'))
  }

  const onPublishConfirm = (payload: { gapAcknowledged: boolean; summary?: string }) => {
    if (!hasPublishableCarePlanValues(values)) {
      toastApiError(
        new Error('Add care plan field values or use Refresh from IA / profile before publishing.'),
        'Could not publish care plan',
      )
      return
    }
    void saveDraftMutation
      .mutateAsync({
        values,
        composedFrom: composeQuery.data?.composedFrom,
        gaps: composeQuery.data?.gaps,
      })
      .then(() =>
        publishMutation.mutateAsync({
          gapAcknowledged: payload.gapAcknowledged,
          summary: payload.summary,
        }),
      )
      .then(() => {
        setPublishOpen(false)
        toastSuccess('Published', 'Care plan version published.')
        void instanceQuery.refetch()
      })
      .catch((e) => toastApiError(e, 'Could not publish care plan'))
  }

  const backToList = () => {
    void navigate({
      to: '/service-users/$serviceUserId/care-plan',
      params: { serviceUserId },
    })
  }

  if (!serviceUserId || !formId) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Missing service user or form.{' '}
        <Link to="/service-users/all" className="text-primary underline">
          Back to list
        </Link>
      </p>
    )
  }

  const workspaceLoading =
    loading || ensuringInstance || instanceQuery.isLoading || (!valuesHydrated && composeQuery.isLoading)

  return (
    <div className="flex min-h-full flex-col bg-[#f4f6f8] pb-12 dark:bg-background">
      <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={backToList}
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to care plans
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{form?.name ?? 'Care plan'}</h1>
              <CarePlanReviewBadge review={instanceQuery.data?.review} />
            </div>
            <p className="text-sm text-muted-foreground">{serviceUserDisplayName(detail)}</p>
          </div>
          {canUpdate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refreshFromSources()}
              disabled={composeQuery.isFetching || saveDraftMutation.isPending}
            >
              Refresh from IA / profile
            </Button>
          ) : null}
        </div>
      </div>

      <ServiceUserModuleTabs serviceUserId={serviceUserId} />

      <div className="mx-auto w-full max-w-7xl flex-1 space-y-4 px-3 py-6 sm:px-4">
        {workspaceLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && !workspaceLoading && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {!workspaceLoading && !error && form && valuesHydrated && (
          <>
            <CarePlanEvidencePanel
              evidence={composeQuery.data?.evidence ?? []}
              gaps={composeQuery.data?.gaps ?? []}
              fieldSources={composeQuery.data?.fieldSources ?? {}}
              deltas={composeQuery.data?.deltas ?? []}
              lastPublishedVersionNumber={composeQuery.data?.lastPublishedVersionNumber}
              loading={composeQuery.isLoading}
              onRefresh={() => void refreshFromSources()}
              refreshing={composeQuery.isFetching || saveDraftMutation.isPending}
            />

            {composeQuery.data?.factsheets && composeQuery.data.factsheets.length > 0 ? (
              <CarePlanFactsheetPanel
                factsheets={composeQuery.data.factsheets}
                form={form}
                values={values}
                onChange={setValues}
                readOnly={!canUpdate}
              />
            ) : null}

            <CarePlanFormWorkspace
              serviceUserId={serviceUserId}
              detail={detail}
              form={form}
              values={values}
              onChange={setValues}
              disabled={!canUpdate}
              onCancel={backToList}
              onPublish={() => setPublishOpen(true)}
              onSaveDraft={onSaveDraft}
              saving={saveDraftMutation.isPending || publishMutation.isPending}
            />

            <CarePlanVersionHistoryPanel serviceUserId={serviceUserId} formId={formId} />
          </>
        )}
      </div>

      <CarePlanPublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        formName={form?.name}
        gaps={composeQuery.data?.gaps ?? []}
        hasValues={hasPublishableCarePlanValues(values)}
        publishing={publishMutation.isPending || saveDraftMutation.isPending}
        onConfirm={onPublishConfirm}
      />
    </div>
  )
}
