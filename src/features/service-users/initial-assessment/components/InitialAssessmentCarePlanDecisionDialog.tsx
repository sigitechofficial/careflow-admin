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
  title: string
  mode: 'accept' | 'decline'
  reason: string
  onReasonChange: (reason: string) => void
  submitting?: boolean
  onConfirm: () => void
}

export function InitialAssessmentCarePlanDecisionDialog({
  open,
  onOpenChange,
  title,
  mode,
  reason,
  onReasonChange,
  submitting,
  onConfirm,
}: Props) {
  const valid = mode === 'accept' || reason.trim().length >= 3

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{mode === 'accept' ? 'Accept recommendation' : 'Decline recommendation'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          {mode === 'decline' ? (
            <div>
              <Label htmlFor="ia-cp-decline-reason">Reason (required)</Label>
              <Textarea
                id="ia-cp-decline-reason"
                rows={3}
                className="mt-1"
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder="Why is this care plan update not being taken forward?"
              />
            </div>
          ) : (
            <p className="text-sm">
              Accepting records your intent to create or update the care plan for this area.
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!valid || submitting} onClick={onConfirm}>
            {mode === 'accept' ? 'Accept' : 'Decline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
