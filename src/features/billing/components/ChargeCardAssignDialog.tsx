import * as React from 'react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  useAssignChargeCardToMatching,
  useChargeCardAssignmentPreview,
} from '@/features/billing/hooks/useChargeCards'
import { formatChargeCardAssignmentDisplay, type ChargeCard } from '@/features/billing/types/billing-cards.types'

type ChargeCardAssignDialogProps = {
  card: ChargeCard | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChargeCardAssignDialog({ card, open, onOpenChange }: ChargeCardAssignDialogProps) {
  const [onlyUnassigned, setOnlyUnassigned] = React.useState(true)
  const previewQuery = useChargeCardAssignmentPreview(card?.id ?? null, open && !!card)
  const assignMutation = useAssignChargeCardToMatching()

  React.useEffect(() => {
    if (open) setOnlyUnassigned(true)
  }, [open, card?.id])

  const preview = previewQuery.data
  const targetCount = onlyUnassigned ? preview?.unassignedCount ?? 0 : preview?.matchingCount ?? 0

  const onAssign = async () => {
    if (!card) return
    try {
      const result = await assignMutation.mutateAsync({ id: card.id, onlyUnassigned })
      toastSuccess(`Assigned charge card to ${result.assignedCount} record${result.assignedCount === 1 ? '' : 's'}.`)
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'Could not assign charge card.')
    }
  }

  const error =
    previewQuery.error instanceof ApiError
      ? previewQuery.error.message
      : previewQuery.error
        ? 'Could not load assignment preview.'
        : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Attach charge card</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {card ? (
            <p className="text-sm text-muted-foreground">
              Attach <span className="font-medium text-foreground">{card.name}</span> (
              {formatChargeCardAssignmentDisplay(card)}) to matching funders, contracts, or service users.
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {previewQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Calculating matching records…</p>
          ) : preview ? (
            <dl className="grid gap-2 rounded-lg border border-border bg-muted/10 p-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Matching records</dt>
                <dd className="font-medium tabular-nums">{preview.matchingCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Without charge card</dt>
                <dd className="font-medium tabular-nums">{preview.unassignedCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Already on this card</dt>
                <dd className="font-medium tabular-nums">{preview.assignedCount}</dd>
              </div>
            </dl>
          ) : null}

          {preview?.matchingCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              Service type and household cards are used for automatic matching only — attach them on the
              service user or funding record instead.
            </p>
          ) : null}

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={onlyUnassigned}
              onChange={e => setOnlyUnassigned(e.target.checked)}
              disabled={assignMutation.isPending}
            />
            <span>
              Only attach where no charge card is set yet
              <span className="block text-xs text-muted-foreground">
                Uncheck to overwrite existing attachments for matching records.
              </span>
            </span>
          </label>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={assignMutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void onAssign()}
            disabled={assignMutation.isPending || previewQuery.isLoading || targetCount === 0}
          >
            {assignMutation.isPending
              ? 'Attaching…'
              : `Attach to ${targetCount} record${targetCount === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
