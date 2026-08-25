import * as React from 'react'
import { Loader2 } from 'lucide-react'
import type { GenerateSchedulePreview } from '@/features/service-users/visit-plan/types'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/toggle-controls'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

export type VisitPlanScheduleGenerateMode = 'generate' | 'regenerate' | 'backfill'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  preview: GenerateSchedulePreview | null
  loading?: boolean
  mode?: VisitPlanScheduleGenerateMode
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
  mode = 'generate',
  fromDate,
  toDate,
  isPending = false,
  onConfirm,
}: Props) {
  const [backfillAck, setBackfillAck] = React.useState(false)
  const backfill = preview?.backfillDays ?? 0
  const isBackfill = mode === 'backfill'
  const isRegenerate = mode === 'regenerate'
  const needsBackfillAck = isBackfill || backfill > 0

  React.useEffect(() => {
    if (!open) setBackfillAck(false)
  }, [open])

  const canConfirm = !needsBackfillAck || backfillAck

  const title = isBackfill
    ? 'Backfill past visits'
    : isRegenerate
      ? 'Regenerate rota from visit plan'
      : 'Generate rota from visit plan'

  const description = isBackfill
    ? `Preview for ${fromDate} to ${toDate} (days before rota start). Confirm before creating backdated visits.`
    : isRegenerate
      ? `Preview for ${fromDate} to ${toDate}. Missing visits will be created; existing visits will sync carers (including day-specific assignments).`
      : `Preview for ${fromDate} to ${toDate}. Confirm before creating visits on the scheduling board.`

  const confirmLabel = isBackfill
    ? 'Backfill visits'
    : isRegenerate
      ? 'Regenerate rota'
      : 'Generate visits'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="px-6 py-5 pr-12">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-1">{description}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 px-6 py-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Calculating…</p>
          ) : preview ? (
            <ul className="space-y-2 text-sm">
              <li>
                <strong>{preview.visitsToCreate}</strong> visit
                {preview.visitsToCreate === 1 ? '' : 's'} to create
              </li>
              {preview.visitsAlreadyExist > 0 ? (
                <li className="text-muted-foreground">
                  {preview.visitsAlreadyExist} already on the rota
                  {isRegenerate ? ' — carers will be synced from this plan' : ' (will sync carers only)'}
                </li>
              ) : null}
              {preview.visitsSkippedAbsent > 0 ? (
                <li className="text-muted-foreground">
                  {preview.visitsSkippedAbsent} skipped — client absent
                </li>
              ) : null}
              {preview.visitsSkippedSkip > 0 ? (
                <li className="text-muted-foreground">
                  {preview.visitsSkippedSkip} skipped — plan SKIP exceptions
                </li>
              ) : null}
              {preview.visitsSkippedBankHoliday > 0 ? (
                <li className="text-muted-foreground">
                  {preview.visitsSkippedBankHoliday} dates skipped — bank holiday
                </li>
              ) : null}
              {(preview.visitsSkippedOffPattern ?? 0) > 0 ? (
                <li className="text-muted-foreground">
                  {preview.visitsSkippedOffPattern} skipped — not on call pattern (weekday / dates)
                </li>
              ) : null}
              {(preview.visitsSkippedNoBackfillAllow ?? 0) > 0 ? (
                <li className="text-destructive">
                  {preview.visitsSkippedNoBackfillAllow} day(s) skipped — Max backfill days not saved on
                  the call (use Record amendment, then try again)
                </li>
              ) : null}
              {isBackfill && (preview.maxSlotBackfillDays ?? 0) <= 0 ? (
                <li className="text-destructive">
                  Saved plan has Max backfill days = 0 on all enabled calls. Set it on Morning (or
                  another call), click Record amendment, then backfill again.
                </li>
              ) : null}
            </ul>
          ) : null}

          {preview && !loading && preview.visitsToCreate === 0 && preview.visitsAlreadyExist > 0 ? (
            <p className="text-sm text-muted-foreground">
              {isRegenerate
                ? 'No new visits to create — existing rota entries in this window will sync carers from the visit plan.'
                : 'No new visits to create — matching call days in this window already have rota entries.'}
            </p>
          ) : null}

          {preview &&
          !loading &&
          isBackfill &&
          preview.visitsToCreate === 0 &&
          (preview.visitsAlreadyExist ?? 0) === 0 &&
          (preview.maxSlotBackfillDays ?? 0) <= 0 ? (
            <p className="text-sm text-destructive">
              Backfill uses the <strong>saved</strong> plan. Changing Max backfill days in the form is
              not enough until you save (Record amendment).
            </p>
          ) : null}

          {needsBackfillAck ? (
            <label className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-3 text-sm">
              <Checkbox
                checked={backfillAck}
                onCheckedChange={(c) => setBackfillAck(c === true)}
                className="mt-0.5"
              />
              <span>
                Authorised to create <strong>{Math.max(backfill, 1)}</strong> day(s) of backdated visits
                for billing
              </span>
            </label>
          ) : null}
        </DialogBody>

        <DialogFooter className="gap-2 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isPending || loading || !canConfirm}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
