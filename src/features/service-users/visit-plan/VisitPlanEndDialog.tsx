import { contentHelperClass, contentOverlineClass } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'
import * as React from 'react'
import { Loader2 } from 'lucide-react'
import type { EndVisitPlanPayload } from '@/features/service-users/visit-plan/api'
import { previewVisitPlanEndScheduleImpact } from '@/features/service-users/visit-plan/api'
import { visitPlanTodayUtc } from '@/features/service-users/visit-plan/visit-plan-version.util'
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

function todayIso(): string {
  return visitPlanTodayUtc().toISOString().slice(0, 10)
}

function isBackdatedEffectiveTo(effectiveTo: string): boolean {
  if (!effectiveTo.trim()) return false
  return effectiveTo.trim() < todayIso()
}

function isFutureEffectiveTo(effectiveTo: string): boolean {
  if (!effectiveTo.trim()) return false
  return effectiveTo.trim() > todayIso()
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  planId: string
  cancelFutureVisitsDefault?: boolean
  isPending?: boolean
  onConfirm: (payload: EndVisitPlanPayload) => Promise<void>
}

export function VisitPlanEndDialog({
  open,
  onOpenChange,
  serviceUserId,
  planId,
  cancelFutureVisitsDefault = true,
  isPending = false,
  onConfirm,
}: Props) {
  const [reason, setReason] = React.useState('')
  const [effectiveTo, setEffectiveTo] = React.useState(todayIso())
  const [retrospectiveReason, setRetrospectiveReason] = React.useState('')
  const [cancelFutureVisits, setCancelFutureVisits] = React.useState(cancelFutureVisitsDefault)
  const [impactPreview, setImpactPreview] = React.useState<number | null>(null)
  const [impactPreviewLoading, setImpactPreviewLoading] = React.useState(false)
  const [confirmStep, setConfirmStep] = React.useState(false)

  const backdated = isBackdatedEffectiveTo(effectiveTo)
  const scheduled = isFutureEffectiveTo(effectiveTo)

  React.useEffect(() => {
    if (!open) return
    setReason('')
    setEffectiveTo(todayIso())
    setRetrospectiveReason('')
    setCancelFutureVisits(cancelFutureVisitsDefault)
    setImpactPreview(null)
    setConfirmStep(false)
  }, [open, cancelFutureVisitsDefault])

  React.useEffect(() => {
    if (!open || !cancelFutureVisits || !effectiveTo.trim() || !planId) {
      setImpactPreview(null)
      return
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setImpactPreviewLoading(true)
        try {
          const result = await previewVisitPlanEndScheduleImpact(serviceUserId, planId, {
            fromDate: effectiveTo.trim(),
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
  }, [open, cancelFutureVisits, effectiveTo, serviceUserId, planId])

  const handleSubmit = async () => {
    if (!reason.trim()) return
    if (backdated && !retrospectiveReason.trim()) return
    if (cancelFutureVisits && impactPreview !== null && impactPreview > 0 && !confirmStep) {
      setConfirmStep(true)
      return
    }
    await onConfirm({
      reason: reason.trim(),
      effectiveTo: effectiveTo.trim() || todayIso(),
      retrospectiveReason: backdated ? retrospectiveReason.trim() : undefined,
      cancelFutureVisits,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="gap-0 p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>
            {confirmStep ? 'Confirm end and rota cancellations' : 'End authorised package'}
          </DialogTitle>
          <DialogDescription>
            {confirmStep
              ? `End package and cancel ${impactPreview} visit${impactPreview === 1 ? '' : 's'} from ${effectiveTo}.`
              : 'Closes the care package permanently. Choose the last day visits should run, or record a retrospective end with audit trail. Completed visits are not removed from the record.'}
          </DialogDescription>
        </DialogHeader>

        {confirmStep ? (
          <div className="px-6 py-4 text-sm text-muted-foreground">
            This permanently closes the package. Completed visits stay on the record for billing and incidents.
          </div>
        ) : (
        <div className="space-y-4 overflow-y-auto px-6 py-4">
          <div>
            <Label className={contentOverlineClass}>Last day of visits (effective end date)</Label>
            <Input
              type="date"
              className="mt-1"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
            />
            <p className={cn('mt-1', contentHelperClass)}>
              {scheduled
                ? 'Future date: package stays active until this day; rota can be cancelled from this date forward.'
                : backdated
                  ? 'Past date: you are correcting the record — explain why below.'
                  : 'Today: package ends immediately.'}
            </p>
          </div>

          <div>
            <Label className={contentOverlineClass}>Reason for ending (required)</Label>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Client moved to residential care — commissioner confirmed package closure."
            />
          </div>

          {backdated ? (
            <div>
              <Label className={contentOverlineClass}>Retrospective correction (required)</Label>
              <textarea
                className="mt-1 min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={retrospectiveReason}
                onChange={(e) => setRetrospectiveReason(e.target.value)}
                placeholder="Why is this being recorded now? Who was involved? Welfare checks for the gap period…"
              />
            </div>
          ) : null}

          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3">
            <Checkbox
              id="end-cancel-visits"
              checked={cancelFutureVisits}
              onCheckedChange={(c) => setCancelFutureVisits(c === true)}
            />
            <Label htmlFor="end-cancel-visits" className="cursor-pointer text-sm leading-snug">
              Cancel scheduled visits from the effective end date
              {impactPreviewLoading ? (
                <span className="ml-1 text-muted-foreground">(checking rota…)</span>
              ) : impactPreview !== null && cancelFutureVisits ? (
                <span className="ml-1 font-medium text-foreground">
                  ({impactPreview} cancellable visit{impactPreview === 1 ? '' : 's'} in range)
                </span>
              ) : null}
            </Label>
          </div>
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
            variant="destructive"
            disabled={
              isPending ||
              !reason.trim() ||
              (backdated && !retrospectiveReason.trim())
            }
            onClick={() => void handleSubmit()}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {confirmStep ? 'Confirm end' : scheduled ? 'Schedule closure' : 'End package'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
