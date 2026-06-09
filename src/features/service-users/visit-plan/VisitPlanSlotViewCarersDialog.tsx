import { User } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { resolveEmployeeDisplayName } from '@/features/employees/lib/employee-display-name'
import { normalizeTimeForInput } from '@/features/service-users/visit-plan/visit-plan-time.util'
import type { VisitPlanSlot } from '@/features/service-users/visit-plan/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  slot: VisitPlanSlot
  employeeNameById: Map<string, string>
  onAssign?: () => void
}

export function VisitPlanSlotViewCarersDialog({
  open,
  onOpenChange,
  slot,
  employeeNameById,
  onAssign,
}: Props) {
  const assignedIds = slot.assignedEmployeeIds ?? []
  const start = normalizeTimeForInput(slot.plannedStartTime)
  const end = normalizeTimeForInput(slot.plannedEndTime)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle>Assigned carers — {slot.label}</DialogTitle>
          <DialogDescription>
            Carers assigned to {slot.label.toLowerCase()} visits ({start}–{end}).{' '}
            {slot.requiredCarers} carer{slot.requiredCarers === 1 ? '' : 's'} required per visit.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {assignedIds.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No carers assigned to this call yet.</p>
              {onAssign ? (
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onAssign}>
                  Assign carers
                </Button>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-2">
              {assignedIds.map((id, index) => (
                <li
                  key={id}
                  className="flex items-center gap-3 rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2.5 dark:border-sky-800 dark:bg-sky-950/30"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100">
                    <User className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {resolveEmployeeDisplayName(employeeNameById, id)}
                    </p>
                    {assignedIds.length > 1 ? (
                      <p className="text-xs text-muted-foreground">Carer {index + 1} of {assignedIds.length}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {assignedIds.length > 0 && assignedIds.length < slot.requiredCarers ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {slot.requiredCarers - assignedIds.length} more carer
              {slot.requiredCarers - assignedIds.length === 1 ? '' : 's'} still required for this visit.
            </p>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
