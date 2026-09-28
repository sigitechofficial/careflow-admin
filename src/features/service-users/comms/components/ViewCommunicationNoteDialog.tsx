import * as React from 'react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  formatCommunicationNoteDate,
  formatCommunicationNoteTime,
} from '@/features/service-users/comms/communication-note-format'
import type { CommunicationNoteRow } from '@/features/service-users/comms/types'

type Props = {
  note: CommunicationNoteRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-3">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

export function ViewCommunicationNoteDialog({ note, open, onOpenChange }: Props) {
  if (!note) return null

  const shareLabel =
    note.shareWith.length > 0
      ? note.shareWith.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
      : 'None'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-xl" data-testid="view-communication-note-dialog">
        <DialogHeader>
          <DialogTitle className="text-teal-700 dark:text-teal-300">Communication Note</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <dl className="space-y-3">
            <DetailRow label="Date" value={formatCommunicationNoteDate(note.recordedAt)} />
            <DetailRow label="Time" value={formatCommunicationNoteTime(note.recordedAt)} />
            <DetailRow label="Name" value={note.name} />
            <DetailRow label="Position" value={note.position} />
            <DetailRow label="Reason" value={note.reason} />
            <DetailRow label="Outcome" value={note.outcome} />
            <DetailRow label="Private note" value={note.isPrivate ? 'Yes' : 'No'} />
            <DetailRow label="Share with" value={shareLabel} />
            {note.signature ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Signature</p>
                <img
                  src={note.signature}
                  alt="Signature"
                  className="max-h-32 rounded-md border border-border bg-white"
                />
              </div>
            ) : null}
          </dl>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
