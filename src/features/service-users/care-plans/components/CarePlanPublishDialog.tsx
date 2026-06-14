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

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formName?: string | null
  gaps: CarePlanComposeGap[]
  publishing?: boolean
  onConfirm: (payload: { gapAcknowledged: boolean; summary?: string }) => void
}

export function CarePlanPublishDialog({
  open,
  onOpenChange,
  formName,
  gaps,
  publishing,
  onConfirm,
}: Props) {
  const blockingGaps = gaps.filter(g => g.severity === 'blocking')
  const warningGaps = gaps.filter(g => g.severity === 'warning')
  const [gapAcknowledged, setGapAcknowledged] = React.useState(false)

  React.useEffect(() => {
    if (!open) setGapAcknowledged(false)
  }, [open])

  const canPublish = blockingGaps.length === 0 || gapAcknowledged

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

          <div className="flex flex-wrap gap-2">
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
                  <p className="font-medium text-foreground">{gap.label}</p>
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
                summary: formName ?? undefined,
              })
            }
          >
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
