import * as React from 'react'
import { CheckCircle2, Lock, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import {
  useChangeIncidentStatus,
  useUpsertIncidentOutcome,
} from '@/features/incidents/hooks/useIncidents'
import {
  INCIDENT_OUTCOME_CHANGE_OPTIONS,
  INCIDENT_PREVENTABILITY_OPTIONS,
  type IncidentDetail,
  type IncidentOutcome,
  type IncidentPreventability,
  type UpsertIncidentOutcomeInput,
} from '@/features/incidents/types'

const selectClass =
  'mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

function triToValue(v: boolean | null | undefined): string {
  return v === true ? 'yes' : v === false ? 'no' : ''
}
function valueToTri(v: string): boolean | undefined {
  return v === 'yes' ? true : v === 'no' ? false : undefined
}

/** Prefer ready-to-close; investigate-stage close is not offered in the primary path. */
const CLOSABLE_FROM = ['AWAITING_CLOSURE']

export function IncidentOutcomeSection({
  incident,
  outcome,
  canEditOutcome,
  canClose,
  canReopen,
}: {
  incident: IncidentDetail
  outcome: IncidentOutcome | null
  canEditOutcome: boolean
  canClose: boolean
  canReopen: boolean
}) {
  const saveOutcome = useUpsertIncidentOutcome(incident.id)
  const statusMutation = useChangeIncidentStatus(incident.id)

  const [finalOutcome, setFinalOutcome] = React.useState(outcome?.finalOutcome ?? '')
  const [lessons, setLessons] = React.useState(outcome?.lessonsLearned ?? '')
  const [preventability, setPreventability] = React.useState<string>(outcome?.preventability ?? '')
  const [changes, setChanges] = React.useState<string[]>(outcome?.changesMade ?? [])
  const [sharedStaff, setSharedStaff] = React.useState(triToValue(outcome?.informationSharedWithStaff))
  const [suInformed, setSuInformed] = React.useState(triToValue(outcome?.serviceUserInformed))
  const [nokInformed, setNokInformed] = React.useState(triToValue(outcome?.nokInformed))
  const [comments, setComments] = React.useState(outcome?.finalManagementComments ?? '')

  const isClosed = incident.status === 'CLOSED'
  const canShowClose = canClose && CLOSABLE_FROM.includes(incident.status)
  // Mirrors the backend rule: incomplete mandatory measures block High/Critical closure unless
  // the closer overrides with an audited reason.
  const outstandingMandatory =
    incident.severity === 'HIGH' || incident.severity === 'CRITICAL'
      ? incident.actions.filter(
          (a) => a.isMandatory && a.status !== 'COMPLETED' && a.status !== 'CANCELLED',
        ).length
      : 0
  const [overrideMandatory, setOverrideMandatory] = React.useState(false)
  const [overrideReason, setOverrideReason] = React.useState('')
  const closeBlockedByMandatory =
    outstandingMandatory > 0 && (!overrideMandatory || !overrideReason.trim())
  const canReinvestigate =
    canReopen &&
    (incident.status === 'CLOSED' ||
      incident.status === 'AWAITING_CLOSURE' ||
      incident.status === 'REOPENED')

  function toggleChange(code: string) {
    setChanges((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  function buildInput(): UpsertIncidentOutcomeInput {
    return {
      finalOutcome: finalOutcome.trim() || undefined,
      lessonsLearned: lessons.trim() || undefined,
      preventability: (preventability || undefined) as IncidentPreventability | undefined,
      changesMade: changes,
      informationSharedWithStaff: valueToTri(sharedStaff),
      serviceUserInformed: valueToTri(suInformed),
      nokInformed: valueToTri(nokInformed),
      finalManagementComments: comments.trim() || undefined,
    }
  }

  function close() {
    // Persist the outcome first so the closure validation passes, then close.
    saveOutcome.mutate(buildInput(), {
      onSuccess: () =>
        statusMutation.mutate(
          outstandingMandatory > 0
            ? { status: 'CLOSED', reason: overrideReason.trim(), overrideMandatoryActions: true }
            : { status: 'CLOSED', reason: 'Closed with recorded outcome' },
        ),
    })
  }

  function submitForReinvestigation() {
    const reason = window.prompt('Reason for re-investigation?')
    if (!reason?.trim()) return
    statusMutation.mutate({ status: 'UNDER_INVESTIGATION', reason: reason.trim() })
  }

  // Read-only view for users who can't edit the outcome.
  if (!canEditOutcome) {
    if (!outcome?.finalOutcome && !isClosed) {
      return <p className="text-sm text-muted-foreground">No closure outcome recorded yet.</p>
    }
    return (
      <div className="space-y-2 text-sm">
        {isClosed && (
          <Badge variant="success" size="sm">
            <Lock className="mr-1 h-3 w-3" /> Closed
          </Badge>
        )}
        {outcome?.finalOutcome && <ReadField label="Final outcome" value={outcome.finalOutcome} />}
        {outcome?.lessonsLearned && <ReadField label="Lessons learned" value={outcome.lessonsLearned} />}
        {canReinvestigate && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            loading={statusMutation.isPending}
            onClick={submitForReinvestigation}
          >
            <RotateCcw className="mr-1 h-4 w-4" /> Submit for re-investigation
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {isClosed && (
        <div className="flex items-center justify-between rounded-md bg-success/10 px-3 py-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" /> Incident closed
          </span>
          {canReinvestigate && (
            <Button
              size="sm"
              variant="outline"
              loading={statusMutation.isPending}
              onClick={submitForReinvestigation}
            >
              <RotateCcw className="mr-1 h-4 w-4" /> Submit for re-investigation
            </Button>
          )}
        </div>
      )}

      {!isClosed && canReinvestigate && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            loading={statusMutation.isPending}
            onClick={submitForReinvestigation}
          >
            <RotateCcw className="mr-1 h-4 w-4" /> Submit for re-investigation
          </Button>
        </div>
      )}

      <FieldLabel label="Final outcome" required>
        <Textarea rows={2} value={finalOutcome} onChange={(e) => setFinalOutcome(e.target.value)} />
      </FieldLabel>
      <FieldLabel label="Lessons learned">
        <Textarea rows={2} value={lessons} onChange={(e) => setLessons(e.target.value)} />
      </FieldLabel>

      <FieldLabel label="Preventability">
        <select className={selectClass} value={preventability} onChange={(e) => setPreventability(e.target.value)}>
          <option value="">Not set</option>
          {INCIDENT_PREVENTABILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FieldLabel>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Changes made</p>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {INCIDENT_OUTCOME_CHANGE_OPTIONS.map((o) => (
            <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted/40">
              <input type="checkbox" checked={changes.includes(o.value)} onChange={() => toggleChange(o.value)} className="h-3.5 w-3.5 rounded border-border" />
              {o.label}
            </label>
          ))}
        </div>
      </div>

      <TriField label="Information shared with staff?" value={sharedStaff} onChange={setSharedStaff} />
      <TriField label="Service User informed?" value={suInformed} onChange={setSuInformed} />
      <TriField label="Next of kin informed?" value={nokInformed} onChange={setNokInformed} />

      <FieldLabel label="Final management comments">
        <Textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} />
      </FieldLabel>

      {canShowClose && !isClosed && outstandingMandatory > 0 && (
        <div className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3">
          <p className="text-sm text-warning">
            This {incident.severityLabel.toLowerCase()} incident has {outstandingMandatory} incomplete
            mandatory corrective measure{outstandingMandatory === 1 ? '' : 's'}. Complete{' '}
            {outstandingMandatory === 1 ? 'it' : 'them'} before closing, or override with a reason.
          </p>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={overrideMandatory}
              onChange={(e) => setOverrideMandatory(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Override and close anyway
          </label>
          {overrideMandatory && (
            <Textarea
              rows={2}
              placeholder="Reason for overriding (required, recorded in the audit log)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
          )}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="outline" loading={saveOutcome.isPending} onClick={() => saveOutcome.mutate(buildInput())}>
          Save outcome
        </Button>
        {canShowClose && !isClosed && (
          <Button
            size="sm"
            loading={saveOutcome.isPending || statusMutation.isPending}
            disabled={!finalOutcome.trim() || closeBlockedByMandatory}
            onClick={close}
          >
            <Lock className="mr-1 h-4 w-4" /> Close incident
          </Button>
        )}
      </div>
      {!isClosed && canShowClose && !finalOutcome.trim() && (
        <p className="text-xs text-muted-foreground">A final outcome is required before an incident can be closed.</p>
      )}
      {!isClosed && !canShowClose && incident.status !== 'CLOSED' && (
        <p className="text-xs text-muted-foreground">
          Move the incident to “Awaiting Closure” (Ready to close) before closing.
        </p>
      )}
    </div>
  )
}

function FieldLabel({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  )
}

function TriField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-foreground">{label}</label>
      <select
        className="h-8 w-24 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </div>
  )
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-foreground">{value}</p>
    </div>
  )
}
