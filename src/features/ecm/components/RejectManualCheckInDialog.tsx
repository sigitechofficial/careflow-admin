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
import {
  canSubmitManualReject,
  MANUAL_REJECT_REASONS,
} from '@/features/ecm/utils/manual-reject-reason.util'

export function RejectManualCheckInDialog({
  open,
  onOpenChange,
  busy,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy?: boolean
  onConfirm: (payload: { reasonCode: string; note?: string }) => Promise<void>
}) {
  const [reasonCode, setReasonCode] = React.useState<string | null>(null)
  const [note, setNote] = React.useState('')

  React.useEffect(() => {
    if (!open) {
      setReasonCode(null)
      setNote('')
    }
  }, [open])

  const selected = MANUAL_REJECT_REASONS.find(row => row.code === reasonCode) ?? null
  const showNote = Boolean(selected?.requiresNotes)
  const canSubmit = canSubmitManualReject(selected, note)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" data-testid="reject-manual-reason-dialog">
        <DialogHeader>
          <DialogTitle>Select reason</DialogTitle>
          <DialogDescription>
            Choose why Manual check-in is being declined for this carer and visit.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Rejection reason">
            {MANUAL_REJECT_REASONS.map(row => {
              const selectedChip = row.code === reasonCode
              return (
                <button
                  key={row.code}
                  type="button"
                  role="radio"
                  aria-checked={selectedChip}
                  disabled={busy}
                  onClick={() => {
                    setReasonCode(row.code)
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
          {showNote ? (
            <FormField label="Other reason" htmlFor="reject-manual-other-reason" required>
              <Textarea
                id="reject-manual-other-reason"
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
                reasonCode: selected.code,
                note: selected.requiresNotes ? note.trim() : undefined,
              })
                .then(() => onOpenChange(false))
                .catch(() => undefined)
            }}
          >
            {busy ? 'Rejecting…' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
