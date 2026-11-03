import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  mode: 'accept' | 'decline' | 'defer'
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
  const label = mode === 'accept' ? 'Accept' : mode === 'decline' ? 'Decline' : 'Defer'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{label} recommendation</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          {mode !== 'accept' ? (
            <div>
              <Label htmlFor="ia-cp-decline-reason">Reason (required)</Label>
              <Textarea
                id="ia-cp-decline-reason"
                rows={3}
                className="mt-1"
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                placeholder={
                  mode === 'decline'
                    ? 'Why is this care plan update not being taken forward?'
                    : 'Why is this decision being put off, and what is needed first?'
                }
              />
              {mode === 'defer' ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Deferring creates nothing. The recommendation stays open to accept or decline later.
                </p>
              ) : null}
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
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
