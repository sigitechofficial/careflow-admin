import * as React from 'react'
import { AlertTriangle, Loader2, PiggyBank } from 'lucide-react'
import type { GenerateSchedulePreview } from '@/features/service-users/visit-plan/types'
import { formatDate } from '@/shared/lib/utils'
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

  const canConfirm = (!needsBackfillAck || backfillAck) && !preview?.weeklyHoursBlocked

  const title = isBackfill
    ? 'Backfill past visits'
    : isRegenerate
      ? 'Regenerate rota from visit plan'
      : 'Generate rota from visit plan'

  const range = `${formatDate(fromDate)} to ${formatDate(toDate)}`
  const description = isBackfill
    ? `Preview for ${range} (days before rota start). Confirm before creating backdated visits.`
    : isRegenerate
      ? `Preview for ${range}. New visits will be created. Visits already on the rota will have their carers updated from this plan.`
      : `Preview for ${range}. Confirm before creating visits on the scheduling board.`

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
                <strong>{preview.visitsToCreate}</strong> new visit
                {preview.visitsToCreate === 1 ? '' : 's'} to create
              </li>
              {preview.visitsAlreadyExist > 0 ? (
                <li className="text-muted-foreground">
                  {preview.visitsAlreadyExist} visit{preview.visitsAlreadyExist === 1 ? '' : 's'} already on the
                  rota — not made again; only their carers are updated from this plan
                </li>
              ) : null}
              {preview.visitsSkippedAbsent > 0 ? (
                <li className="text-muted-foreground">
                  {preview.visitsSkippedAbsent} skipped — client absent
                </li>
              ) : null}
              {preview.visitsSkippedSkip > 0 ? (
                <li className="text-muted-foreground">
                  {preview.visitsSkippedSkip} not created — cancelled for that date
                </li>
              ) : null}
              {preview.visitsSkippedBankHoliday > 0 ? (
                <li className="text-muted-foreground">
                  {preview.visitsSkippedBankHoliday} dates skipped — bank holiday
                </li>
              ) : null}
              {(preview.visitsSkippedNoBackfillAllow ?? 0) > 0 ? (
                <li className="text-destructive">
                  {preview.visitsSkippedNoBackfillAllow} day(s) skipped — Max backfill days not saved on
                  the visit (use Record amendment, then try again)
                </li>
              ) : null}
              {isBackfill && (preview.maxSlotBackfillDays ?? 0) <= 0 ? (
                <li className="text-destructive">
                  Saved plan has Max backfill days = 0 on all enabled visits. Set Max backfill days on a
                  visit, then Record amendment, then backfill again.
                </li>
              ) : null}
            </ul>
          ) : null}

          {preview && !loading && preview.weeklyHoursTimebank ? (
            <div
              className="flex gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground"
              data-testid="generate-preview-timebank"
            >
              <PiggyBank className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <p>
                <strong>Timebank:</strong> {preview.weeklyHoursTimebank}.
              </p>
            </div>
          ) : null}

          {preview && !loading && preview.weeklyHoursWarning ? (
            <div
              className={
                preview.weeklyHoursBlocked
                  ? 'flex gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100'
                  : 'flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
              }
              data-testid="generate-preview-weekly-hours"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <p>
                {preview.weeklyHoursWarning}.{' '}
                {preview.weeklyHoursBlocked
                  ? "Visits can't be generated (Settings → Dom Rules). Fix the visit plan or the weekly contracted hours first."
                  : 'Visits will still be generated (warning only, Settings → Dom Rules).'}
              </p>
            </div>
          ) : null}

          {preview && !loading && preview.visitsToCreate === 0 && preview.visitsAlreadyExist > 0 ? (
            <p className="text-sm text-muted-foreground">
              {isRegenerate
                ? 'No new visits to create — existing rota entries in this window will sync carers from the visit plan.'
                : 'No new visits to create — matching visit days in this window already have rota entries.'}
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
