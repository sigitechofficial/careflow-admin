import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { CheckCircle2, ClipboardList } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Textarea } from '@/shared/ui/form-field'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { useCompleteIncidentAction, useMyIncidentActions } from '@/features/incidents/hooks/useIncidents'
import {
  INCIDENT_ACTION_STATUS_BADGE,
  measureNeedsCompletedRecord,
  INCIDENT_ACTION_STATUS_LABELS,
} from '@/features/incidents/types'

export default function MyActionsPage() {
  // Re-render when the organisation timezone loads so due dates use it.
  useOrganisationDisplayFormat()
  const { data: actions, isLoading } = useMyIncidentActions()
  const completeMutation = useCompleteIncidentAction()
  const [completingId, setCompletingId] = React.useState<string | null>(null)
  const [completionNotes, setCompletionNotes] = React.useState('')

  function confirmComplete() {
    if (!completingId || !completionNotes.trim()) return
    completeMutation.mutate(
      {
        actionId: completingId,
        completionNotes: completionNotes.trim(),
      },
      {
        onSuccess: () => {
          setCompletingId(null)
          setCompletionNotes('')
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Actions"
        description="Corrective measures from incidents assigned to you."
        icon={<ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accident & Incident' },
          { label: 'My Actions' },
        ]}
      />

      <div className="rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <p className="p-8 text-center text-muted-foreground">Loading…</p>
        ) : (actions?.length ?? 0) === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success/60" aria-hidden />
            <p className="mt-2 text-sm text-muted-foreground">You have no outstanding measures. Nice work.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {actions!.map((a) => (
              <li key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                      {a.title}
                      {a.isMandatory && <Badge variant="destructive" size="sm">Mandatory</Badge>}
                    </p>
                    {a.description && (
                      <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">
                        {a.description}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Link to="/incidents/$incidentId" params={{ incidentId: a.incidentId }} className="text-xs text-primary hover:underline">
                        {a.incidentReference}
                      </Link>
                      <Badge variant={INCIDENT_ACTION_STATUS_BADGE[a.displayStatus]} size="sm">
                        {INCIDENT_ACTION_STATUS_LABELS[a.displayStatus]}
                      </Badge>
                      {a.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          Due {formatOrganisationIsoDateLong(a.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  {measureNeedsCompletedRecord(a.measureType) ? (
                    // These need the updated / new record chosen, which the incident page offers.
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/incidents/$incidentId" params={{ incidentId: a.incidentId }}>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Complete on incident
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCompletingId(a.id)
                        setCompletionNotes('')
                      }}
                      disabled={completingId === a.id}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Mark as completed
                    </Button>
                  )}
                </div>

                {completingId === a.id && (
                  <div className="mt-3 space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">
                      How was it completed?
                      <span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                    </label>
                    <Textarea
                      rows={2}
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      placeholder="What was done — this is the evidence the measure was completed"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        loading={completeMutation.isPending}
                        disabled={!completionNotes.trim()}
                        onClick={confirmComplete}
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Confirm complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCompletingId(null)
                          setCompletionNotes('')
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
