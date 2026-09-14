import * as React from 'react'
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react'
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
import { cn } from '@/shared/lib/utils'
import { useResetHousekeepingJobTask } from '@/features/scheduling/hooks/useSchedulingMutations'

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  assignmentId: string
  taskName: string
  serviceUserId?: string | null
  onReset?: () => void
}

export function ScheduleJobResetTaskDialog({
  open,
  onOpenChange,
  jobId,
  assignmentId,
  taskName,
  serviceUserId,
  onReset,
}: DialogProps) {
  const resetTask = useResetHousekeepingJobTask()
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setReason('')
  }, [open, assignmentId])

  const handleSubmit = async () => {
    const trimmed = reason.trim()
    if (trimmed.length < 3) return
    try {
      await resetTask.mutateAsync({
        jobId,
        assignmentId,
        reason: trimmed,
        serviceUserId,
      })
      toastSuccess(
        'Task reset',
        'This task (and linked medication or observations for this visit) returned to the initial state.',
      )
      onReset?.()
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not reset task')
    }
  }

  const canSubmit = reason.trim().length >= 3 && !resetTask.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Reset task</DialogTitle>
          <DialogDescription>{taskName}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              This wipes this task’s completion for this visit. If it is linked to medication or
              observations, those records for this visit return to their initial state. Clock-in and
              other tasks stay.
            </p>
          </div>
          <div>
            <Label htmlFor={`reset-task-reason-${assignmentId}`} className="text-xs text-muted-foreground">
              Reason (required)
            </Label>
            <Textarea
              id={`reset-task-reason-${assignmentId}`}
              className="mt-1 min-h-[88px]"
              placeholder="Why this task is being reset — e.g. recorded on the wrong visit…"
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
            disabled={resetTask.isPending}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {resetTask.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Reset task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type ButtonProps = {
  jobId: string
  assignmentId: string
  taskName: string
  serviceUserId?: string | null
  disabled?: boolean
  className?: string
}

/** Office-only — hide when this task has nothing recorded to wipe. */
export function VisitJobTaskResetButton({
  jobId,
  assignmentId,
  taskName,
  serviceUserId,
  disabled,
  className,
}: ButtonProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          'h-7 shrink-0 px-2 text-xs text-destructive hover:text-destructive',
          className,
        )}
        disabled={disabled}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen(true)
        }}
        onMouseDown={(event) => event.stopPropagation()}
        data-testid={`visit-task-reset-${assignmentId}`}
        aria-label={`Reset task ${taskName}`}
      >
        <RotateCcw className="mr-1 h-3 w-3" aria-hidden />
        Reset task
      </Button>
      <ScheduleJobResetTaskDialog
        open={open}
        onOpenChange={setOpen}
        jobId={jobId}
        assignmentId={assignmentId}
        taskName={taskName}
        serviceUserId={serviceUserId}
      />
    </>
  )
}
