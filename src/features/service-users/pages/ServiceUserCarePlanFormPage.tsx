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
  useCarePlanPublishedVersion,
  usePublishCarePlan,
  useSaveCarePlanDraft,
} from '@/features/service-users/care-plans/hooks/useServiceUserCarePlanInstances'
import { CarePlanEvidencePanel } from '@/features/service-users/care-plans/components/CarePlanEvidencePanel'
import { CarePlanFactsheetPanel } from '@/features/service-users/care-plans/components/CarePlanFactsheetPanel'
import { CarePlanPublishDialog } from '@/features/service-users/care-plans/components/CarePlanPublishDialog'
import { hasPublishableCarePlanValues } from '@/features/service-users/care-plans/care-plan-publish.util'
import { CarePlanIaHistoryPanel } from '@/features/service-users/care-plans/components/CarePlanIaHistoryPanel'
import {
  CARE_PLAN_META,
  setMetaValue,
} from '@/features/service-users/care-plan/care-plan-form-meta'
import { resolveEditorNextReviewDate } from '@/features/service-users/care-plans/care-plan-review-frequency'
import { CarePlanReviewBadge } from '@/features/service-users/care-plans/components/CarePlanReviewBadge'
import { CarePlanVersionHistoryPanel } from '@/features/service-users/care-plans/components/CarePlanVersionHistoryPanel'
import { Button } from '@/shared/ui/button'
import type { CarePlanFieldSuggestion } from '@/features/service-users/care-plans/types'
import { shouldShowCarePlanIaSuggestions } from '@/features/service-users/care-plans/care-plan-instance-status'
import {
  applySuggestionToValues,
  hydrateCarePlanEditorValues,
  hydrateComposedFromForEditor,
  isExplicitSuggestionCompose,
  isHybridCompose,
  markProvenanceEdited,
  mergeComposedFromOnEdit,
  mergeComposedFromOnIgnore,
  mergeComposedFromOnUse,
  mergeHybridRefreshValues,
  readIgnoredSuggestionIds,
  shouldHydrateFromPublishedVersion,
} from '@/features/service-users/care-plans/care-plan-suggestion-state'

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
  const [composedFrom, setComposedFrom] = React.useState<Record<string, unknown>>({})
  const [valuesHydrated, setValuesHydrated] = React.useState(false)
  const [publishOpen, setPublishOpen] = React.useState(false)
  const [ensuringInstance, setEnsuringInstance] = React.useState(false)

  const instanceQuery = useCarePlanInstance(serviceUserId, formId, apiConfigured && Boolean(formId))
  const composeQuery = useCarePlanCompose(serviceUserId, formId, apiConfigured && Boolean(formId))
  const hydrateFromPublished = shouldHydrateFromPublishedVersion({
    draft: instanceQuery.data?.draft,
    latestPublishedVersionId: instanceQuery.data?.latestPublishedVersion?.id,
  })
  const publishedVersionQuery = useCarePlanPublishedVersion(
    serviceUserId,
    formId,
    instanceQuery.data?.latestPublishedVersion?.id,
    apiConfigured && Boolean(formId) && hydrateFromPublished,
  )
  const saveDraftMutation = useSaveCarePlanDraft(serviceUserId, formId)
  const publishMutation = usePublishCarePlan(serviceUserId, formId)
  const actorId = useAuthStore((s) => s.user?.id)
  const explicitSuggestions = isExplicitSuggestionCompose(composeQuery.data)
  /** Published "View plan" must not show IA suggestion cards; draft edit keeps them. */
  const showIaSuggestions = shouldShowCarePlanIaSuggestions(instanceQuery.data?.displayStatus)

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
    if (hydrateFromPublished && (publishedVersionQuery.isLoading || !publishedVersionQuery.data)) return

    const draftValues = instanceQuery.data?.draft?.values
    const hydrated = hydrateCarePlanEditorValues({
      draftValues,
      publishedValues: hydrateFromPublished ? publishedVersionQuery.data?.values ?? null : undefined,
      compose: composeQuery.data,
    })
    if (hydrated === 'wait') return
    const seededDate = resolveEditorNextReviewDate({
      metaDate: typeof hydrated[CARE_PLAN_META.nextReviewDate] === 'string'
        ? (hydrated[CARE_PLAN_META.nextReviewDate] as string)
        : '',
      publishedNextReviewDueAt: instanceQuery.data?.nextReviewDueAt,
      defaultNextReviewDate: instanceQuery.data?.defaultNextReviewDate,
    })
    setValues(
      seededDate
        ? setMetaValue(hydrated, CARE_PLAN_META.nextReviewDate, seededDate)
        : hydrated,
    )
    setComposedFrom(
      hydrateComposedFromForEditor({
        // Published snapshot is the source of truth once the draft was consumed.
        draftComposedFrom: hydrateFromPublished
          ? publishedVersionQuery.data?.composedFrom
          : instanceQuery.data?.draft?.composedFrom,
        compose: hydrateFromPublished ? null : composeQuery.data,
      }),
    )
    setValuesHydrated(true)
  }, [
    valuesHydrated,
    instanceQuery.isLoading,
    instanceQuery.data,
    composeQuery.data,
    hydrateFromPublished,
    publishedVersionQuery.isLoading,
    publishedVersionQuery.data,
  ])

  const persistDraft = React.useCallback(
    (nextValues: CarePlanDraftValues, nextComposedFrom: Record<string, unknown>) => {
      return saveDraftMutation.mutateAsync({
        values: nextValues,
        composedFrom: nextComposedFrom,
        gaps: composeQuery.data?.gaps,
      })
    },
    [composeQuery.data?.gaps, saveDraftMutation],
  )

  const refreshFromSources = async () => {
    try {
      const compose = await fetchCarePlanCompose(serviceUserId, formId)
      void composeQuery.refetch()
      if (isExplicitSuggestionCompose(compose)) {
        toastSuccess('Refreshed', 'Suggestions updated from the latest assessment. Existing care plan values were not changed.')
        return
      }
      const mergedComposedFrom = hydrateComposedFromForEditor({
        draftComposedFrom: composedFrom,
        compose,
      })
      const mergeValues = isHybridCompose(compose)
        ? (current: Record<string, string | boolean>) =>
            mergeHybridRefreshValues(current, compose.values, mergedComposedFrom)
        : (current: Record<string, string | boolean>) =>
            mergeComposedValues(current, compose.values, 'empty_only')
      const nextValues = mergeValues(values)
      setValues((current) => mergeValues(current))
      setComposedFrom(mergedComposedFrom)
      await saveDraftMutation.mutateAsync({
        values: nextValues,
        composedFrom: mergedComposedFrom,
        gaps: compose.gaps,
      })
      toastSuccess(
        'Refreshed',
        isHybridCompose(compose)
          ? 'Empty fields updated from assessment. Review suggestions and prefilled values.'
          : 'Empty fields updated from assessment and profile sources.',
      )
    } catch (e) {
      toastApiError(e, 'Could not refresh from sources')
    }
  }

  const onValuesChange = (next: CarePlanDraftValues) => {
    const changedKey = Object.keys(next).find((key) => next[key] !== values[key])
    setValues(next)
    if (!changedKey) return
    setComposedFrom((current) => markProvenanceEdited(current, changedKey, next[changedKey] as string | boolean))
  }

  const onUseSuggestion = (suggestion: CarePlanFieldSuggestion) => {
    const nextValues = applySuggestionToValues(values, suggestion)
    const nextComposedFrom = mergeComposedFromOnUse({
      composedFrom,
      suggestion,
      acceptedById: actorId,
    })
    setValues(nextValues)
    setComposedFrom(nextComposedFrom)
    void persistDraft(nextValues, nextComposedFrom)
      .then(() => toastSuccess('Suggestion applied', 'The value was added to the care plan draft.'))
      .catch((e) => toastApiError(e, 'Could not save suggestion'))
  }

  const onIgnoreSuggestion = (suggestion: CarePlanFieldSuggestion) => {
    const nextComposedFrom = mergeComposedFromOnIgnore(composedFrom, suggestion.id)
    setComposedFrom(nextComposedFrom)
    void persistDraft(values, nextComposedFrom)
      .then(() => toastSuccess('Suggestion ignored', 'This suggestion is hidden for the current draft.'))
      .catch((e) => toastApiError(e, 'Could not save ignore'))
  }

  const onEditSuggestion = (suggestion: CarePlanFieldSuggestion) => {
    const nextValues = applySuggestionToValues(values, suggestion)
    const nextComposedFrom = mergeComposedFromOnEdit({
      composedFrom,
      suggestion,
      acceptedById: actorId,
    })
    setValues(nextValues)
    setComposedFrom(nextComposedFrom)
  }

  const onSaveDraft = () => {
    void persistDraft(values, composedFrom)
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
    void persistDraft(values, composedFrom)
      .then(() =>
        publishMutation.mutateAsync({
          gapAcknowledged: payload.gapAcknowledged,
          summary: payload.summary,
        }),
      )
      .then(async () => {
        setPublishOpen(false)
        toastSuccess('Care Plan published successfully')
        await navigate({
          to: '/service-users/$serviceUserId/care-plan',
          params: { serviceUserId },
        })
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
    loading ||
    ensuringInstance ||
    instanceQuery.isLoading ||
    (!valuesHydrated &&
      (composeQuery.isLoading || (hydrateFromPublished && publishedVersionQuery.isLoading)))

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
              {explicitSuggestions && composeQuery.data?.iaStatus === 'SUBMITTED' ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  Awaiting manager review
                </span>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{serviceUserDisplayName(detail)}</p>
          </div>
          {canUpdate ? (
            <div className="flex flex-wrap items-center gap-2">
              {explicitSuggestions ? (
                <CarePlanIaHistoryPanel
                  currentSubmittedAt={composeQuery.data?.suggestions?.[0]?.sourceDate ?? null}
                  currentStatus={composeQuery.data?.iaStatus}
                  previousAssessments={composeQuery.data?.previousAssessments ?? []}
                  disabled={!canUpdate}
                  onUseHistorical={onUseSuggestion}
                />
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refreshFromSources()}
                disabled={composeQuery.isFetching || saveDraftMutation.isPending}
              >
                {explicitSuggestions ? 'Refresh suggestions' : 'Refresh from IA / profile'}
              </Button>
            </div>
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
              fieldSources={explicitSuggestions ? {} : composeQuery.data?.fieldSources ?? {}}
              deltas={explicitSuggestions ? [] : composeQuery.data?.deltas ?? []}
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
                onChange={onValuesChange}
                readOnly={!canUpdate}
              />
            ) : null}

            <CarePlanFormWorkspace
              serviceUserId={serviceUserId}
              detail={detail}
              form={form}
              values={values}
              onChange={onValuesChange}
              disabled={!canUpdate}
              onCancel={backToList}
              onPublish={() => setPublishOpen(true)}
              onSaveDraft={onSaveDraft}
              saving={saveDraftMutation.isPending || publishMutation.isPending}
              suggestions={showIaSuggestions ? composeQuery.data?.suggestions : undefined}
              ignoredSuggestionIds={showIaSuggestions ? readIgnoredSuggestionIds(composedFrom) : undefined}
              composedFrom={composedFrom}
              onUseSuggestion={showIaSuggestions ? onUseSuggestion : undefined}
              onIgnoreSuggestion={showIaSuggestions ? onIgnoreSuggestion : undefined}
              onKeepCurrentSuggestion={showIaSuggestions ? onIgnoreSuggestion : undefined}
              onEditSuggestion={showIaSuggestions ? onEditSuggestion : undefined}
              defaultNextReviewDate={instanceQuery.data?.defaultNextReviewDate}
              publishedNextReviewDueAt={instanceQuery.data?.nextReviewDueAt}
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
