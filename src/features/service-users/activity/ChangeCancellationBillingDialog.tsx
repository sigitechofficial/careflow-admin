import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Label, Textarea } from '@/shared/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { useChangeCancellationBilling } from '@/features/service-users/activity/hooks'

type Decision = 'CHARGE' | 'NO_CHARGE' | 'WAIVE' | 'PENDING_REVIEW'

const DECISIONS: Array<{ value: Decision; label: string }> = [
  { value: 'CHARGE', label: 'Charge' },
  { value: 'NO_CHARGE', label: 'Do not charge' },
  { value: 'WAIVE', label: 'Waive charge' },
  { value: 'PENDING_REVIEW', label: 'Finance to confirm' },
]

const DECISION_LABEL = new Map(DECISIONS.map(d => [d.value, d.label]))

/** Finance changes the billing decision of a cancelled visit, with a note for the audit log. */
export function ChangeCancellationBillingDialog({
  open,
  onOpenChange,
  serviceUserId,
  scheduledJobId,
  visitLabel,
  current,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  scheduledJobId: string
  visitLabel: string
  current: string | null
}) {
  const change = useChangeCancellationBilling(serviceUserId)
  const [decision, setDecision] = React.useState<Decision>('CHARGE')
  const [note, setNote] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setDecision(current === 'CHARGE' ? 'NO_CHARGE' : 'CHARGE')
    setNote('')
  }, [open, current])

  const save = async () => {
    if (!note.trim()) {
      toastWarning('Add a note', 'Explain why the billing decision is changing.')
      return
    }
    try {
      await change.mutateAsync({ scheduledJobId, chargeDecision: decision, note: note.trim() })
      toastSuccess('Billing decision changed', DECISION_LABEL.get(decision) ?? decision)
      onOpenChange(false)
    } catch (error) {
      toastApiError(error, 'Could not change the billing decision')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change billing decision</DialogTitle>
          <DialogDescription>{visitLabel}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Now:{' '}
            <span className="font-medium text-foreground">
              {current ? (DECISION_LABEL.get(current as Decision) ?? current) : 'Not recorded'}
            </span>
          </p>
          <div>
            <Label className="text-xs text-muted-foreground">Billing decision</Label>
            <Select value={decision} onValueChange={v => setDecision(v as Decision)}>
              <SelectTrigger className="mt-1" data-testid="change-billing-decision">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DECISIONS.map(d => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="change-billing-note" className="text-xs text-muted-foreground">
              Note (required)
            </Label>
            <Textarea
              id="change-billing-note"
              className="mt-1 min-h-[72px]"
              placeholder="Council confirmed the late-cancellation fee under the contract."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Charge keeps the visit out of the timebank and adds it to the next invoice run. The change is kept in the
            audit log.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={() => void save()} disabled={change.isPending}>
            {change.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Save decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
