import * as React from 'react'
import { Loader2 } from 'lucide-react'
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
import { formatDate } from '@/shared/lib/utils'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import {
  useDeleteExtraVisit,
  type VisitPlanDateChange,
} from '@/features/service-users/visit-plan/visit-plan-date-changes.api'

type Props = {
  serviceUserId: string
  planId: string
  /** The extra visit to delete; the dialog is open while set. */
  change: VisitPlanDateChange | null
  onClose: () => void
}

/** Removes one extra visit before it starts: it comes off the rota and its carers are told. */
export function VisitPlanDeleteExtraVisitDialog({ serviceUserId, planId, change, onClose }: Props) {
  const [reason, setReason] = React.useState('')
  const deleteExtra = useDeleteExtraVisit(serviceUserId, planId)

  React.useEffect(() => {
    if (!change) setReason('')
  }, [change])

  const handleDelete = async () => {
    if (!change) return
    if (!reason.trim()) {
      toastWarning('Add a reason', 'Say why the extra visit is being deleted.')
      return
    }
    try {
      await deleteExtra.mutateAsync({ exceptionId: change.id, reason: reason.trim() })
      toastSuccess('Extra visit deleted', 'It has been taken off the rota. Other visits are not affected.')
      onClose()
    } catch (error) {
      toastApiError(error, 'Could not delete the extra visit')
    }
  }

  return (
    <Dialog open={Boolean(change)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete extra visit</DialogTitle>
          <DialogDescription>
            {change
              ? `${change.slotLabel} ${change.plannedStartTime}–${change.plannedEndTime} on ${formatDate(change.date)} will be taken off the rota. Any carers on it will be told.`
              : null}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Label htmlFor="extra-visit-delete-reason" className="text-xs text-muted-foreground">
            Reason <span className="text-red-600">*</span>
          </Label>
          <Textarea
            id="extra-visit-delete-reason"
            className="mt-1 min-h-[64px]"
            placeholder="e.g. Added by mistake, or the family no longer needs it"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </DialogBody>
        <DialogFooter className="border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={deleteExtra.isPending}>
            Keep visit
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleteExtra.isPending}
            data-testid="extra-visit-delete-confirm"
          >
            {deleteExtra.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Delete extra visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
