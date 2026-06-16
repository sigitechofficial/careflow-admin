import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
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
import { useUpdateScheduledJob } from '@/features/scheduling/hooks/useSchedulingMutations'
import type { TimelineJob } from '@/features/scheduling/types/scheduling.types'
import { isScheduleJobReadOnly } from '@/features/scheduling/types/schedule-job-context-actions.types'
import { serviceUserLabel } from '@/features/scheduling/utils/scheduling-format'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  job: TimelineJob | null
  onSaved?: () => void
}

export function ScheduleJobNotesDialog({ open, onOpenChange, job, onSaved }: Props) {
  const [notes, setNotes] = React.useState('')
  const updateJob = useUpdateScheduledJob()
  const readOnly = job ? isScheduleJobReadOnly(job) : false

  React.useEffect(() => {
    if (open && job) setNotes(job.notes?.trim() ?? '')
  }, [open, job])

  const handleSave = async () => {
    if (!job || readOnly) return
    try {
      await updateJob.mutateAsync({
        jobId: job.id,
        notes: notes.trim() || null,
      })
      toastSuccess('Notes saved')
      onSaved?.()
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not save notes')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{readOnly ? 'View notes' : 'Job notes'}</DialogTitle>
          <DialogDescription>
            {job ? serviceUserLabel(job.serviceUser) : 'Add notes for this visit'}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2">
          <Label htmlFor="schedule-job-notes" className="text-xs text-muted-foreground">
            Notes
          </Label>
          <textarea
            id="schedule-job-notes"
            rows={5}
            readOnly={readOnly}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-default disabled:opacity-100"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Visit instructions, handover notes, or cancellation reason…"
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!readOnly ? (
            <Button type="button" onClick={() => void handleSave()} disabled={!job || updateJob.isPending}>
              {updateJob.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save notes'
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
