import * as React from 'react'
import { Loader2 } from 'lucide-react'
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
import { useReinstateHousekeepingJob } from '@/features/scheduling/hooks/useSchedulingMutations'
import { formatJobTimeRange, serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: TimelineJob | null
  onReinstated?: () => void
}

export function ScheduleJobReinstateDialog({ open, onOpenChange, job, onReinstated }: Props) {
  const reinstateJob = useReinstateHousekeepingJob()
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setNotes('')
  }, [open, job?.id])

  const handleSubmit = async () => {
    if (!job) return
    try {
      await reinstateJob.mutateAsync({ jobId: job.id, notes: notes.trim() || undefined })
      toastSuccess('Visit reinstated', 'The job is back on the rota with restored carers where possible.')
      onReinstated?.()
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not reinstate visit')
    }
  }

  if (!job) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Reinstate visit</DialogTitle>
          <DialogDescription>
            {serviceUserLabel(job.serviceUser)} · {formatJobTimeRange(job)}
            {job.visitPlan?.label ? ` · ${job.visitPlan.label}` : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Puts this visit back on the rota as <strong className="font-medium text-foreground">Planned</strong>.
            Previously assigned carers are restored where possible. The cancellation record is kept for audit with a
            reinstatement timestamp.
          </p>
          <div>
            <Label htmlFor="reinstate-notes" className="text-xs text-muted-foreground">
              Reinstatement notes (optional)
            </Label>
            <Textarea
              id="reinstate-notes"
              className="mt-1 min-h-[88px]"
              placeholder="Why the visit is being reinstated — e.g. client returned home, call-off reversed…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </DialogBody>
        <DialogFooter className="border-t border-border">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={reinstateJob.isPending}>
            Close
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={reinstateJob.isPending}>
            {reinstateJob.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Reinstate visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
