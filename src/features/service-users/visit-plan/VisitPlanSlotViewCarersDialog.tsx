import { Link } from '@tanstack/react-router'
import { ExternalLink, User, UserPlus, X } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  disabled?: boolean
  onRemoveCarer?: (employeeId: string) => void
  onAssign?: () => void
}

export function VisitPlanSlotViewCarersDialog({
  open,
  onOpenChange,
  slot,
  employeeNameById,
  disabled,
  onRemoveCarer,
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
                  className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/60 px-2 py-2 dark:border-sky-800 dark:bg-sky-950/30"
                >
                  <Link
                    to="/employee/$employeeId/edit"
                    params={{ employeeId: id }}
                    onClick={() => onOpenChange(false)}
                    className="group flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-0.5 transition-colors hover:bg-sky-100/80 dark:hover:bg-sky-900/40"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100">
                      <User className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground group-hover:text-sky-900 dark:group-hover:text-sky-100">
                        {resolveEmployeeDisplayName(employeeNameById, id)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {assignedIds.length > 1 ? `Carer ${index + 1} · ` : ''}
                        View employee profile
                      </p>
                    </div>
                    <ExternalLink
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-sky-700 dark:group-hover:text-sky-300"
                      aria-hidden
                    />
                  </Link>
                  {!disabled && onRemoveCarer ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 px-2 text-destructive hover:text-destructive"
                      onClick={() => onRemoveCarer(id)}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Remove
                    </Button>
                  ) : null}
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

          {onAssign && !disabled && assignedIds.length > 0 ? (
            <DialogFooter className="border-t border-border pt-4 sm:justify-start">
              <Button type="button" variant="outline" size="sm" onClick={onAssign}>
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Change carers
              </Button>
            </DialogFooter>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
