import * as React from 'react'
import { cn } from '@/shared/lib/utils'
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
  /** `grid`: compact two-column cards with collapsible triggers (IA "Actions & care plans" tab). */
  layout?: 'full' | 'lifecycle' | 'grid'
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
  // Every recommendation the open dialog decides: a grouped card decides all of its recommendations.
  const [activeRecs, setActiveRecs] = React.useState<CarePlanRecommendation[]>([])
  const [creatingFormId, setCreatingFormId] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<DecisionMode>('accept')
  const [reason, setReason] = React.useState('')
  const reviewPending = submissionStatus === 'SUBMITTED'
  const [proceedAnyway, setProceedAnyway] = React.useState(false)
  const [pendingCreateFormId, setPendingCreateFormId] = React.useState<string | null>(null)

  const decideMutation = useMutation({
    mutationFn: async (input: {
      recommendationIds: string[]
      decision: 'accepted' | 'declined' | 'deferred'
      reason?: string
    }) => {
      for (const recommendationId of input.recommendationIds) {
        await decideInitialAssessmentCarePlanRecommendation(serviceUserId, submissionId!, recommendationId, {
          decision: input.decision,
          reason: input.reason,
        })
      }
    },
    onSuccess: () => {
      toastSuccess('Updated', 'Care plan recommendation decision saved.')
      setDialogOpen(false)
      setReason('')
      setActiveRecs([])
    },
    // Refresh even after a partial failure so every card shows what was actually saved.
    onSettled: () => {
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.summary(serviceUserId, submissionId ?? ''),
      })
      // Accepting creates or links a care plan.
      void qc.invalidateQueries({ queryKey: serviceUserKeys.carePlan(serviceUserId) })
      void qc.invalidateQueries({
        queryKey: initialAssessmentKeys.acceptedCarePlans(serviceUserId),
      })
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
          : data.suggestionMode === 'hybrid'
            ? 'Care plan draft prefilled from assessment. Review suggestions for remaining fields.'
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

  const openCarePlan = (formId: string) =>
    void navigate({
      to: '/service-users/$serviceUserId/care-plan/forms/$formId',
      params: { serviceUserId, formId },
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

  const openDialog = (recs: CarePlanRecommendation[], nextMode: DecisionMode) => {
    setActiveRecs(recs)
    setMode(nextMode)
    setReason('')
    setDialogOpen(true)
  }

  const lifecycle = layout === 'lifecycle'
  const grid = layout === 'grid'
  const [openTriggers, setOpenTriggers] = React.useState<Set<string>>(() => new Set())
  const toggleTriggers = (id: string) =>
    setOpenTriggers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
          No pending care plan recommendations.
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
        <ul
          className={
            lifecycle
              ? 'grid items-stretch gap-2 sm:grid-cols-2 lg:grid-cols-3'
              : grid
                ? 'grid items-start gap-3 md:grid-cols-2'
                : 'space-y-3'
          }
        >
          {lifecycle
            ? lifecycleGroups.map((group) => {
                const primary = group.recs[0]!
                const creating = createDraftMutation.isPending && creatingFormId === group.formId
                const showCreate = Boolean(canCreate || primary.status === 'accepted' || !group.formId)
                return (
                  <li
                    key={group.key}
                    className="flex h-full min-w-0 flex-col rounded border border-[#c5cdd6] bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-card"
                    data-testid={`recommended-card-${(group.name || 'plan').replace(/\s+/g, '-').toLowerCase()}`}
                  >
                    <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-1.5">
                      <p className="text-[13px] font-medium leading-snug text-[#1e293b] dark:text-foreground">{group.name}</p>
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
                            onClick={() => openDialog(group.recs, 'decline')}
                          >
                            Decline
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(group.recs, 'defer')}
                          >
                            Defer
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openDialog(group.recs, 'accept')}
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
              className={cn(
                'rounded-xl border border-teal-200/80 bg-teal-50/40 dark:border-teal-900 dark:bg-teal-950/20',
                grid ? 'p-3' : 'p-4',
              )}
              data-testid="ia-care-plan-recommendation-card"
            >
              <div className={cn('flex flex-col gap-2', grid && 'sm:flex-row sm:items-start sm:justify-between')}>
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
                            : rec.status === 'deferred'
                              ? 'rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                              : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                        }
                      >
                        {rec.status === 'accepted' ? 'Accepted' : rec.status === 'deferred' ? 'Deferred' : 'Declined'}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {grid ? (
                      <button
                        type="button"
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                        aria-expanded={openTriggers.has(rec.id)}
                        onClick={() => toggleTriggers(rec.id)}
                      >
                        {rec.triggerCount} trigger{rec.triggerCount > 1 ? 's' : ''} {openTriggers.has(rec.id) ? '▾' : '▸'}
                      </button>
                    ) : (
                      <>
                        {rec.triggerCount} trigger{rec.triggerCount > 1 ? 's' : ''}
                      </>
                    )}{' '}
                    ·{' '}
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
                  {rec.status === 'deferred' && rec.decisionReason ? (
                    <p className="mt-2 text-xs text-muted-foreground">Deferred: {rec.decisionReason}</p>
                  ) : null}
                  {rec.linkedCarePlan ? (
                    <p className="mt-2 text-xs text-muted-foreground" data-testid="ia-care-plan-linked-plan">
                      Care plan: {linkedCarePlanLabel(rec.linkedCarePlan)}
                      {rec.status !== 'accepted' && rec.linkedCarePlanReviewRequired
                        ? ' — kept after this decision changed; review whether it is still needed.'
                        : ''}
                    </p>
                  ) : null}
                  {!grid || openTriggers.has(rec.id) ? (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {rec.triggers.slice(0, grid ? rec.triggers.length : triggerLimit).map((t) => (
                      <li key={t.questionId}>
                        {t.specRef ? `${t.specRef} · ` : ''}
                        {t.questionText}
                      </li>
                    ))}
                    {!grid && rec.triggers.length > triggerLimit ? (
                      <li>+{rec.triggers.length - triggerLimit} more</li>
                    ) : null}
                  </ul>
                  ) : null}
                </div>
                {canDecide && submissionId && (rec.status === 'pending' || rec.status === 'deferred') ? (
                  <div className={cn('flex flex-wrap gap-2', grid && 'sm:shrink-0 sm:justify-end')}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog([rec], 'decline')}
                    >
                      Decline
                    </Button>
                    {rec.status === 'pending' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openDialog([rec], 'defer')}
                      >
                        Defer
                      </Button>
                    ) : null}
                    <Button type="button" size="sm" onClick={() => openDialog([rec], 'accept')}>
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
                ) : rec.linkedCarePlan ? (
                  <div className={cn(grid ? 'flex justify-end sm:shrink-0' : 'contents')}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      data-testid="open-linked-care-plan"
                      onClick={() => openCarePlan(rec.linkedCarePlan!.carePathwayFormId)}
                    >
                      Open Care Plan
                    </Button>
                  </div>
                ) : rec.status === 'declined' ? null : canCreate || rec.status === 'accepted' ? (
                  <div className={cn(grid ? 'flex justify-end sm:shrink-0' : 'contents')}>
                  <CreateCarePlanButton
                    rec={rec}
                    pending={createDraftMutation.isPending && creatingFormId === rec.carePathwayFormId}
                    onCreate={requestCreate}
                    label={createLabel}
                  />
                  </div>
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
        title={activeRecs.map((r) => r.title).join(', ')}
        mode={mode}
        reason={reason}
        onReasonChange={setReason}
        submitting={decideMutation.isPending}
        onConfirm={() => {
          if (activeRecs.length === 0) return
          void decideMutation.mutateAsync({
            recommendationIds: activeRecs.map((r) => r.id),
            decision: mode === 'accept' ? 'accepted' : mode === 'defer' ? 'deferred' : 'declined',
            reason: mode === 'accept' ? undefined : reason.trim(),
          })
        }}
      />
    </>
  )
}

type DecisionMode = 'accept' | 'decline' | 'defer'

function linkedCarePlanLabel(plan: NonNullable<CarePlanRecommendation['linkedCarePlan']>): string {
  if (plan.status === 'PUBLISHED') return plan.hasDraft ? 'Published (draft changes in progress)' : 'Published'
  return 'Draft'
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
