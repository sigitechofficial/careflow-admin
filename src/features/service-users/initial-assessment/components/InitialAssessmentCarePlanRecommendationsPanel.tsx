import * as React from 'react'
import { AlertTriangle, FileText, Loader2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { decideInitialAssessmentCarePlanRecommendation } from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import { createCarePlanDraftFromCompose } from '@/features/service-users/care-plans/api'
import { serviceUserKeys } from '@/features/service-users/keys'
import type {
  CarePlanRecommendation,
  InitialAssessmentStatus,
} from '@/features/service-users/initial-assessment/types'
import { InitialAssessmentCarePlanDecisionDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentCarePlanDecisionDialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { groupPendingRecommendationsByForm } from '@/features/service-users/care-plan/care-plan-display-state'
import { RecommendedEvidenceList } from '@/features/service-users/care-plan/RecommendedEvidenceList'

type Props = {
  serviceUserId: string
  submissionId: string | null
  recommendations: CarePlanRecommendation[]
  submissionStatus?: InitialAssessmentStatus
  canDecide?: boolean
  /** Create a care plan draft from a recommendation without waiting for accept. */
  canCreate?: boolean
  onGoToSection?: (sectionNumber: number) => void
  /**
   * `lifecycle` is used on the Care Plan page: pending recs only, quieter
   * review notice, card styling aligned with catalogue tiles.
   */
  layout?: 'full' | 'lifecycle'
  /** When set with layout=lifecycle, only pending recs for these forms (plus uncatalogued) are shown. */
  includePendingFormIds?: ReadonlySet<string>
  cataloguedFormIds?: ReadonlySet<string>
}

export function InitialAssessmentCarePlanRecommendationsPanel({
  serviceUserId,
  submissionId,
  recommendations,
  submissionStatus,
  canDecide = false,
  canCreate = false,
  onGoToSection,
  layout = 'full',
  includePendingFormIds,
  cataloguedFormIds,
}: Props) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [activeRec, setActiveRec] = React.useState<CarePlanRecommendation | null>(null)
  const [creatingFormId, setCreatingFormId] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<'accept' | 'decline'>('accept')
  const [reason, setReason] = React.useState('')
  const reviewPending = submissionStatus === 'SUBMITTED'
  const [proceedAnyway, setProceedAnyway] = React.useState(false)
  const [pendingCreateFormId, setPendingCreateFormId] = React.useState<string | null>(null)

  const decideMutation = useMutation({
    mutationFn: (input: { recommendationId: string; decision: 'accepted' | 'declined'; reason?: string }) =>
      decideInitialAssessmentCarePlanRecommendation(
        serviceUserId,
        submissionId!,
        input.recommendationId,
        { decision: input.decision, reason: input.reason },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.summary(serviceUserId, submissionId ?? ''),
      })
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.acceptedCarePlans(serviceUserId),
      })
      toastSuccess('Updated', 'Care plan recommendation decision saved.')
      setDialogOpen(false)
      setReason('')
      setActiveRec(null)
    },
    onError: (e) => toastApiError(e, 'Could not save decision'),
  })

  const createDraftMutation = useMutation({
    mutationFn: (formId: string) => createCarePlanDraftFromCompose(serviceUserId, formId),
    onMutate: (formId) => {
      setCreatingFormId(formId)
    },
    onSuccess: (data, formId) => {
      void qc.invalidateQueries({ queryKey: serviceUserKeys.carePlan(serviceUserId) })
      toastSuccess(
        'Draft created',
        data.suggestionMode === 'explicit'
          ? 'Care plan draft is ready. Review suggestions before saving or publishing.'
          : 'Care plan draft prefilled from assessment sources.',
      )
      void navigate({
        to: '/service-users/$serviceUserId/care-plan/forms/$formId',
        params: { serviceUserId, formId },
      })
    },
    onError: (e) => toastApiError(e, 'Could not create care plan draft'),
    onSettled: () => setCreatingFormId(null),
  })

  const requestCreate = (formId: string) => {
    if (reviewPending && !proceedAnyway) {
      setPendingCreateFormId(formId)
      return
    }
    void createDraftMutation.mutateAsync(formId)
  }

  const confirmProceedAndCreate = () => {
    const formId = pendingCreateFormId
    setProceedAnyway(true)
    setPendingCreateFormId(null)
    if (formId) void createDraftMutation.mutateAsync(formId)
  }

  const openDialog = (rec: CarePlanRecommendation, nextMode: 'accept' | 'decline') => {
    setActiveRec(rec)
    setMode(nextMode)
    setReason('')
    setDialogOpen(true)
  }

  const lifecycle = layout === 'lifecycle'
  const visibleRecommendations = lifecycle
    ? includePendingFormIds && cataloguedFormIds
      ? recommendations.filter((rec) => {
          if (rec.status !== 'pending') return false
          if (!rec.carePathwayFormId) return true
          if (includePendingFormIds.has(rec.carePathwayFormId)) return true
          return !cataloguedFormIds.has(rec.carePathwayFormId)
        })
      : recommendations.filter((rec) => rec.status === 'pending')
    : recommendations
  const createLabel = lifecycle ? 'Create Plan' : 'Create care plan'
  const triggerLimit = lifecycle ? 2 : 4
  const lifecycleGroups = lifecycle ? groupPendingRecommendationsByForm(visibleRecommendations) : []

  if (visibleRecommendations.length === 0) {
    if (lifecycle) {
      return (
        <p className="text-sm text-muted-foreground" data-testid="ia-care-plan-recommendations-empty">
          No pending care plan recommendations from the latest Initial Assessment.
        </p>
      )
    }
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          No care plan updates recommended yet — triggers appear when flagged answers are saved.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3" data-testid="ia-care-plan-recommendations">
        {lifecycle ? null : (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-700 dark:text-teal-300" aria-hidden />
            <h3 className="text-sm font-semibold">Care plan recommendations ({visibleRecommendations.length})</h3>
          </div>
        )}
        {reviewPending && lifecycle ? (
          <p className="text-xs text-muted-foreground" data-testid="ia-care-plan-awaiting-review" role="status">
            Awaiting manager review. Create Plan remains available; the plan may need revisiting after
            review.
          </p>
        ) : null}
        {reviewPending && !lifecycle ? (
          <div
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
            data-testid="ia-care-plan-review-pending-warning"
            role="status"
          >
            <div className="flex min-w-0 items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p className="text-sm">
                Manager review is pending. Care plans created now may need revisiting after the
                assessment is marked reviewed.
              </p>
            </div>
            {canCreate && !proceedAnyway ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 border-amber-400 bg-white text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-50"
                data-testid="ia-care-plan-proceed-anyway"
                onClick={() => setProceedAnyway(true)}
              >
                Proceed anyway
              </Button>
            ) : canCreate && proceedAnyway ? (
              <p className="shrink-0 text-xs font-medium">Proceeding without manager review.</p>
            ) : null}
          </div>
        ) : null}
        <ul className={lifecycle ? 'grid items-stretch gap-2 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
          {lifecycle
            ? lifecycleGroups.map((group) => {
                const primary = group.recs[0]!
                const creating = createDraftMutation.isPending && creatingFormId === group.formId
                const showCreate = Boolean(canCreate || primary.status === 'accepted' || !group.formId)
                return (
                  <li
                    key={group.key}
                    className="flex h-full min-w-0 flex-col rounded border border-[#c5cdd6] bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
                    data-testid={`recommended-card-${(group.name || 'plan').replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-1.5">
                      <p className="text-[13px] font-medium leading-snug text-[#1e293b]">{group.name}</p>
                      <Badge variant="warning" size="sm" className="font-normal">
                        Recommended
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {group.triggerCount} trigger{group.triggerCount === 1 ? '' : 's'} from Initial
                      Assessment
                    </p>
                    <RecommendedEvidenceList triggers={group.triggers} />
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-end gap-1.5 pt-2">
                      {canDecide && submissionId && primary.status === 'pending' ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(primary, 'decline')}
                          >
                            Decline
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(primary, 'accept')}
                          >
                            Accept
                          </Button>
                        </>
                      ) : null}
                      {showCreate ? (
                        <CreateCarePlanButton
                          rec={primary}
                          pending={creating}
                          onCreate={requestCreate}
                          label={createLabel}
                        />
                      ) : null}
                    </div>
                  </li>
                )
              })
            : visibleRecommendations.map((rec) => (
            <li
              key={rec.id}
              className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-4 dark:border-teal-900 dark:bg-teal-950/20"
            >
              <div className="flex flex-col gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-medium text-sm">{rec.title}</p>
                    {rec.carePathwayFormName ? (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900 dark:bg-teal-900 dark:text-teal-100">
                        {rec.carePathwayFormName}
                      </span>
                    ) : null}
                    {rec.status !== 'pending' ? (
                      <span
                        className={
                          rec.status === 'accepted'
                            ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                            : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                        }
                      >
                        {rec.status === 'accepted' ? 'Accepted' : 'Declined'}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {rec.triggerCount} trigger{rec.triggerCount > 1 ? 's' : ''} ·{' '}
                    {onGoToSection ? (
                      <button
                        type="button"
                        className="text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
                        onClick={() => onGoToSection(rec.sectionNumber)}
                      >
                        §{rec.sectionNumber} {rec.sectionTitle}
                      </button>
                    ) : (
                      <>
                        §{rec.sectionNumber} {rec.sectionTitle}
                      </>
                    )}
                  </p>
                  {rec.status === 'declined' && rec.declineReason ? (
                    <p className="mt-2 text-xs text-muted-foreground">Decline reason: {rec.declineReason}</p>
                  ) : null}
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {rec.triggers.slice(0, triggerLimit).map((t) => (
                      <li key={t.questionId}>
                        {t.specRef ? `${t.specRef} · ` : ''}
                        {t.questionText}
                      </li>
                    ))}
                    {rec.triggers.length > triggerLimit ? (
                      <li>+{rec.triggers.length - triggerLimit} more</li>
                    ) : null}
                  </ul>
                </div>
                {canDecide && submissionId && rec.status === 'pending' ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(rec, 'decline')}
                    >
                      Decline
                    </Button>
                    <Button type="button" size="sm" onClick={() => openDialog(rec, 'accept')}>
                      Accept
                    </Button>
                    {canCreate ? (
                      <CreateCarePlanButton
                        rec={rec}
                        pending={createDraftMutation.isPending && creatingFormId === rec.carePathwayFormId}
                        onCreate={requestCreate}
                        label={createLabel}
                      />
                    ) : null}
                  </div>
                ) : rec.status === 'declined' ? null : canCreate || rec.status === 'accepted' ? (
                  <CreateCarePlanButton
                    rec={rec}
                    pending={createDraftMutation.isPending && creatingFormId === rec.carePathwayFormId}
                    onCreate={requestCreate}
                    label={createLabel}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <AlertDialog
        open={Boolean(pendingCreateFormId)}
        onOpenChange={(open) => {
          if (!open) setPendingCreateFormId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manager review is pending</AlertDialogTitle>
            <AlertDialogDescription>
              This initial assessment has not been marked reviewed yet. You can still create a care
              plan draft now; it may need revisiting after manager review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={(e) => {
                e.preventDefault()
                confirmProceedAndCreate()
              }}
            >
              Proceed anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InitialAssessmentCarePlanDecisionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={activeRec?.title ?? ''}
        mode={mode}
        reason={reason}
        onReasonChange={setReason}
        submitting={decideMutation.isPending}
        onConfirm={() => {
          if (!activeRec) return
          void decideMutation.mutateAsync({
            recommendationId: activeRec.id,
            decision: mode === 'accept' ? 'accepted' : 'declined',
            reason: mode === 'decline' ? reason.trim() : undefined,
          })
        }}
      />
    </>
  )
}

function CreateCarePlanButton({
  rec,
  pending,
  onCreate,
  label = 'Create care plan',
}: {
  rec: CarePlanRecommendation
  pending: boolean
  onCreate: (formId: string) => void
  label?: string
}) {
  if (!rec.carePathwayFormId) {
    return (
      <Button type="button" variant="outline" size="sm" disabled title="No care plan form linked">
        {label}
      </Button>
    )
  }
  return (
    <Button
      type="button"
      size="sm"
      className="shrink-0"
      disabled={pending}
      data-testid="create-care-plan-from-recommendation"
      onClick={() => onCreate(rec.carePathwayFormId!)}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : label}
    </Button>
  )
}
