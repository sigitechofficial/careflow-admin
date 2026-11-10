import { cn } from '@/shared/lib/utils'
import { contentHelperClass, contentOverlineClass } from '@/shared/ui/content-section'
import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import type { SuLookupRow } from '@/features/service-users/api/service-users.api'
import type { SuspendVisitPlanPayload } from '@/features/service-users/visit-plan/api'
import { previewVisitPlanSuspendScheduleImpact } from '@/features/service-users/visit-plan/api'
import { addDaysToIsoDate } from '@/features/service-users/visit-plan/visit-plan-generate-rota.util'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useGeneralSettings } from '@/features/settings/hooks/useGeneralSettings'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

type PauseReason = SuLookupRow & { suggestsUseAbsence?: boolean }

/** Settings → Reviews & reminders `visitPlanSuspensionReviewDays`; blank until known (the API then applies it). */
function defaultReviewDueIso(days: number | undefined): string {
  return days ? addDaysToIsoDate(operationalTodayIso(), days) : ''
}

function todayIso(): string {
  return operationalTodayIso()
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  planId: string
  pauseReasons: PauseReason[]
  cancelFutureVisitsDefault?: boolean
  isPending?: boolean
  onConfirm: (payload: SuspendVisitPlanPayload) => Promise<void>
}

export function VisitPlanSuspendDialog({
  open,
  onOpenChange,
  serviceUserId,
  planId,
  pauseReasons,
  cancelFutureVisitsDefault = true,
  isPending = false,
  onConfirm,
}: Props) {
  const [pauseReasonCatalogId, setPauseReasonCatalogId] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [effectiveFrom, setEffectiveFrom] = React.useState(todayIso())
  const [retrospectiveReason, setRetrospectiveReason] = React.useState('')
  const [expectedResumeAt, setExpectedResumeAt] = React.useState('')
  const [indefinite, setIndefinite] = React.useState(true)
  const suspensionReviewDays = useGeneralSettings(open).data?.reviewSettings?.visitPlanSuspensionReviewDays
  const [reviewDueAt, setReviewDueAt] = React.useState(defaultReviewDueIso(suspensionReviewDays))
  const [contingencyNotes, setContingencyNotes] = React.useState('')
  const [cancelFutureVisits, setCancelFutureVisits] = React.useState(cancelFutureVisitsDefault)
  const [impactPreview, setImpactPreview] = React.useState<number | null>(null)
  const [impactPreviewLoading, setImpactPreviewLoading] = React.useState(false)
  const [confirmStep, setConfirmStep] = React.useState(false)
  const [noCancelAck, setNoCancelAck] = React.useState(false)

  const selectedReason = pauseReasons.find((r) => r.id === pauseReasonCatalogId)
  const backdated = effectiveFrom.trim() < todayIso()

  React.useEffect(() => {
    if (!open) return
    setPauseReasonCatalogId('')
    setReason('')
    setEffectiveFrom(todayIso())
    setRetrospectiveReason('')
    setExpectedResumeAt('')
    setIndefinite(true)
    setReviewDueAt(defaultReviewDueIso(suspensionReviewDays))
    setContingencyNotes('')
    setCancelFutureVisits(cancelFutureVisitsDefault)
    setImpactPreview(null)
    setConfirmStep(false)
    setNoCancelAck(false)
  }, [open, cancelFutureVisitsDefault, suspensionReviewDays])

  React.useEffect(() => {
    if (!open || !cancelFutureVisits || !effectiveFrom.trim() || !planId) {
      setImpactPreview(null)
      return
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setImpactPreviewLoading(true)
        try {
          const result = await previewVisitPlanSuspendScheduleImpact(serviceUserId, planId, {
            fromDate: effectiveFrom.trim(),
          })
          setImpactPreview(result.jobsCancelled)
        } catch {
          setImpactPreview(null)
        } finally {
          setImpactPreviewLoading(false)
        }
      })()
    }, 400)
    return () => window.clearTimeout(timer)
  }, [open, cancelFutureVisits, effectiveFrom, serviceUserId, planId])

  const handleSubmit = async () => {
    if (!pauseReasonCatalogId || !reason.trim()) return
    if (backdated && !retrospectiveReason.trim()) return
    if (!cancelFutureVisits && !noCancelAck) return
    if (cancelFutureVisits && impactPreview !== null && impactPreview > 0 && !confirmStep) {
      setConfirmStep(true)
      return
    }
    await onConfirm({
      pauseReasonCatalogId,
      reason: reason.trim(),
      effectiveFrom: effectiveFrom.trim() || todayIso(),
      retrospectiveReason: backdated ? retrospectiveReason.trim() : undefined,
      expectedResumeAt: indefinite ? null : expectedResumeAt || null,
      reviewDueAt: reviewDueAt || null,
      contingencyNotes: contingencyNotes.trim(),
      cancelFutureVisits,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>
            {confirmStep ? 'Confirm suspend and rota changes' : 'Suspend authorised package'}
          </DialogTitle>
          <DialogDescription>
            {confirmStep
              ? `You are about to suspend this package and cancel ${impactPreview} visit${impactPreview === 1 ? '' : 's'} from ${effectiveFrom}.`
              : 'Pauses the live care package and blocks rota generation until you re-activate. Record why, when to review, and contingency arrangements for CQC audit.'}
          </DialogDescription>
        </DialogHeader>

        {confirmStep ? (
          <div className="px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Completed visits are not removed. Review billing and incidents separately if needed.
            </p>
          </div>
        ) : (
        <div className="space-y-4 overflow-y-auto px-6 py-4">
          {selectedReason?.suggestsUseAbsence ? (
            <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              For hospital or short breaks with <strong>known dates</strong>, prefer{' '}
              <Link
                to="/service-users/$serviceUserId"
                params={{ serviceUserId }}
                search={{ tab: 'absences' }}
                className="font-medium underline underline-offset-2"
              >
                Record Absences
              </Link>{' '}
              — suspend the whole package only if visits must stay off until you manually re-activate.
            </div>
          ) : null}

          <div>
            <Label className={contentOverlineClass}>Pause reason (catalogued)</Label>
            <Select value={pauseReasonCatalogId || undefined} onValueChange={setPauseReasonCatalogId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {pauseReasons.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className={contentOverlineClass}>Visits should stop from</Label>
            <Input
              type="date"
              className="mt-1"
              value={effectiveFrom}
              max={todayIso()}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
            <p className={cn('mt-1', contentHelperClass)}>
              Today or a past date. For future-dated pauses, use Record Absences.
            </p>
          </div>

          {backdated ? (
            <div>
              <Label className={contentOverlineClass}>Retrospective correction (required)</Label>
              <textarea
                className="mt-1 min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={retrospectiveReason}
                onChange={(e) => setRetrospectiveReason(e.target.value)}
                placeholder="Why is this being recorded now? Welfare checks for the gap period…"
              />
            </div>
          ) : null}

          <div>
            <Label className={contentOverlineClass}>Detail & contingency (required)</Label>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Admitted to Royal Berkshire — ward 4. Daily welfare call by duty manager; meds via ward staff."
            />
          </div>

          <div>
            <Label className={contentOverlineClass}>Welfare / contingency notes (optional)</Label>
            <textarea
              className="mt-1 min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={contingencyNotes}
              onChange={(e) => setContingencyNotes(e.target.value)}
              placeholder="Alternative contact, medication dependency, who is reviewing…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className={contentOverlineClass}>Expected resume date</Label>
              <div className="mt-2 flex items-center gap-2">
                <Checkbox
                  id="suspend-indefinite"
                  checked={indefinite}
                  onCheckedChange={(c) => setIndefinite(c === true)}
                />
                <Label htmlFor="suspend-indefinite" className="cursor-pointer text-sm">
                  Indefinite / unknown
                </Label>
              </div>
              {!indefinite ? (
                <Input
                  type="date"
                  className="mt-2"
                  value={expectedResumeAt}
                  onChange={(e) => setExpectedResumeAt(e.target.value)}
                />
              ) : null}
            </div>
            <div>
              <Label className={contentOverlineClass}>Review suspension by</Label>
              <Input
                type="date"
                className="mt-1"
                value={reviewDueAt}
                onChange={(e) => setReviewDueAt(e.target.value)}
              />
              <p className={cn('mt-1', contentHelperClass)}>
                {suspensionReviewDays
                  ? `Defaults to ${suspensionReviewDays} days (Settings → Reviews & reminders) — re-check decision & welfare.`
                  : 'Left blank, the organisation default from Settings → Reviews & reminders is used.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
            <Checkbox
              id="suspend-cancel-visits"
              checked={cancelFutureVisits}
              onCheckedChange={(c) => setCancelFutureVisits(c === true)}
            />
            <Label htmlFor="suspend-cancel-visits" className="cursor-pointer text-sm leading-snug">
              Cancel scheduled visits from the effective pause date
              {impactPreviewLoading ? (
                <span className="ml-1 text-muted-foreground">(checking rota…)</span>
              ) : impactPreview !== null && cancelFutureVisits ? (
                <span className="ml-1 font-medium text-foreground">
                  ({impactPreview} cancellable visit{impactPreview === 1 ? '' : 's'} in range)
                </span>
              ) : null}
            </Label>
          </div>

          {!cancelFutureVisits ? (
            <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <Checkbox checked={noCancelAck} onCheckedChange={(c) => setNoCancelAck(c === true)} className="mt-0.5" />
              <span>
                <strong>Warning:</strong> Future visits may remain on the rota while the package is suspended.
              </span>
            </label>
          ) : null}
        </div>
        )}

        <DialogFooter className="border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => (confirmStep ? setConfirmStep(false) : onOpenChange(false))}
            disabled={isPending}
          >
            {confirmStep ? 'Back' : 'Cancel'}
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={
              isPending ||
              !pauseReasonCatalogId ||
              !reason.trim() ||
              (backdated && !retrospectiveReason.trim()) ||
              (!cancelFutureVisits && !noCancelAck)
            }
            onClick={() => void handleSubmit()}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {confirmStep ? 'Confirm suspend' : 'Suspend package'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
