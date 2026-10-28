import * as React from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import type { CarePlanComposeGap } from '@/features/service-users/care-plans/types'
import { carePlanFieldLabel } from '@/features/service-users/care-plan/care-plan-first-person-labels'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formName?: string | null
  gaps: CarePlanComposeGap[]
  /** At least one non-empty field value in the current draft. */
  hasValues?: boolean
  publishing?: boolean
  /** Opened from an incident measure: the version is linked to it. */
  incidentRef?: string
  /** Version-history label to use instead of the form name. */
  defaultSummary?: string
  onConfirm: (payload: { gapAcknowledged: boolean; summary?: string }) => void
}

export function CarePlanPublishDialog({
  open,
  onOpenChange,
  formName,
  gaps,
  hasValues = true,
  publishing,
  incidentRef,
  defaultSummary,
  onConfirm,
}: Props) {
  const blockingGaps = gaps.filter(g => g.severity === 'blocking')
  const warningGaps = gaps.filter(g => g.severity === 'warning')
  const [gapAcknowledged, setGapAcknowledged] = React.useState(false)

  React.useEffect(() => {
    if (!open) setGapAcknowledged(false)
  }, [open])

  const canPublish = hasValues && (blockingGaps.length === 0 || gapAcknowledged)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Publish care plan</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] space-y-4 overflow-y-auto pe-1">
          <p className="text-sm text-muted-foreground">
            Publishing creates a versioned snapshot of{' '}
            <span className="font-medium text-foreground">{formName ?? 'this care plan'}</span>.
            Staff will see the published version until you save a new draft.
          </p>

          {incidentRef ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
              This version will be linked to the corrective measure on{' '}
              <span className="font-medium">{incidentRef}</span> as the evidence of the change.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!hasValues ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-900">
                No field values
              </span>
            ) : null}
            {blockingGaps.length === 0 ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                No blocking gaps
              </span>
            ) : (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-900">
                {blockingGaps.length} blocking gap{blockingGaps.length === 1 ? '' : 's'}
              </span>
            )}
            {warningGaps.length > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                {warningGaps.length} warning{warningGaps.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>

          {!hasValues ? (
            <p className="text-sm text-destructive">
              Fill in care plan fields or use <strong>Refresh from IA / profile</strong> before
              publishing. Your changes are only stored on the server after save or publish.
            </p>
          ) : null}

          {gaps.length > 0 ? (
            <ul className="space-y-2">
              {gaps.map(gap => (
                <li
                  key={gap.fieldKey}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm',
                    gap.severity === 'blocking'
                      ? 'border-destructive/40 bg-destructive/5'
                      : 'border-amber-500/40 bg-amber-50 dark:bg-amber-950/20',
                  )}
                >
                  <p className="font-medium text-foreground">{carePlanFieldLabel(gap.label)}</p>
                </li>
              ))}
            </ul>
          ) : null}

          {blockingGaps.length > 0 ? (
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={gapAcknowledged}
                onChange={e => setGapAcknowledged(e.target.checked)}
              />
              <span>
                I acknowledge {blockingGaps.length} blocking gap
                {blockingGaps.length === 1 ? '' : 's'} and confirm this care plan is ready to
                publish.
              </span>
            </label>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={publishing}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canPublish || publishing}
            onClick={() =>
              onConfirm({
                gapAcknowledged: blockingGaps.length > 0,
                summary: defaultSummary ?? formName ?? undefined,
              })
            }
          >
            {publishing ? 'Saving & publishing…' : 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
