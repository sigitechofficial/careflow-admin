import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Label, Textarea } from '@/shared/ui/form-field'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason: string
  onReasonChange: (reason: string) => void
  submitting?: boolean
  onConfirm: () => void
}

export function InitialAssessmentReopenDialog({
  open,
  onOpenChange,
  reason,
  onReasonChange,
  submitting,
  onConfirm,
}: Props) {
  const valid = reason.trim().length >= 10

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Reopen assessment</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Returns this submission to <strong>In progress</strong> so answers can be edited again. An audit
            entry is recorded with your reason.
          </p>
          <div>
            <Label htmlFor="ia-reopen-reason">Reason (required, min 10 characters)</Label>
            <Textarea
              id="ia-reopen-reason"
              rows={4}
              className="mt-1"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="e.g. Manager requested updates to section 11 after hospital discharge…"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!valid || submitting} onClick={onConfirm}>
            Reopen assessment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
