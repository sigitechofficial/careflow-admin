import * as React from 'react'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { Badge } from '@/shared/ui/badge'
import type { IncidentTimelineEvent } from '@/features/incidents/types'

const KIND_META: Record<string, { label: string; variant: 'info' | 'warning' | 'muted' }> = {
  REPORTED: { label: 'Reported', variant: 'info' },
  STATUS: { label: 'Status', variant: 'muted' },
  SEVERITY: { label: 'Severity', variant: 'warning' },
  REVIEW: { label: 'Review', variant: 'muted' },
  INVESTIGATION: { label: 'Investigation', variant: 'muted' },
  ACTION: { label: 'Measure', variant: 'muted' },
  OUTCOME: { label: 'Outcome', variant: 'muted' },
  CORRECTION: { label: 'Correction', variant: 'warning' },
  CLARIFICATION: { label: 'Clarification', variant: 'info' },
  INJURY: { label: 'Injury', variant: 'warning' },
  WITNESS: { label: 'Witness', variant: 'muted' },
  REVIEW_FLAG: { label: 'Review flag', variant: 'warning' },
  DOCUMENT: { label: 'Document', variant: 'muted' },
  SUSPENSION: { label: 'Suspension', variant: 'warning' },
  STAFF_ACTION: { label: 'Staff action', variant: 'warning' },
  CANDOUR: { label: 'Duty of Candour', variant: 'info' },
  EXTERNAL: { label: 'External body', variant: 'info' },
}

export function IncidentTimeline({ events }: { events: IncidentTimelineEvent[] }) {
  const sorted = React.useMemo(
    () => [...events].sort((a, b) => b.at.localeCompare(a.at)),
    [events],
  )

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">No timeline events yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">When</th>
              <th className="px-3 py-2.5 font-medium">Type</th>
              <th className="px-3 py-2.5 font-medium">Action</th>
              <th className="px-3 py-2.5 font-medium">By</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ev, i) => {
              const meta = KIND_META[ev.kind] ?? { label: ev.kind, variant: 'muted' as const }
              return (
                <tr
                  key={`${ev.at}-${ev.kind}-${i}`}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 align-top tabular-nums text-muted-foreground">
                    <time dateTime={ev.at}>{formatOrganisationDateTime(ev.at)}</time>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <Badge variant={meta.variant} size="sm">
                      {meta.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 align-top text-foreground">{ev.detail}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-top text-foreground">
                    {ev.byName?.trim() || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
