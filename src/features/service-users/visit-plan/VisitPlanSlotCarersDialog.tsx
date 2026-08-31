import * as React from 'react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { VisitPlanSlotCarerAssignment } from '@/features/service-users/visit-plan/VisitPlanSlotCarerAssignment'
import {
  formatRequiredCarersRoleHint,
  slotGlobalCarerIds,
} from '@/features/service-users/visit-plan/visit-plan-employee-names.util'
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

function slotWithDraftIds(slot: VisitPlanSlot, draftIds: string[]): VisitPlanSlot {
  return {
    ...slot,
    assignedEmployeeIds: draftIds,
    carerAssignments: draftIds.map((employeeId, index) => ({
      dayOfWeek: null,
      employeeId,
      role: (index === 0 ? 'LEAD' : 'SECONDARY') as VisitPlanSlot['carerAssignments'][number]['role'],
      durationMinutes: null,
      plannedStartTime: null,
      plannedEndTime: null,
      sortOrder: index,
    })),
  }
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
  const [draftIds, setDraftIds] = React.useState<string[]>(() => slotGlobalCarerIds(slot))
  const defaultTitle = `${slot.assignedEmployeeIds?.length ? 'Change carers' : 'Assign carers'} — ${slot.label}`

  React.useEffect(() => {
    if (!open) return
    // Snapshot assigned carers only when the dialog opens (slot identity changes each parent render).
    setDraftIds(slotGlobalCarerIds(slot))
  }, [open])

  const draftSlot = React.useMemo(() => slotWithDraftIds(slot, draftIds), [slot, draftIds])

  const closeWithoutSaving = () => onOpenChange(false)

  const confirmSelection = () => {
    onChange(draftIds)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="flex w-[calc(100%-2rem)] flex-col overflow-hidden p-0 sm:w-full"
      >
        <DialogHeader className="shrink-0 px-5 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
          <DialogTitle>{dialogTitle ?? defaultTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription ??
              `Each call slot can have different carers. Assignments apply only to ${slot.label.toLowerCase()} visits (${slot.plannedStartTime}–${slot.plannedEndTime}).${
                slot.requiredCarers > 1
                  ? ` Need ${slot.requiredCarers}: ${formatRequiredCarersRoleHint(slot.requiredCarers)}. Cancel keeps the previous list; Confirm applies it.`
                  : ''
              }`}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[min(70dvh,36rem)] min-h-0 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          <VisitPlanSlotCarerAssignment
            serviceUserId={serviceUserId}
            slot={draftSlot}
            disabled={disabled}
            onChange={setDraftIds}
            active={open}
            embedded
          />
        </DialogBody>
        <DialogFooter className="shrink-0 border-t border-border px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={closeWithoutSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={confirmSelection} disabled={disabled}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
