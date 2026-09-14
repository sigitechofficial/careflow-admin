import * as React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { Label, Textarea } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { useResetHousekeepingJobDelivery } from '@/features/scheduling/hooks/useSchedulingMutations'
import { formatJobTimeRange, serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: TimelineJob | null
  onReset?: () => void
}

export function ScheduleJobResetDeliveryDialog({ open, onOpenChange, job, onReset }: Props) {
  const resetDelivery = useResetHousekeepingJobDelivery()
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setReason('')
  }, [open, job?.id])

  const handleSubmit = async () => {
    if (!job) return
    const trimmed = reason.trim()
    if (trimmed.length < 3) return
    try {
      await resetDelivery.mutateAsync({ jobId: job.id, reason: trimmed })
      toastSuccess(
        'Visit reset to planned',
        'Clock-in and this visit’s care records were cleared. The carer will see Clock in after refresh.',
      )
      onReset?.()
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not reset visit')
    }
  }

  if (!job) return null

  const canSubmit = reason.trim().length >= 3 && !resetDelivery.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Reset visit to planned</DialogTitle>
          <DialogDescription>
            {serviceUserLabel(job.serviceUser)} · {formatJobTimeRange(job)}
            {job.visitPlan?.label ? ` · ${job.visitPlan.label}` : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              This wipes clock-in/out and this visit’s tasks, MAR, observations, log, consent, and
              SOS. Allocations and planned times stay. The carer app shows the initial Clock in
              screen after refresh.
            </p>
          </div>
          <div>
            <Label htmlFor="reset-delivery-reason" className="text-xs text-muted-foreground">
              Reason (required)
            </Label>
            <Textarea
              id="reset-delivery-reason"
              className="mt-1 min-h-[88px]"
              placeholder="Why this visit is being reset — e.g. carer clocked into the wrong visit…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </DialogBody>
        <DialogFooter className="border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={resetDelivery.isPending}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {resetDelivery.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Reset visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
