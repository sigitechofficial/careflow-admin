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
import type { VisitPlanCarerSyncPatternPreview } from '@/features/service-users/visit-plan/types'
import { VisitPlanCarerPatternConflictDetails } from '@/features/service-users/visit-plan/VisitPlanCarerPatternConflictDetails'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  preview: VisitPlanCarerSyncPatternPreview | null
  isPending?: boolean
  onConfirmRespect: () => void | Promise<void>
  onConfirmIgnore: () => void | Promise<void>
}

export function VisitPlanWorkingPatternSyncDialog({
  open,
  onOpenChange,
  preview,
  isPending = false,
  onConfirmRespect,
  onConfirmIgnore,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>Carer working pattern conflicts</DialogTitle>
          <DialogDescription className="text-left">
            Assigned carers are not available on every day or time in this call pattern. Choose how to sync carers
            onto the rota.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3 text-left">
          {(preview?.visitsSkippedIfRespecting ?? 0) > 0 ? (
            <p className="text-sm text-muted-foreground">
              <strong className="font-medium text-foreground">{preview?.visitsSkippedIfRespecting}</strong> future visit
              {(preview?.visitsSkippedIfRespecting ?? 0) === 1 ? '' : 's'} would stay unassigned if you sync only on working
              days.
            </p>
          ) : null}

          {preview?.conflicts.length ? (
            <ul className="space-y-2">
              {preview.conflicts.map((conflict) => (
                <li
                  key={`${conflict.slotCode}:${conflict.employeeId}`}
                  className="rounded-md border border-border/80 bg-background/80 px-3 py-2.5 text-left"
                >
                  <p className="text-sm font-medium text-foreground">
                    {conflict.employeeName} · {conflict.slotLabel}
                  </p>
                  <VisitPlanCarerPatternConflictDetails conflict={conflict} />
                </li>
              ))}
            </ul>
          ) : null}
        </DialogBody>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0 [&>button]:w-full">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Back to editing
          </Button>
          <Button type="button" variant="outline" onClick={() => void onConfirmIgnore()} disabled={isPending}>
            {isPending ? 'Applying…' : 'Sync on all assigned days'}
          </Button>
          <Button type="button" onClick={() => void onConfirmRespect()} disabled={isPending}>
            {isPending ? 'Applying…' : 'Sync only on working days'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
