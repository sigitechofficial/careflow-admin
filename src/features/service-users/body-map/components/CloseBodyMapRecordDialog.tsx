import * as React from 'react'
import type { BodyMapRecordRow } from '@/features/service-users/body-map/types'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Textarea } from '@/shared/ui/form-field'

function needsManagerSignOff(record: BodyMapRecordRow): boolean {
  return (
    record.safeguardingTriggered ||
    record.managerReviewRequired ||
    record.status === 'AWAITING_REVIEW' ||
    record.riskLevel === 'HIGH' ||
    record.riskLevel === 'URGENT'
  )
}

type Props = {
  record: BodyMapRecordRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  saving?: boolean
  onConfirm: (payload: { closureNote: string; managerSignOff?: boolean }) => void
}

export function CloseBodyMapRecordDialog({
  record,
  open,
  onOpenChange,
  saving,
  onConfirm,
}: Props) {
  const [closureNote, setClosureNote] = React.useState('')
  const [managerSignOff, setManagerSignOff] = React.useState(false)
  const requireSignOff = record ? needsManagerSignOff(record) : false

  React.useEffect(() => {
    if (open) {
      setClosureNote('')
      setManagerSignOff(false)
    }
  }, [open, record?.id])

  const canSubmit =
    closureNote.trim().length > 0 && (!requireSignOff || managerSignOff)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Close body map record</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {requireSignOff ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              This record requires manager sign-off before closure (safeguarding, high risk, or
              awaiting review).
            </p>
          ) : null}
          <label className="block text-sm font-medium">
            Closure note (required)
            <Textarea
              className="mt-1"
              rows={4}
              value={closureNote}
              onChange={e => setClosureNote(e.target.value)}
              placeholder="Final observation, outcome, and any follow-up"
            />
          </label>
          {requireSignOff ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={managerSignOff}
                onChange={e => setManagerSignOff(e.target.checked)}
              />
              <span>I confirm manager review and authorise closure of this record</span>
            </label>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit || saving}
            onClick={() =>
              onConfirm({
                closureNote: closureNote.trim(),
                managerSignOff: requireSignOff ? true : undefined,
              })
            }
          >
            {saving ? 'Closing…' : 'Close record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
