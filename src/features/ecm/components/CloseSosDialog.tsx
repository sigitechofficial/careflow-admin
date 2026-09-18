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
  canSubmitSosClose,
  SOS_ACTION_CODES,
  SOS_OUTCOME_CODES,
  type SosChipDef,
} from '@/features/ecm/utils/sos-outcome.util'

function ChipGroup({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: string | null
  options: SosChipDef[]
  disabled?: boolean
  onChange: (code: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map(row => {
          const selectedChip = row.code === value
          return (
            <button
              key={row.code}
              type="button"
              role="radio"
              aria-checked={selectedChip}
              disabled={disabled}
              onClick={() => onChange(row.code)}
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
    </div>
  )
}

export function CloseSosDialog({
  open,
  onOpenChange,
  busy,
  sentAtLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  busy?: boolean
  sentAtLabel?: string | null
  onConfirm: (payload: {
    actionCode: string
    outcomeCode: string
    actionNote?: string
    note?: string
  }) => Promise<void>
}) {
  const [actionCode, setActionCode] = React.useState<string | null>(null)
  const [outcomeCode, setOutcomeCode] = React.useState<string | null>(null)
  const [actionNote, setActionNote] = React.useState('')
  const [outcomeNote, setOutcomeNote] = React.useState('')

  React.useEffect(() => {
    if (!open) {
      setActionCode(null)
      setOutcomeCode(null)
      setActionNote('')
      setOutcomeNote('')
    }
  }, [open])

  const canSubmit = canSubmitSosClose(actionCode, outcomeCode, actionNote, outcomeNote)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" data-testid="close-sos-dialog">
        <DialogHeader>
          <DialogTitle>Close SOS</DialogTitle>
          <DialogDescription>
            Record the action you took and what the outcome was.
            {sentAtLabel ? ` Sent ${sentAtLabel}.` : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5">
          <ChipGroup
            label="Action taken"
            value={actionCode}
            options={SOS_ACTION_CODES}
            disabled={busy}
            onChange={setActionCode}
          />
          <FormField label="Action notes" htmlFor="close-sos-action-note" required>
            <Textarea
              id="close-sos-action-note"
              rows={3}
              className="min-h-[80px]"
              value={actionNote}
              onChange={e => setActionNote(e.target.value)}
              placeholder="Describe the action taken"
              required
              disabled={busy}
            />
          </FormField>
          <ChipGroup
            label="Outcome"
            value={outcomeCode}
            options={SOS_OUTCOME_CODES}
            disabled={busy}
            onChange={setOutcomeCode}
          />
          <FormField label="Outcome notes" htmlFor="close-sos-outcome-note" required>
            <Textarea
              id="close-sos-outcome-note"
              rows={3}
              className="min-h-[80px]"
              value={outcomeNote}
              onChange={e => setOutcomeNote(e.target.value)}
              placeholder="Describe the outcome"
              required
              disabled={busy}
            />
          </FormField>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || busy}
            onClick={() => {
              if (!actionCode || !outcomeCode) return
              void onConfirm({
                actionCode,
                outcomeCode,
                actionNote: actionNote.trim() || undefined,
                note: outcomeNote.trim() || undefined,
              })
                .then(() => onOpenChange(false))
                .catch(() => undefined)
            }}
          >
            {busy ? 'Closing…' : 'Close SOS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
