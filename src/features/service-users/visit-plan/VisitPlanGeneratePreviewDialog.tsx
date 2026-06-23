import * as React from 'react'
import { Loader2 } from 'lucide-react'
import type { GenerateSchedulePreview } from '@/features/service-users/visit-plan/types'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Label } from '@/shared/ui/form-field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  preview: GenerateSchedulePreview | null
  loading?: boolean
  fromDate: string
  toDate: string
  isPending?: boolean
  onConfirm: () => Promise<void>
}

export function VisitPlanGeneratePreviewDialog({
  open,
  onOpenChange,
  preview,
  loading,
  fromDate,
  toDate,
  isPending = false,
  onConfirm,
}: Props) {
  const [backfillAck, setBackfillAck] = React.useState(false)
  const backfill = preview?.backfillDays ?? 0
  const needsBackfillAck = backfill > 0

  React.useEffect(() => {
    if (!open) setBackfillAck(false)
  }, [open])

  const canConfirm = !needsBackfillAck || backfillAck

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate rota from visit plan</DialogTitle>
          <DialogDescription>
            Preview for {fromDate} to {toDate}. Confirm before creating visits on the scheduling board.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Calculating…</p>
        ) : preview ? (
          <ul className="space-y-1 text-sm">
            <li>
              <strong>{preview.visitsToCreate}</strong> visit{preview.visitsToCreate === 1 ? '' : 's'} to create
            </li>
            {preview.visitsAlreadyExist > 0 ? (
              <li className="text-muted-foreground">
                {preview.visitsAlreadyExist} already on the rota (will sync carers only)
              </li>
            ) : null}
            {preview.visitsSkippedAbsent > 0 ? (
              <li className="text-muted-foreground">{preview.visitsSkippedAbsent} skipped — client absent</li>
            ) : null}
            {preview.visitsSkippedSkip > 0 ? (
              <li className="text-muted-foreground">{preview.visitsSkippedSkip} skipped — plan SKIP exceptions</li>
            ) : null}
            {preview.visitsSkippedBankHoliday > 0 ? (
              <li className="text-muted-foreground">
                {preview.visitsSkippedBankHoliday} dates skipped — bank holiday
              </li>
            ) : null}
          </ul>
        ) : null}

        {needsBackfillAck ? (
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={backfillAck} onCheckedChange={(c) => setBackfillAck(c === true)} className="mt-0.5" />
            <span>
              Authorised to create <strong>{backfill}</strong> day(s) of backdated visits for billing
            </span>
          </label>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void onConfirm()} disabled={isPending || loading || !canConfirm}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate visits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
