import * as React from 'react'
import { formatDate } from '@/shared/lib/utils'
import type { HoursRequestChange } from '@/features/hours-approvals/types'

const SHOWN = 4

function changeText(c: HoursRequestChange): string {
  switch (c.kind) {
    case 'TIME_CHANGE':
      return `${c.slotLabel} ${c.fromStart}–${c.fromEnd} → ${c.toStart}–${c.toEnd} — new time, upcoming visits keep the current time until approved`
    case 'EXTRA_EDIT':
      return `${c.date ? `${formatDate(c.date)} · ` : ''}Extra visit ${c.fromStart}–${c.fromEnd} → ${c.toStart}–${c.toEnd} — keeps its current time and carers until approved`
    default:
      return `${c.date ? `${formatDate(c.date)} · ` : ''}${c.slotLabel}${c.startTime ? ` ${c.startTime}–${c.endTime}` : ''} — carer not on this visit until approved`
  }
}

/** What a carer-hours request waits on (visits held back, new times), for the manager to see. */
export function HoursRequestChanges({ changes }: { changes: HoursRequestChange[] }) {
  const [open, setOpen] = React.useState(false)
  if (!changes.length) return null
  const shown = open ? changes : changes.slice(0, SHOWN)
  return (
    <div className="mt-1 space-y-0.5" data-testid="hours-request-changes">
      <ul className="space-y-0.5 text-xs text-foreground">
        {shown.map((c, i) => (
          <li key={i}>{changeText(c)}</li>
        ))}
      </ul>
      {changes.length > SHOWN ? (
        <button
          type="button"
          className="text-xs text-primary underline-offset-2 hover:underline"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Show less' : `Show all ${changes.length}`}
        </button>
      ) : null}
    </div>
  )
}
