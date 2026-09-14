import * as React from 'react'
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
import { FormField, Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import { useLeftAreaAllowReasons } from '@/features/settings/hooks/useLookupsAdmin'
import {
  canSubmitManualAuthorisation,
  sortManualAuthorisationReasons,
} from '@/features/ecm/utils/manual-authorisation-reason.util'

export function AllowCarerContinueDialog({
  open,
  onOpenChange,
  busy,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy?: boolean
  onConfirm: (payload: { reasonId: string; note?: string }) => Promise<void>
}) {
  const listQuery = useLeftAreaAllowReasons(open)
  const reasons = sortManualAuthorisationReasons(listQuery.data ?? [])
  const [reasonId, setReasonId] = React.useState<string | null>(null)
  const [note, setNote] = React.useState('')

  React.useEffect(() => {
    if (!open) {
      setReasonId(null)
      setNote('')
    }
  }, [open])

  const selected = reasons.find(row => row.id === reasonId) ?? null
  const showNote = Boolean(selected?.requiresNotes)
  const canSubmit = canSubmitManualAuthorisation(selected, note)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" data-testid="allow-carer-continue-reason-dialog">
        <DialogHeader>
          <DialogTitle>Select reason</DialogTitle>
          <DialogDescription>
            Choose why this carer is allowed to continue after leaving the visit area.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {listQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading reasons…</p>
          ) : reasons.length === 0 ? (
            <p className="text-sm text-destructive">
              No allow reasons are configured. Add them in Settings → Left-area allow reasons.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Allow reason">
              {reasons.map(row => {
                const selectedChip = row.id === reasonId
                return (
                  <button
                    key={row.id}
                    type="button"
                    role="radio"
                    aria-checked={selectedChip}
                    disabled={busy}
                    onClick={() => {
                      setReasonId(row.id)
                      if (!row.requiresNotes) setNote('')
                    }}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      selectedChip
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:bg-muted',
                    )}
                  >
                    {row.label}
                  </button>
                )
              })}
            </div>
          )}
          {showNote ? (
            <FormField label="Other reason" htmlFor="allow-continue-other-reason" required>
              <Textarea
                id="allow-continue-other-reason"
                rows={3}
                className="min-h-[80px]"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Enter the reason"
                disabled={busy}
              />
            </FormField>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || busy}
            onClick={() => {
              if (!selected) return
              void onConfirm({
                reasonId: selected.id,
                note: selected.requiresNotes ? note.trim() : undefined,
              })
                .then(() => onOpenChange(false))
                .catch(() => undefined)
            }}
          >
            {busy ? 'Allowing…' : 'Allow carer to continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
