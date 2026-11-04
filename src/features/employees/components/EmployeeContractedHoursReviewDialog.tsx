import { Loader2, ShieldCheck } from 'lucide-react'
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
import { ContractedHoursImpactSummary } from '@/features/hours-approvals/components/ContractedHoursImpactSummary'
import type { ContractedHoursImpact } from '@/features/hours-approvals/types'

type Props = {
  open: boolean
  employeeName: string
  impact: ContractedHoursImpact | null
  reason: string
  onReasonChange: (value: string) => void
  sending: boolean
  onSend: () => void
  onCancel: () => void
  /** Settings → Dom Rules: false = the change applies as soon as it is confirmed. */
  needsApproval?: boolean
}

/**
 * Contracted weekly hours change: shows what the change would do (visits unassigned) before it
 * is sent to a manager on Hours approvals — or, when Settings → Dom Rules needs no approval,
 * before it is applied.
 */
export function EmployeeContractedHoursReviewDialog({
  open,
  employeeName,
  impact,
  reason,
  onReasonChange,
  sending,
  onSend,
  onCancel,
  needsApproval = true,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={next => (!next && !sending ? onCancel() : undefined)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden />
            {needsApproval ? 'Manager approval needed' : 'Confirm contracted hours change'}
          </DialogTitle>
          <DialogDescription>
            {needsApproval ? (
              <>
                Changing {employeeName}&apos;s contracted weekly hours needs a manager&apos;s approval.
                Nothing changes until it is approved — the hours and visits stay as they are, and the
                hours can&apos;t be edited again while the request is pending.
              </>
            ) : (
              <>
                {employeeName}&apos;s contracted weekly hours change as soon as you confirm. Check the
                visits below — any over the new hours are unassigned.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[60vh] space-y-4 overflow-y-auto">
          {impact ? <ContractedHoursImpactSummary impact={impact} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="contracted-hours-reason">Reason (optional)</Label>
            <Textarea
              id="contracted-hours-reason"
              rows={2}
              maxLength={1000}
              value={reason}
              onChange={e => onReasonChange(e.target.value)}
              placeholder="Carer asked to reduce hours from next month"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={sending}>
            Cancel
          </Button>
          <Button type="button" onClick={onSend} disabled={sending || !impact}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {needsApproval ? 'Send for review' : 'Confirm change'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
