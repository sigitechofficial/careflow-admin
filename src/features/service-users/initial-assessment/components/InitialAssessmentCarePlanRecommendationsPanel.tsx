import * as React from 'react'
import { FileText } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui/button'
import { decideInitialAssessmentCarePlanRecommendation } from '@/features/service-users/initial-assessment/api'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import type { CarePlanRecommendation } from '@/features/service-users/initial-assessment/types'
import { InitialAssessmentCarePlanDecisionDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentCarePlanDecisionDialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'

type Props = {
  serviceUserId: string
  submissionId: string | null
  recommendations: CarePlanRecommendation[]
  canDecide?: boolean
  onGoToSection?: (sectionNumber: number) => void
}

export function InitialAssessmentCarePlanRecommendationsPanel({
  serviceUserId,
  submissionId,
  recommendations,
  canDecide = false,
  onGoToSection,
}: Props) {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [activeRec, setActiveRec] = React.useState<CarePlanRecommendation | null>(null)
  const [mode, setMode] = React.useState<'accept' | 'decline'>('accept')
  const [reason, setReason] = React.useState('')

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
      toastSuccess('Updated', 'Care plan recommendation decision saved.')
      setDialogOpen(false)
      setReason('')
      setActiveRec(null)
    },
    onError: (e) => toastApiError(e, 'Could not save decision'),
  })

  const openDialog = (rec: CarePlanRecommendation, nextMode: 'accept' | 'decline') => {
    setActiveRec(rec)
    setMode(nextMode)
    setReason('')
    setDialogOpen(true)
  }

  if (recommendations.length === 0) {
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
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-teal-700 dark:text-teal-300" aria-hidden />
          <h3 className="text-sm font-semibold">Care plan recommendations ({recommendations.length})</h3>
        </div>
        <ul className="space-y-3">
          {recommendations.map((rec) => (
            <li
              key={rec.id}
              className="rounded-xl border border-teal-200/80 bg-teal-50/40 p-4 dark:border-teal-900 dark:bg-teal-950/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
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
                      <>§{rec.sectionNumber} {rec.sectionTitle}</>
                    )}
                  </p>
                  {rec.status === 'declined' && rec.declineReason ? (
                    <p className="mt-2 text-xs text-muted-foreground">Decline reason: {rec.declineReason}</p>
                  ) : null}
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {rec.triggers.slice(0, 4).map((t) => (
                      <li key={t.questionId}>
                        {t.specRef ? `${t.specRef} · ` : ''}
                        {t.questionText}
                      </li>
                    ))}
                    {rec.triggers.length > 4 ? (
                      <li>+{rec.triggers.length - 4} more triggers</li>
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
                  </div>
                ) : rec.status === 'accepted' ? (
                  <Button type="button" variant="outline" size="sm" disabled title="Care plan draft in a later phase">
                    Create care plan
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

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
