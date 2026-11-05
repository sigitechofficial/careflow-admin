import * as React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Label, Textarea } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { TimeCriticalDot, timeCriticalLabel } from '@/features/service-users/visit-plan/TimeCriticalDot'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { useCancelHousekeepingJob } from '@/features/scheduling/hooks/useSchedulingMutations'
import { useHousekeepingCancellationPolicy } from '@/features/scheduling/hooks/useScheduling'
import { resolveJobTimeCritical } from '@/features/scheduling/utils/schedule-job-time-critical.util'
import {
  cancellationRequiresNotification,
  cancellationRequiresWelfare,
  VISIT_CANCELLATION_REASONS,
  VISIT_CHARGE_DECISION_OPTIONS,
  visitCancellationReasonMeta,
  type CancelHousekeepingJobPayload,
  type JobCancellationOutcome,
  type VisitCancellationReasonCode,
  type VisitChargeDecision,
} from '@/features/scheduling/utils/visit-cancellation.constants'
import { formatJobTimeRange, serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: TimelineJob | null
  visitPlanSlotsByServiceUser?: Map<string, VisitPlanSlot[]>
  onCancelled?: () => void
}

const DEFAULT_REASON: VisitCancellationReasonCode = 'CLIENT_REQUEST'

export function ScheduleJobCancelDialog({
  open,
  onOpenChange,
  job,
  visitPlanSlotsByServiceUser,
  onCancelled,
}: Props) {
  const cancelJob = useCancelHousekeepingJob()
  const timeCritical = job ? resolveJobTimeCritical(job, visitPlanSlotsByServiceUser) : null
  const timeCriticalVisit = Boolean(timeCritical)

  const [reasonCode, setReasonCode] = React.useState<VisitCancellationReasonCode>(DEFAULT_REASON)
  const [reasonNotes, setReasonNotes] = React.useState('')
  const [outcome, setOutcome] = React.useState<JobCancellationOutcome>('CANCELLED')
  const [welfareChecked, setWelfareChecked] = React.useState(false)
  const [familyNotified, setFamilyNotified] = React.useState(false)
  const [commissionerNotified, setCommissionerNotified] = React.useState(false)
  const [chargeDecision, setChargeDecision] = React.useState<VisitChargeDecision>('PENDING_REVIEW')
  const [chargeDecisionNotes, setChargeDecisionNotes] = React.useState('')
  // Billing notes the cancellation rules filled in, so a later suggestion can replace them but never the office's own text.
  const autoChargeNotes = React.useRef('')

  React.useEffect(() => {
    if (!open || !job) return
    const meta = visitCancellationReasonMeta(DEFAULT_REASON)
    setReasonCode(DEFAULT_REASON)
    setReasonNotes('')
    setOutcome(meta.defaultOutcome)
    setWelfareChecked(false)
    setFamilyNotified(false)
    setCommissionerNotified(false)
    setChargeDecision(meta.suggestedCharge)
    setChargeDecisionNotes('')
    autoChargeNotes.current = ''
  }, [open, job?.id])

  // Job Cancellation rules (Settings → Dom Care Settings): notice worked out on the server from the planned start.
  const policyQuery = useHousekeepingCancellationPolicy(job?.id, reasonCode, open)
  const policy = policyQuery.data
  React.useEffect(() => {
    if (!policy) return
    if (policy.applies && policy.suggestedDecision) setChargeDecision(policy.suggestedDecision)
    const note = policy.applies && policy.suggestedDecision === 'CHARGE' ? (policy.explanation ?? '') : ''
    setChargeDecisionNotes(current => (current.trim() === '' || current === autoChargeNotes.current ? note : current))
    autoChargeNotes.current = note
  }, [policy])

  const reasonMeta = visitCancellationReasonMeta(reasonCode)
  const needsWelfare = cancellationRequiresWelfare({ timeCriticalVisit, outcome, reasonCode })
  const needsNotification = cancellationRequiresNotification({
    timeCriticalVisit,
    familyNotified,
    commissionerNotified,
  })

  const applyReasonDefaults = (code: VisitCancellationReasonCode) => {
    const meta = visitCancellationReasonMeta(code)
    setReasonCode(code)
    setOutcome(meta.defaultOutcome)
    setChargeDecision(meta.suggestedCharge)
  }

  const handleSubmit = async () => {
    if (!job) return
    if (reasonMeta.requiresNotes && !reasonNotes.trim()) {
      toastWarning('Add reason notes', 'Please describe why this visit is being cancelled.')
      return
    }
    if (needsWelfare && !welfareChecked) {
      toastWarning(
        'Confirm welfare check',
        timeCriticalVisit
          ? 'Welfare review is required for time-critical visits.'
          : 'Confirm a welfare/risk review was completed.',
      )
      return
    }
    if (needsNotification) {
      toastWarning(
        'Confirm notification',
        'Time-critical visits require family/representative or commissioner notification.',
      )
      return
    }
    if (chargeDecision === 'CHARGE' && !chargeDecisionNotes.trim() && !reasonNotes.trim()) {
      toastWarning('Billing notes required', 'Add notes explaining why this cancelled visit is chargeable.')
      return
    }

    const payload: CancelHousekeepingJobPayload = {
      reasonCode,
      reasonNotes: reasonNotes.trim() || undefined,
      outcome,
      welfareChecked,
      familyNotified,
      commissionerNotified,
      chargeDecision,
      chargeDecisionNotes: chargeDecisionNotes.trim() || undefined,
    }

    try {
      await cancelJob.mutateAsync({ jobId: job.id, ...payload })
      toastSuccess(
        outcome === 'CALLED_OFF' ? 'Visit called off' : 'Visit cancelled',
        'Cancellation record saved for audit and billing.',
      )
      onCancelled?.()
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not cancel visit')
    }
  }

  if (!job) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Cancel / call off visit</DialogTitle>
          <DialogDescription>
            {serviceUserLabel(job.serviceUser)} · {formatJobTimeRange(job)}
            {job.visitPlan?.label ? ` · ${job.visitPlan.label}` : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          {timeCritical ? (
            <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 dark:border-red-900 dark:bg-red-950/30">
              <TimeCriticalDot toleranceMinutes={timeCritical.timeToleranceMinutes} className="mt-1" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">Time-critical visit</p>
                <p className="mt-1 text-sm text-red-800/90 dark:text-red-200/90">
                  {timeCriticalLabel(timeCritical.timeToleranceMinutes)}. Complete welfare review and notify
                  family/representative or commissioner before cancelling.
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Reason for cancellation</Label>
              <Select value={reasonCode} onValueChange={(v) => applyReasonDefaults(v as VisitCancellationReasonCode)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_CANCELLATION_REASONS.map((reason) => (
                    <SelectItem key={reason.code} value={reason.code}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">{reasonMeta.description}</p>
              {policy?.applies && policy.explanation ? (
                <div
                  className={
                    policy.suggestedDecision === 'CHARGE'
                      ? 'mt-2 flex gap-2.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-3 text-sm dark:border-rose-900 dark:bg-rose-950/40'
                      : 'mt-2 flex gap-2.5 rounded-lg border border-sky-300 bg-sky-50 px-3.5 py-3 text-sm dark:border-sky-900 dark:bg-sky-950/40'
                  }
                  data-testid="cancel-policy-suggestion"
                >
                  <AlertTriangle
                    className={
                      policy.suggestedDecision === 'CHARGE'
                        ? 'mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400'
                        : 'mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400'
                    }
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p
                      className={
                        policy.suggestedDecision === 'CHARGE'
                          ? 'font-semibold text-rose-900 dark:text-rose-100'
                          : 'font-semibold text-sky-900 dark:text-sky-100'
                      }
                    >
                      Job Cancellation rules: {policy.explanation}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      A Charge decision keeps this visit out of the service user's timebank.
                    </p>
                  </div>
                </div>
              ) : policyQuery.isLoading ? (
                <p className="mt-2 text-xs text-muted-foreground">Checking the Job Cancellation rules…</p>
              ) : null}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Rota outcome</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as JobCancellationOutcome)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CANCELLED">Cancelled — planned stop</SelectItem>
                  <SelectItem value="CALLED_OFF">Called off — visit due but did not happen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Billing decision</Label>
              <Select value={chargeDecision} onValueChange={(v) => setChargeDecision(v as VisitChargeDecision)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_CHARGE_DECISION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {VISIT_CHARGE_DECISION_OPTIONS.find((o) => o.value === chargeDecision)?.description}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="cancel-reason-notes" className="text-xs text-muted-foreground">
              Reason notes {reasonMeta.requiresNotes ? '(required)' : '(optional)'}
            </Label>
            <Textarea
              id="cancel-reason-notes"
              className="mt-1 min-h-[80px]"
              placeholder="What happened, who was contacted, alternative arrangements…"
              value={reasonNotes}
              onChange={(e) => setReasonNotes(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="cancel-charge-notes" className="text-xs text-muted-foreground">
              Billing notes {chargeDecision === 'CHARGE' ? '(required when charging)' : '(optional)'}
            </Label>
            <Textarea
              id="cancel-charge-notes"
              className="mt-1 min-h-[64px]"
              placeholder="Contract reference, commissioner agreement, invoice instruction…"
              value={chargeDecisionNotes}
              onChange={(e) => setChargeDecisionNotes(e.target.value)}
            />
          </div>

          <section className="space-y-3 rounded-lg border border-border bg-muted/20 px-3.5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              CQC compliance confirmations
            </p>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={welfareChecked} onCheckedChange={(v) => setWelfareChecked(v === true)} />
              <span>
                Welfare / risk review completed
                {needsWelfare ? <span className="text-red-600"> *</span> : null}
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={familyNotified} onCheckedChange={(v) => setFamilyNotified(v === true)} />
              <span>Client, family, or representative notified</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={commissionerNotified}
                onCheckedChange={(v) => setCommissionerNotified(v === true)}
              />
              <span>Commissioner / funder notified (if applicable)</span>
            </label>
            {needsNotification ? (
              <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Time-critical: confirm family or commissioner notification.
              </p>
            ) : null}
          </section>
        </DialogBody>
        <DialogFooter className="border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={cancelJob.isPending}>
            Close
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={cancelJob.isPending}
          >
            {cancelJob.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {outcome === 'CALLED_OFF' ? 'Call off visit' : 'Cancel visit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
