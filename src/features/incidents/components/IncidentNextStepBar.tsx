import * as React from 'react'
import { ArrowRight, Lock, Play, RotateCcw, Undo2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { useChangeIncidentStatus, useStartIncidentReview } from '@/features/incidents/hooks/useIncidents'
import type { IncidentSeverity, IncidentStatus } from '@/features/incidents/types'

type StepAction = {
  key: string
  label: string
  icon: React.ReactNode
  to?: IncidentStatus
  /** Start review uses its own endpoint (owner + reviewStartedAt). */
  startReview?: boolean
  /** Opens the Review tab instead of changing the status. */
  goToReview?: boolean
  /** Ask for a reason before moving (reopen / send back). */
  reasonTitle?: string
  /** Close despite incomplete mandatory measures (audited, needs a reason). */
  overrideMandatory?: boolean
  primary?: boolean
  disabledReason?: string
  hidden?: boolean
}

/**
 * The single place to move an incident through its workflow. Only the buttons that make sense
 * for the current status (and the user's permissions) are shown; the API re-checks every rule.
 */
export function IncidentNextStepBar({
  incidentId,
  status,
  severity,
  hasFinalOutcome,
  openMandatoryActions,
  canReview,
  canClose,
  canReopen,
  onGoToReview,
  onReviewTab = false,
}: {
  incidentId: string
  status: IncidentStatus
  severity: IncidentSeverity
  hasFinalOutcome: boolean
  /** Mandatory corrective actions not yet completed. */
  openMandatoryActions: number
  canReview: boolean
  canClose: boolean
  canReopen: boolean
  onGoToReview?: () => void
  /** The Review tab is already open, so "Go to review" is not needed. */
  onReviewTab?: boolean
}) {
  const statusMutation = useChangeIncidentStatus(incidentId)
  const startReview = useStartIncidentReview(incidentId)
  const [reasonFor, setReasonFor] = React.useState<StepAction | null>(null)
  const [reason, setReason] = React.useState('')
  const busy = statusMutation.isPending || startReview.isPending

  // Mirrors the API: incomplete mandatory measures block High/Critical closure unless overridden.
  const blockingMandatory =
    severity === 'HIGH' || severity === 'CRITICAL' ? openMandatoryActions : 0
  const { hint, actions } = describe(status, {
    hasFinalOutcome,
    blockingMandatory,
    openMandatoryActions,
    canReview,
    canClose,
    canReopen,
    onReviewTab,
  })
  const visible = actions.filter((a) => !a.hidden)

  function run(action: StepAction) {
    if (action.goToReview) {
      onGoToReview?.()
      return
    }
    if (action.startReview) {
      startReview.mutate()
      return
    }
    if (action.reasonTitle) {
      setReason('')
      setReasonFor(action)
      return
    }
    if (action.to) statusMutation.mutate({ status: action.to, reason: action.label })
  }

  function confirmReason() {
    if (!reasonFor?.to || !reason.trim()) return
    statusMutation.mutate(
      {
        status: reasonFor.to,
        reason: reason.trim(),
        ...(reasonFor.overrideMandatory ? { overrideMandatoryActions: true } : {}),
      },
      { onSuccess: () => setReasonFor(null) },
    )
  }

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 shadow-sm" data-testid="incident-next-step">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Next step</p>
          <p className="mt-0.5 text-sm text-foreground">{hint}</p>
        </div>
        {visible.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {visible.map((a) => (
              <Button
                key={a.key}
                size="sm"
                variant={a.primary ? 'default' : 'outline'}
                disabled={busy || Boolean(a.disabledReason)}
                title={a.disabledReason}
                loading={busy && a.primary}
                onClick={() => run(a)}
              >
                {a.icon}
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      {visible.find((a) => a.disabledReason) && (
        <p className="mt-2 text-xs text-muted-foreground">{visible.find((a) => a.disabledReason)?.disabledReason}</p>
      )}

      <Dialog open={Boolean(reasonFor)} onOpenChange={(o) => !o && setReasonFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{reasonFor?.reasonTitle}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {reasonFor?.overrideMandatory && (
              <p className="mb-3 rounded-md border border-warning/40 bg-warning/10 p-2 text-sm text-warning">
                {blockingMandatory} mandatory corrective measure{blockingMandatory === 1 ? ' is' : 's are'} not
                complete. Closing now overrides {blockingMandatory === 1 ? 'it' : 'them'}; the reason is kept in the
                audit log.
              </p>
            )}
            <label htmlFor="next-step-reason" className="mb-1 block text-sm font-medium text-foreground">
              Reason<span className="ml-0.5 text-destructive dark:text-red-400">*</span>
            </label>
            <Textarea
              id="next-step-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. new information from the family, action not effective"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonFor(null)}>
              Cancel
            </Button>
            <Button disabled={!reason.trim()} loading={statusMutation.isPending} onClick={confirmReason}>
              {reasonFor?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function describe(
  status: IncidentStatus,
  ctx: {
    hasFinalOutcome: boolean
    /** Incomplete mandatory measures that block closing (High / Critical only). */
    blockingMandatory: number
    openMandatoryActions: number
    canReview: boolean
    canClose: boolean
    canReopen: boolean
    onReviewTab: boolean
  },
): { hint: string; actions: StepAction[] } {
  const arrow = <ArrowRight className="mr-1 h-4 w-4" />
  const back = <Undo2 className="mr-1 h-4 w-4" />
  const noReview = !ctx.canReview
  switch (status) {
    case 'REPORTED':
      return {
        hint: 'Not picked up yet. Start the review to take ownership of this incident.',
        actions: [
          { key: 'start', label: 'Start review', icon: <Play className="mr-1 h-4 w-4" />, startReview: true, primary: true, hidden: noReview },
        ],
      }
    case 'UNDER_REVIEW':
    case 'REOPENED':
      // The decision is made in the review itself, so it is recorded with the review.
      return ctx.onReviewTab
        ? { hint: 'Complete the review below and choose whether to investigate.', actions: [] }
        : {
            hint: 'Complete the review and choose whether to investigate.',
            actions: [
              { key: 'go-review', label: 'Go to review', icon: arrow, goToReview: true, primary: true, hidden: noReview },
            ],
          }
    case 'UNDER_INVESTIGATION':
      return {
        hint: 'Complete the investigation. Add corrective actions if needed, otherwise move it to ready to close.',
        actions: [
          { key: 'actions', label: 'Actions required', icon: arrow, to: 'ACTIONS_REQUIRED', primary: true, hidden: noReview },
          { key: 'ready', label: 'Ready to close', icon: arrow, to: 'AWAITING_CLOSURE', hidden: noReview },
        ],
      }
    case 'ACTIONS_REQUIRED':
      return {
        hint:
          ctx.openMandatoryActions > 0
            ? `${ctx.openMandatoryActions} mandatory corrective action${ctx.openMandatoryActions === 1 ? '' : 's'} still open.`
            : 'All mandatory corrective actions are complete.',
        actions: [
          { key: 'ready', label: 'Ready to close', icon: arrow, to: 'AWAITING_CLOSURE', primary: true, hidden: noReview },
          { key: 'back', label: 'Back to investigation', icon: back, to: 'UNDER_INVESTIGATION', reasonTitle: 'Send back for investigation', hidden: noReview },
        ],
      }
    case 'AWAITING_CLOSURE':
      return {
        hint: !ctx.hasFinalOutcome
          ? 'Record the final outcome below, then close the incident.'
          : ctx.blockingMandatory > 0
            ? `${ctx.blockingMandatory} mandatory corrective measure${ctx.blockingMandatory === 1 ? ' is' : 's are'} still open. Complete ${ctx.blockingMandatory === 1 ? 'it' : 'them'}, or close with a reason.`
            : 'The final outcome is recorded. Close the incident.',
        actions: [
          {
            key: 'close',
            label: 'Close incident',
            icon: <Lock className="mr-1 h-4 w-4" />,
            to: 'CLOSED',
            primary: true,
            hidden: !ctx.canClose,
            disabledReason: ctx.hasFinalOutcome ? undefined : 'Save the final outcome first (Outcome & close section).',
            ...(ctx.blockingMandatory > 0
              ? { reasonTitle: 'Close with incomplete mandatory measures', overrideMandatory: true }
              : {}),
          },
          { key: 'back', label: 'Send back for investigation', icon: back, to: 'UNDER_INVESTIGATION', reasonTitle: 'Send back for investigation', hidden: noReview },
        ],
      }
    case 'CLOSED':
      return {
        hint: 'This incident is closed and read-only. Reopen it to make changes.',
        actions: [
          { key: 'reopen', label: 'Reopen', icon: <RotateCcw className="mr-1 h-4 w-4" />, to: 'UNDER_REVIEW', reasonTitle: 'Reopen incident', hidden: !ctx.canReopen },
        ],
      }
    default:
      return { hint: '', actions: [] }
  }
}
