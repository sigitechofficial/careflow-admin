import * as React from 'react'
import { CheckCircle2, Plus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import {
  useCompleteIncidentAction,
  useCreateIncidentAction,
} from '@/features/incidents/hooks/useIncidents'
import {
  INCIDENT_ACTION_STATUS_BADGE,
  INCIDENT_ACTION_STATUS_LABELS,
  type CreateIncidentActionInput,
  type IncidentAction,
  type IncidentActionPriority,
} from '@/features/incidents/types'

const PRIORITY_BADGE: Record<IncidentActionPriority, 'muted' | 'warning' | 'destructive'> = {
  LOW: 'muted',
  MEDIUM: 'warning',
  HIGH: 'destructive',
}

export function IncidentActionsSection({
  incidentId,
  actions,
  canManage,
}: {
  incidentId: string
  actions: IncidentAction[]
  canManage: boolean
}) {
  const createMutation = useCreateIncidentAction(incidentId)
  const completeMutation = useCompleteIncidentAction()
  const [adding, setAdding] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [priority, setPriority] = React.useState<IncidentActionPriority>('MEDIUM')
  const [dueDate, setDueDate] = React.useState('')
  const [isMandatory, setIsMandatory] = React.useState(false)

  function submit() {
    if (!title.trim()) return
    const input: CreateIncidentActionInput = {
      title: title.trim(),
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      isMandatory,
    }
    createMutation.mutate(input, {
      onSuccess: () => {
        setTitle('')
        setDueDate('')
        setIsMandatory(false)
        setPriority('MEDIUM')
        setAdding(false)
      },
    })
  }

  return (
    <div className="space-y-3">
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No corrective actions yet.</p>
      ) : (
        <ul className="space-y-2">
          {actions.map((a) => (
            <li key={a.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                    {a.title}
                    {a.isMandatory && <Badge variant="destructive" size="sm">Mandatory</Badge>}
                  </p>
                  {a.description && <p className="mt-0.5 text-sm text-muted-foreground">{a.description}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant={INCIDENT_ACTION_STATUS_BADGE[a.displayStatus]} size="sm">
                      {INCIDENT_ACTION_STATUS_LABELS[a.displayStatus]}
                    </Badge>
                    <Badge variant={PRIORITY_BADGE[a.priority]} size="sm">{a.priority}</Badge>
                    {a.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        Due {formatOrganisationIsoDateLong(a.dueDate)}
                      </span>
                    )}
                  </div>
                  {a.completionNotes && (
                    <p className="mt-1.5 text-xs text-muted-foreground">✓ {a.completionNotes}</p>
                  )}
                </div>
                {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={completeMutation.isPending}
                    onClick={() => completeMutation.mutate({ actionId: a.id })}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Complete
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage &&
        (adding ? (
          <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
            <Input placeholder="Action title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={priority}
                onChange={(e) => setPriority(e.target.value as IncidentActionPriority)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              <input
                type="date"
                className="h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Due date"
              />
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <input type="checkbox" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} className="h-4 w-4 rounded border-border" />
                Mandatory
              </label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" loading={createMutation.isPending} onClick={submit} disabled={!title.trim()}>
                Add action
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add corrective action
          </Button>
        ))}
    </div>
  )
}
