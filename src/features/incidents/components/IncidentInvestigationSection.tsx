import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { useUpsertIncidentInvestigation } from '@/features/incidents/hooks/useIncidents'
import {
  INCIDENT_CONTRIBUTING_FACTOR_OPTIONS,
  INCIDENT_PREVENTABILITY_OPTIONS,
  type IncidentInvestigation,
  type IncidentPreventability,
  type UpsertIncidentInvestigationInput,
} from '@/features/incidents/types'

const factorLabel = (code: string) =>
  INCIDENT_CONTRIBUTING_FACTOR_OPTIONS.find((f) => f.value === code)?.label ?? code

export function IncidentInvestigationSection({
  incidentId,
  investigation,
  canEdit,
}: {
  incidentId: string
  investigation: IncidentInvestigation | null
  canEdit: boolean
}) {
  const mutation = useUpsertIncidentInvestigation(incidentId)
  const [whatHappened, setWhatHappened] = React.useState(investigation?.whatHappened ?? '')
  const [whyHappened, setWhyHappened] = React.useState(investigation?.whyHappened ?? '')
  const [rootCause, setRootCause] = React.useState(investigation?.rootCause ?? '')
  const [conclusion, setConclusion] = React.useState(investigation?.conclusion ?? '')
  const [preventable, setPreventable] = React.useState<string>(investigation?.preventable ?? '')
  const [factors, setFactors] = React.useState<string[]>(investigation?.contributingFactors ?? [])

  function toggleFactor(code: string) {
    setFactors((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  function save(markComplete: boolean) {
    const input: UpsertIncidentInvestigationInput = {
      whatHappened: whatHappened.trim() || undefined,
      whyHappened: whyHappened.trim() || undefined,
      rootCause: rootCause.trim() || undefined,
      conclusion: conclusion.trim() || undefined,
      preventable: (preventable || undefined) as IncidentPreventability | undefined,
      contributingFactors: factors,
      markComplete,
    }
    mutation.mutate(input)
  }

  if (!canEdit) {
    if (!investigation) return <p className="text-sm text-muted-foreground">No investigation recorded yet.</p>
    return (
      <div className="space-y-3 text-sm">
        {investigation.whatHappened && <ReadField label="What happened" value={investigation.whatHappened} />}
        {investigation.whyHappened && <ReadField label="Why it happened" value={investigation.whyHappened} />}
        {investigation.contributingFactors.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Contributing factors</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {investigation.contributingFactors.map((f) => (
                <Badge key={f} variant="muted" size="sm">{factorLabel(f)}</Badge>
              ))}
            </div>
          </div>
        )}
        {investigation.rootCause && <ReadField label="Root cause" value={investigation.rootCause} />}
        {investigation.preventable && <ReadField label="Preventable" value={investigation.preventable} />}
        {investigation.conclusion && <ReadField label="Conclusion" value={investigation.conclusion} />}
        {investigation.completedAt && <Badge variant="success" size="sm">Investigation complete</Badge>}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <TextField label="What happened?" value={whatHappened} onChange={setWhatHappened} />
      <TextField label="Why did it happen?" value={whyHappened} onChange={setWhyHappened} />
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Contributing factors</p>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {INCIDENT_CONTRIBUTING_FACTOR_OPTIONS.map((f) => (
            <label key={f.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted/40">
              <input type="checkbox" checked={factors.includes(f.value)} onChange={() => toggleFactor(f.value)} className="h-3.5 w-3.5 rounded border-border" />
              {f.label}
            </label>
          ))}
        </div>
      </div>
      <TextField label="Root cause" value={rootCause} onChange={setRootCause} />
      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Could this have been prevented?</label>
        <select
          className="mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={preventable}
          onChange={(e) => setPreventable(e.target.value)}
        >
          <option value="">Not set</option>
          {INCIDENT_PREVENTABILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <TextField label="Conclusion" value={conclusion} onChange={setConclusion} />
      <div className="flex gap-2">
        <Button className="flex-1" size="sm" variant="outline" loading={mutation.isPending} onClick={() => save(false)}>
          Save
        </Button>
        <Button className="flex-1" size="sm" loading={mutation.isPending} onClick={() => save(true)}>
          Save &amp; complete
        </Button>
      </div>
    </div>
  )
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      <Textarea className="mt-1" rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
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
