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
  dialogTitle?: string
  dialogDescription?: string
  onChange: (assignedEmployeeIds: string[]) => void
}

export function VisitPlanSlotCarersDialog({
  open,
  onOpenChange,
  serviceUserId,
  slot,
  disabled,
  dialogTitle,
  dialogDescription,
  onChange,
}: Props) {
  const defaultTitle = `${slot.assignedEmployeeIds?.length ? 'Change carers' : 'Assign carers'} — ${slot.label}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="flex w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden p-0 sm:w-full"
      >
        <DialogHeader className="shrink-0 px-5 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
          <DialogTitle>{dialogTitle ?? defaultTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription ??
              `Each call slot can have different carers. Assignments apply only to ${slot.label.toLowerCase()} visits (${slot.plannedStartTime}–${slot.plannedEndTime}).`}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[min(70dvh,36rem)] min-h-0 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
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
