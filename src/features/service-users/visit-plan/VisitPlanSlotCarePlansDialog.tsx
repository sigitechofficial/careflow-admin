import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { VisitPlanSlotCarePlanLinks } from '@/features/service-users/visit-plan/VisitPlanSlotCarePlanLinks'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  slot: VisitPlanSlot
  acceptedCarePlans: AcceptedCarePlanItem[]
  disabled?: boolean
  onChange: (linkedCarePlanFormIds: string[]) => void
}

export function VisitPlanSlotCarePlansDialog({
  open,
  onOpenChange,
  slot,
  acceptedCarePlans,
  disabled,
  onChange,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle>Care plans — {slot.label}</DialogTitle>
          <DialogDescription>
            Tick the care plans that should be delivered during this call. Only checked plans will be provided
            on this visit.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[calc(90vh-8rem)] space-y-4 overflow-y-auto">
          <VisitPlanSlotCarePlanLinks
            slot={slot}
            acceptedCarePlans={acceptedCarePlans}
            disabled={disabled}
            onChange={onChange}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
