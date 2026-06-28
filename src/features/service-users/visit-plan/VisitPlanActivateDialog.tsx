import { contentHelperClass, contentOverlineClass } from '@/shared/ui/content-section'
import * as React from 'react'
import { Loader2 } from 'lucide-react'
import {
  previewVisitPlanActivateImpact,
  previewVisitPlanCarerSyncPattern,
  type VisitPlanSlotInput,
} from '@/features/service-users/visit-plan/api'
import { VisitPlanRotaImpactSummary } from '@/features/service-users/visit-plan/components/VisitPlanRotaImpactSummary'
import { VisitPlanCarerPatternConflictDetails } from '@/features/service-users/visit-plan/VisitPlanCarerPatternConflictDetails'
import type { ActivateImpactPreview, VisitPlanCarerSyncPatternPreview } from '@/features/service-users/visit-plan/types'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Label } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

type ConfirmOptions = {
  cancelEndedPlanJobs: boolean
  reactivationReason?: string
  respectWorkingPatternOnSync: boolean
}

function slotHasAssignedCarers(slot: VisitPlanSlotInput): boolean {
  if (slot.isEnabled === false) return false
  const assignedIds = slot.assignedEmployeeIds?.filter((id) => id?.trim()).length ?? 0
  const carerRows =
    slot.carerAssignments?.filter((row) => row.employeeId?.trim()).length ?? 0
  return assignedIds > 0 || carerRows > 0
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  planId: string
  slots: VisitPlanSlotInput[]
  defaultRespectWorkingPatternOnSync: boolean
  isReactivation?: boolean
  /** When true, confirm saves the draft before activating (draft activate flow). */
  willSaveOnConfirm?: boolean
  isPending?: boolean
  onConfirm: (options: ConfirmOptions) => Promise<void>
}

export function VisitPlanActivateDialog({
  open,
  onOpenChange,
  serviceUserId,
  planId,
  slots,
  defaultRespectWorkingPatternOnSync,
  isReactivation = false,
  willSaveOnConfirm = false,
  isPending = false,
  onConfirm,
}: Props) {
  const [activatePreview, setActivatePreview] = React.useState<ActivateImpactPreview | null>(null)
  const [patternPreview, setPatternPreview] = React.useState<VisitPlanCarerSyncPatternPreview | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [cancelEndedPlanJobs, setCancelEndedPlanJobs] = React.useState(true)
  const [reactivationReason, setReactivationReason] = React.useState('')

  const slotsKey = JSON.stringify(slots)

  React.useEffect(() => {
    if (!open) {
      setActivatePreview(null)
      setPatternPreview(null)
      setCancelEndedPlanJobs(true)
      setReactivationReason('')
      return
    }
    if (!planId) return
    void (async () => {
      setLoading(true)
      try {
        const [activateData, patternData] = await Promise.all([
          previewVisitPlanActivateImpact(serviceUserId, planId),
          previewVisitPlanCarerSyncPattern(serviceUserId, planId, { slots }),
        ])
        setActivatePreview(activateData)
        setPatternPreview(patternData)
        setCancelEndedPlanJobs(activateData.otherActivePlans.length > 0)
      } catch {
        setActivatePreview(null)
        setPatternPreview(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [open, serviceUserId, planId, slotsKey, slots])

  const hasOtherActive = (activatePreview?.otherActivePlans.length ?? 0) > 0
  const impactCount = activatePreview?.scheduleImpact.jobsCancelled ?? 0
  const visitsSkippedIfRespecting = patternPreview?.visitsSkippedIfRespecting ?? 0
  const hasPatternConflicts =
    (patternPreview?.conflicts.length ?? 0) > 0 || visitsSkippedIfRespecting > 0
  const hasAssignedCarers = slots.some(slotHasAssignedCarers)
  const shouldOfferSyncChoice = hasAssignedCarers

  const buildConfirmOptions = (respectWorkingPatternOnSync: boolean): ConfirmOptions => ({
    cancelEndedPlanJobs: hasOtherActive && cancelEndedPlanJobs,
    reactivationReason: reactivationReason.trim() || undefined,
    respectWorkingPatternOnSync,
  })

  const handleConfirm = (respectWorkingPatternOnSync: boolean) => {
    void onConfirm(buildConfirmOptions(respectWorkingPatternOnSync))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>{isReactivation ? 'Re-activate package' : 'Activate visit plan'}</DialogTitle>
          <DialogDescription className="text-left">
            {isReactivation
              ? 'This makes the suspended package live again. Generate rota separately after activation.'
              : willSaveOnConfirm
                ? 'This saves your draft and makes the package live for rota generation.'
                : 'Activating makes this package live for rota generation.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3 text-left">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading activation preview…
            </div>
          ) : null}

          {shouldOfferSyncChoice ? (
            <div className="space-y-3 rounded-md border border-border/80 bg-muted/20 px-3 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {hasPatternConflicts ? 'Carer working pattern conflicts' : 'Carer rota sync'}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {hasPatternConflicts
                    ? 'Assigned carers are not available on every day or time in this call pattern. Choose how to sync carers onto the rota when you activate.'
                    : 'Choose how assigned carers are synced onto the rota when you generate visits.'}
                </p>
              </div>

              {hasPatternConflicts && visitsSkippedIfRespecting > 0 ? (
                <p className="text-sm text-muted-foreground">
                  <strong className="font-medium text-foreground">{visitsSkippedIfRespecting}</strong> future visit
                  {visitsSkippedIfRespecting === 1 ? '' : 's'} would stay unassigned if you sync only on working days.
                </p>
              ) : null}

              {hasPatternConflicts && patternPreview?.conflicts.length ? (
                <ul className="space-y-2">
                  {patternPreview.conflicts.map((conflict) => (
                    <li
                      key={`${conflict.slotCode}:${conflict.employeeId}`}
                      className="rounded-md border border-border/80 bg-background/80 px-3 py-2.5 text-left"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {conflict.employeeName} · {conflict.slotLabel}
                      </p>
                      <VisitPlanCarerPatternConflictDetails conflict={conflict} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {hasOtherActive ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">Another active package will be ended</p>
              {activatePreview?.otherActivePlans.map((p) => (
                <p key={p.id} className="mt-1 text-muted-foreground">
                  Plan since {p.effectiveFrom.slice(0, 10)} · {p.enabledSlotCount} enabled slot
                  {p.enabledSlotCount === 1 ? '' : 's'}
                </p>
              ))}
            </div>
          ) : null}

          {hasOtherActive ? (
            <div className="flex items-start gap-2">
              <Checkbox
                id="cancel-ended-jobs"
                checked={cancelEndedPlanJobs}
                onCheckedChange={(c) => setCancelEndedPlanJobs(c === true)}
              />
              <Label htmlFor="cancel-ended-jobs" className="cursor-pointer text-sm leading-snug">
                Cancel future rota visits from the ended package
              </Label>
            </div>
          ) : null}

          {hasOtherActive && cancelEndedPlanJobs ? (
            <VisitPlanRotaImpactSummary impact={activatePreview?.scheduleImpact} loading={loading} />
          ) : null}

          {isReactivation ? (
            <div>
              <Label className={contentOverlineClass}>Re-activation note (optional)</Label>
              <textarea
                className="mt-1 min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={reactivationReason}
                onChange={(e) => setReactivationReason(e.target.value)}
                placeholder="Why is the package resuming now?"
              />
            </div>
          ) : null}

          {hasOtherActive && cancelEndedPlanJobs && impactCount > 0 ? (
            <p className={contentHelperClass}>
              {impactCount} cancellable visit{impactCount === 1 ? '' : 's'} will be cancelled from today.
            </p>
          ) : null}
        </DialogBody>

        <DialogFooter
          className={
            shouldOfferSyncChoice
              ? 'flex-col gap-2 sm:flex-col sm:space-x-0 [&>button]:w-full'
              : undefined
          }
        >
          {shouldOfferSyncChoice ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Back to editing
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleConfirm(false)}
                disabled={isPending || loading}
              >
                {isPending ? 'Applying…' : 'Sync on all assigned days'}
              </Button>
              <Button type="button" onClick={() => handleConfirm(true)} disabled={isPending || loading}>
                {isPending ? 'Applying…' : 'Sync only on working days'}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleConfirm(defaultRespectWorkingPatternOnSync)}
                disabled={isPending || loading}
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isReactivation ? 'Re-activate' : 'Activate'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
