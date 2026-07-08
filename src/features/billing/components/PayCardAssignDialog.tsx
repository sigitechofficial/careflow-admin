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
  useAssignPayCardToMatching,
  usePayCardAssignmentPreview,
} from '@/features/billing/hooks/usePayCards'
import { formatPayCardAssignmentDisplay, type PayCard } from '@/features/billing/types/billing-cards.types'

type PayCardAssignDialogProps = {
  card: PayCard | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PayCardAssignDialog({ card, open, onOpenChange }: PayCardAssignDialogProps) {
  const [onlyUnassigned, setOnlyUnassigned] = React.useState(true)
  const previewQuery = usePayCardAssignmentPreview(card?.id ?? null, open && !!card)
  const assignMutation = useAssignPayCardToMatching()

  React.useEffect(() => {
    if (open) setOnlyUnassigned(true)
  }, [open, card?.id])

  const preview = previewQuery.data
  const targetCount = onlyUnassigned ? preview?.unassignedCount ?? 0 : preview?.matchingCount ?? 0

  const onAssign = async () => {
    if (!card) return
    try {
      const result = await assignMutation.mutateAsync({ id: card.id, onlyUnassigned })
      toastSuccess(`Assigned pay card to ${result.assignedCount} carer${result.assignedCount === 1 ? '' : 's'}.`)
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'Could not assign pay card.')
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
          <DialogTitle>Assign pay card to carers</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {card ? (
            <p className="text-sm text-muted-foreground">
              Assign <span className="font-medium text-foreground">{card.name}</span> (
              {formatPayCardAssignmentDisplay(card)}) to carers who match this card&apos;s criteria.
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {previewQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Calculating matching carers…</p>
          ) : preview ? (
            <dl className="grid gap-2 rounded-lg border border-border bg-muted/10 p-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Matching carers</dt>
                <dd className="font-medium tabular-nums">{preview.matchingCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Without pay card</dt>
                <dd className="font-medium tabular-nums">{preview.unassignedCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Already on this card</dt>
                <dd className="font-medium tabular-nums">{preview.assignedCount}</dd>
              </div>
            </dl>
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
              Only assign carers without a pay card yet
              <span className="block text-xs text-muted-foreground">
                Uncheck to overwrite existing assignments for matching carers.
              </span>
            </span>
          </label>

          {card?.assignmentLevel === 'ORGANISATION_DEFAULT' && !onlyUnassigned ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
              Organisation default cards can apply to all active carers. Use overwrite carefully.
            </p>
          ) : null}
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
              ? 'Assigning…'
              : `Assign to ${targetCount} carer${targetCount === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
