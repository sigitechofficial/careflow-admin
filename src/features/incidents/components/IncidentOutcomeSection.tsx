import * as React from 'react'
import { CheckCircle2, Lock } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import {
  useUpsertIncidentOutcome,
} from '@/features/incidents/hooks/useIncidents'
import { useContributingFactorOptions } from '@/features/incidents/hooks/useContributingFactorOptions'
import {
  ContributingFactorDetailEditor,
  ContributingFactorsReadView,
} from '@/features/incidents/components/ContributingFactorDetail'
import {
  INCIDENT_CONTRIBUTING_FACTOR_OPTIONS,
  INCIDENT_OUTCOME_CHANGE_DETAIL,
  INCIDENT_OUTCOME_CHANGE_OPTIONS,
  INCIDENT_PREVENTABILITY_OPTIONS,
  type ContributingFactorDetail,
  type ContributingFactorDetails,
  type IncidentDetail,
  type IncidentOutcome,
  type IncidentPreventability,
  type UpsertIncidentOutcomeInput,
} from '@/features/incidents/types'

const changeLabel = (code: string) =>
  INCIDENT_OUTCOME_CHANGE_OPTIONS.find((o) => o.value === code)?.label ?? code

const selectClass =
  'mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

function triToValue(v: boolean | null | undefined): string {
  return v === true ? 'yes' : v === false ? 'no' : ''
}
function valueToTri(v: string): boolean | undefined {
  return v === 'yes' ? true : v === 'no' ? false : undefined
}

/** Prefer ready-to-close; investigate-stage close is not offered in the primary path. */

export function IncidentOutcomeSection({
  incident,
  outcome,
  canEditOutcome,
}: {
  incident: IncidentDetail
  outcome: IncidentOutcome | null
  canEditOutcome: boolean
}) {
  const saveOutcome = useUpsertIncidentOutcome(incident.id)

  const [finalOutcome, setFinalOutcome] = React.useState(outcome?.finalOutcome ?? '')
  const [lessons, setLessons] = React.useState(outcome?.lessonsLearned ?? '')
  const [preventability, setPreventability] = React.useState<string>(outcome?.preventability ?? '')
  const [changes, setChanges] = React.useState<string[]>(outcome?.changesMade ?? [])
  const [changeDetails, setChangeDetails] = React.useState<ContributingFactorDetails>(
    outcome?.changesMadeDetails ?? {},
  )
  // People involved in the incident (older incidents only have the primary person).
  const serviceUsers = incident.involvedServiceUsers?.length
    ? incident.involvedServiceUsers
    : incident.primaryServiceUser
      ? [incident.primaryServiceUser]
      : []
  const involvedEmployees = incident.involvedEmployees?.length
    ? incident.involvedEmployees
    : incident.primaryEmployee
      ? [incident.primaryEmployee]
      : []
  const changeOptions = useContributingFactorOptions(serviceUsers, {
    carePlans: canEditOutcome && changes.includes('CARE_PLAN'),
    assessments: canEditOutcome && changes.includes('RISK_ASSESSMENT'),
    medications: false,
  })
  const setChangeDetail = (code: string, detail: ContributingFactorDetail) =>
    setChangeDetails((prev) => ({ ...prev, [code]: detail }))
  const [sharedStaff, setSharedStaff] = React.useState(triToValue(outcome?.informationSharedWithStaff))
  const [suInformed, setSuInformed] = React.useState(triToValue(outcome?.serviceUserInformed))
  const [nokInformed, setNokInformed] = React.useState(triToValue(outcome?.nokInformed))
  const [comments, setComments] = React.useState(outcome?.finalManagementComments ?? '')

  const isClosed = incident.status === 'CLOSED'

  function toggleChange(code: string) {
    setChanges((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  function buildInput(): UpsertIncidentOutcomeInput {
    return {
      finalOutcome: finalOutcome.trim() || undefined,
      lessonsLearned: lessons.trim() || undefined,
      preventability: (preventability || undefined) as IncidentPreventability | undefined,
      changesMade: changes,
      // Only ticked changes are kept (the server drops the rest).
      changesMadeDetails: changes.reduce<ContributingFactorDetails>((acc, c) => {
        const detail = changeDetails[c]
        if (detail) acc[c] = detail
        return acc
      }, {}),
      informationSharedWithStaff: valueToTri(sharedStaff),
      serviceUserInformed: valueToTri(suInformed),
      nokInformed: valueToTri(nokInformed),
      finalManagementComments: comments.trim() || undefined,
    }
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
        {outcome && outcome.changesMade.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Changes made</p>
            <ContributingFactorsReadView
              factors={outcome.changesMade}
              details={outcome.changesMadeDetails}
              labelFor={changeLabel}
            />
          </div>
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

      {/* Reminder of the causes found, so each one can be matched with a change below. */}
      {incident.investigation && incident.investigation.contributingFactors.length > 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
          <p className="text-xs font-semibold text-foreground">Causes found in the investigation</p>
          <p className="text-xs text-muted-foreground">
            Check that each cause has a matching change below.
          </p>
          <ContributingFactorsReadView
            factors={incident.investigation.contributingFactors}
            details={incident.investigation.contributingFactorDetails}
            labelFor={(code) =>
              INCIDENT_CONTRIBUTING_FACTOR_OPTIONS.find((f) => f.value === code)?.label ?? code
            }
          />
        </div>
      )}

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
        {changes.length > 0 && (
          <div className="mt-2 space-y-2">
            {INCIDENT_OUTCOME_CHANGE_OPTIONS.filter((o) => changes.includes(o.value)).map((o) => (
              <ContributingFactorDetailEditor
                key={o.value}
                label={o.label}
                config={INCIDENT_OUTCOME_CHANGE_DETAIL[o.value] ?? { pick: 'note', question: '' }}
                detail={changeDetails[o.value] ?? {}}
                onChange={(d) => setChangeDetail(o.value, d)}
                recordOptions={{
                  carePlan: { options: changeOptions.carePlanOptions, loading: changeOptions.loading.carePlans },
                  riskAssessment: {
                    options: changeOptions.assessmentOptions,
                    loading: changeOptions.loading.assessments,
                  },
                  medication: { options: [], loading: false },
                }}
                involvedEmployees={involvedEmployees}
                hasServiceUser={serviceUsers.length > 0}
              />
            ))}
          </div>
        )}
      </div>

      <TriField label="Information shared with staff?" value={sharedStaff} onChange={setSharedStaff} />
      <TriField label="Service User informed?" value={suInformed} onChange={setSuInformed} />
      <TriField label="Next of kin informed?" value={nokInformed} onChange={setNokInformed} />

      <FieldLabel label="Final management comments">
        <Textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} />
      </FieldLabel>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" loading={saveOutcome.isPending} onClick={() => saveOutcome.mutate(buildInput())}>
          Save outcome
        </Button>
        {!isClosed && (
          <p className="text-xs text-muted-foreground">
            A final outcome is required before closing. Close the incident from “Next step” at the top.
          </p>
        )}
      </div>
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
