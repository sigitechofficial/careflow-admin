import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'
import type { AcceptedCarePlanItem } from '@/features/service-users/initial-assessment/api'
import { VisitPlanSlotCallPatternDetails } from '@/features/service-users/visit-plan/VisitPlanSlotCallPatternDetails'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'
import { normalizeTimeForInput } from '@/features/service-users/visit-plan/visit-plan-time.util'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  slot: VisitPlanSlot | null
  acceptedCarePlans: AcceptedCarePlanItem[]
  employeeNameById: Map<string, string>
}

export function VisitPlanSlotDetailsSheet({
  open,
  onOpenChange,
  slot,
  acceptedCarePlans,
  employeeNameById,
}: Props) {
  if (!slot) return null

  const start = normalizeTimeForInput(slot.plannedStartTime)
  const end = normalizeTimeForInput(slot.plannedEndTime)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg" className="overflow-hidden p-0">
        <SheetHeader className="border-b border-border bg-muted/20">
          <SheetTitle>Visit slot details</SheetTitle>
          <SheetDescription>
            {slot.label} · {start}–{end}. Full summary of scheduling, care plans, and assigned carers.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="overflow-y-auto bg-muted/10 px-6 py-5">
          <VisitPlanSlotCallPatternDetails
            slot={slot}
            acceptedCarePlans={acceptedCarePlans}
            employeeNameById={employeeNameById}
            onClose={() => onOpenChange(false)}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
