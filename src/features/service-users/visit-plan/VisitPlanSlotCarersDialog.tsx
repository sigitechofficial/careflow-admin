import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { VisitPlanSlotCarerAssignment } from '@/features/service-users/visit-plan/VisitPlanSlotCarerAssignment'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  slot: VisitPlanSlot
  disabled?: boolean
  onChange: (assignedEmployeeIds: string[]) => void
}

export function VisitPlanSlotCarersDialog({
  open,
  onOpenChange,
  serviceUserId,
  slot,
  disabled,
  onChange,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle>
            {slot.assignedEmployeeIds?.length ? 'Change carers' : 'Assign carers'} — {slot.label}
          </DialogTitle>
          <DialogDescription>
            Each call slot can have different carers. Assignments apply only to {slot.label.toLowerCase()} visits
            ({slot.plannedStartTime}–{slot.plannedEndTime}).
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[calc(90vh-8rem)] overflow-y-auto">
          <VisitPlanSlotCarerAssignment
            serviceUserId={serviceUserId}
            slot={slot}
            disabled={disabled}
            onChange={onChange}
            active={open}
            embedded
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
