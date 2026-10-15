import * as React from 'react'
import { CheckCircle2, Lock } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useUpsertIncidentOutcome } from '@/features/incidents/hooks/useIncidents'
import {
  IncidentStaffActionsSection,
  isStaffMeasure,
} from '@/features/incidents/components/IncidentStaffActionsSection'
import { IncidentExternalBodiesSummary } from '@/features/incidents/components/IncidentExternalBodiesCard'
import { ContributingFactorsReadView } from '@/features/incidents/components/ContributingFactorDetail'
import {
  INCIDENT_ACTION_STATUS_BADGE,
  INCIDENT_ACTION_STATUS_LABELS,
  INCIDENT_CONTRIBUTING_FACTOR_OPTIONS,
  INCIDENT_OUTCOME_CHANGE_OPTIONS,
  INCIDENT_PREVENTABILITY_OPTIONS,
  // LEARNING_SHARED_METHOD_OPTIONS, — used by the commented-out "Learning shared with the team" form
  OUTCOME_NOT_SHARED_REASON_OPTIONS,
  OUTCOME_SHARING_METHOD_OPTIONS,
  incidentMeasureTypeLabel,
  type IncidentDetail,
  type IncidentOutcome,
  type IncidentPreventability,
  type OutcomeSharingEntry,
  type UpsertIncidentOutcomeInput,
} from '@/features/incidents/types'

const selectClass =
  'h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const changeLabel = (code: string) =>
  INCIDENT_OUTCOME_CHANGE_OPTIONS.find((o) => o.value === code)?.label ?? code
const preventabilityLabel = (v: string | null | undefined) =>
  INCIDENT_PREVENTABILITY_OPTIONS.find((o) => o.value === v)?.label ?? null
const optionLabel = (opts: { value: string; label: string }[], v: string | null) =>
  opts.find((o) => o.value === v)?.label ?? v ?? ''

/**
 * Who should hear the outcome, built from the people on the incident: each service user and
 * their next of kin / representative, affected staff, and another affected person. Saved rows
 * (with their answers) are kept; a death pre-selects "Passed away" for the service user.
 */
function sharingRows(incident: IncidentDetail, saved: OutcomeSharingEntry[]): OutcomeSharingEntry[] {
  const blank = (key: string, personKind: OutcomeSharingEntry['personKind'], name: string): OutcomeSharingEntry => ({
    key,
    personKind,
    name,
    shared: false,
    sharedOn: null,
    method: null,
    notSharedReason: null,
    note: null,
  })
  const serviceUsers = incident.involvedServiceUsers?.length
    ? incident.involvedServiceUsers
    : incident.primaryServiceUser
      ? [incident.primaryServiceUser]
      : []
  const employees = incident.involvedEmployees?.length
    ? incident.involvedEmployees
    : incident.primaryEmployee
      ? [incident.primaryEmployee]
      : []
  const staffAffected =
    (incident.affectedPersonKinds ?? []).includes('EMPLOYEE') ||
    incident.category.key === 'VIOLENCE_TO_STAFF'
  const died = incident.category.key === 'DEATH'

  const rows: OutcomeSharingEntry[] = []
  for (const su of serviceUsers) {
    const row = blank(`SU:${su.id}`, 'SERVICE_USER', su.name ?? 'Service user')
    if (died && su.id === incident.primaryServiceUser?.id) row.notSharedReason = 'PASSED_AWAY'
    rows.push(row)
    rows.push(blank(`REP:${su.id}`, 'REPRESENTATIVE', ''))
  }
  if (staffAffected) {
    for (const e of employees) rows.push(blank(`STAFF:${e.id}`, 'STAFF', e.name ?? 'Staff member'))
  }
  if (incident.primaryPersonName) rows.push(blank('OTHER', 'OTHER', incident.primaryPersonName))

  const byKey = new Map(saved.map((s) => [s.key, s]))
  const merged = rows.map((r) => byKey.get(r.key) ?? r)
  // Keep saved rows that no longer match a person (e.g. people changed later).
  for (const s of saved) if (!rows.some((r) => r.key === s.key)) merged.push(s)
  return withCandourRows(merged, incident.candour?.outcomeRows ?? [])
}

/**
 * Duty of Candour results letters are the outcome being shared: those rows come from the Review
 * tab and can't be changed here. A row that no longer has a letter goes back to unanswered.
 */
function withCandourRows(rows: OutcomeSharingEntry[], candour: OutcomeSharingEntry[]): OutcomeSharingEntry[] {
  const out = rows.map((r) => {
    const linked = candour.find((c) => c.key === r.key)
    if (linked) return linked
    if (r.source === 'CANDOUR') {
      return { ...r, shared: false, sharedOn: null, method: null, notSharedReason: null, note: null, source: null, attachmentId: null }
    }
    return r
  })
  for (const c of candour) if (!out.some((r) => r.key === c.key)) out.push(c)
  return out
}

function rowTitle(r: OutcomeSharingEntry, incident: IncidentDetail): string {
  if (r.personKind === 'REPRESENTATIVE') {
    const suId = r.key.slice('REP:'.length)
    const su = (incident.involvedServiceUsers ?? []).find((s) => s.id === suId) ?? incident.primaryServiceUser
    return `Next of kin / representative${su?.name ? ` of ${su.name}` : ''}`
  }
  if (r.personKind === 'SERVICE_USER') return `Service user — ${r.name}`
  if (r.personKind === 'STAFF') return `Staff member affected — ${r.name}`
  return `Other person affected — ${r.name}`
}

/** What a row still needs (mirrors the API). */
function rowMissing(r: OutcomeSharingEntry, today: string): string | null {
  if (r.source === 'CANDOUR') return null
  if (r.shared) {
    if (!r.name.trim()) return 'name'
    if (!r.sharedOn) return 'date'
    if (r.sharedOn > today) return 'date not in the future'
    if (!r.method) return 'how'
    return null
  }
  if (!r.notSharedReason) return 'shared or not'
  if (r.notSharedReason === 'NOT_APPROPRIATE' && !r.note?.trim()) return 'why not appropriate'
  return null
}

function sharingSummary(r: OutcomeSharingEntry): string {
  if (r.shared) {
    return `Shared ${r.sharedOn ? formatOrganisationIsoDateLong(r.sharedOn) : ''} · ${optionLabel(OUTCOME_SHARING_METHOD_OPTIONS, r.method)}`
  }
  return `Not shared — ${optionLabel(OUTCOME_NOT_SHARED_REASON_OPTIONS, r.notSharedReason)}${r.note ? `: ${r.note}` : ''}`
}

/** Corrective measures as the record of what changed (replaces the old "Changes made" boxes). */
function MeasuresSummary({ incident }: { incident: IncidentDetail }) {
  // Training and supervision are listed under Staff actions.
  const actions = (incident.actions ?? []).filter((a) => !isStaffMeasure(a))
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        What changed (corrective measures)
      </p>
      {actions.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">No corrective measures were recorded.</p>
      ) : (
        <ul className="mt-1 space-y-1.5">
          {actions.map((a) => (
            <li key={a.id} className="rounded-md border border-border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                {incidentMeasureTypeLabel(a.measureType) && (
                  <Badge variant="info" size="sm">
                    {incidentMeasureTypeLabel(a.measureType)}
                  </Badge>
                )}
                <span className="font-medium text-foreground">{a.title}</span>
                <Badge variant={INCIDENT_ACTION_STATUS_BADGE[a.displayStatus]} size="sm">
                  {INCIDENT_ACTION_STATUS_LABELS[a.displayStatus]}
                </Badge>
              </div>
              {(a.completedRecords ?? []).length > 0 && (
                <p className="mt-0.5 text-xs text-foreground">
                  Updated / added: {(a.completedRecords ?? []).map((i) => i.label).join(', ')}
                </p>
              )}
              {a.completionNotes && (
                <p className="mt-0.5 text-xs text-muted-foreground">✓ {a.completionNotes}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-muted-foreground">Add or change measures in the Corrective measures tab.</p>
    </div>
  )
}

/** Older outcomes recorded changes and Yes/No answers directly — still shown read-only. */
function LegacyOutcomeAnswers({ outcome }: { outcome: IncidentOutcome | null }) {
  if (!outcome) return null
  const tri = (v: boolean | null) => (v === true ? 'Yes' : v === false ? 'No' : null)
  const answers = [
    ['Information shared with staff', tri(outcome.informationSharedWithStaff)],
    ['Service user informed', tri(outcome.serviceUserInformed)],
    ['Next of kin informed', tri(outcome.nokInformed)],
  ].filter(([, v]) => v) as [string, string][]
  if (!outcome.changesMade.length && !answers.length) return null
  return (
    <div className="rounded-md border border-dashed border-border p-3 text-sm">
      <p className="text-xs font-semibold text-muted-foreground">Recorded earlier (before this form changed)</p>
      {outcome.changesMade.length > 0 && (
        <ContributingFactorsReadView
          factors={outcome.changesMade}
          details={outcome.changesMadeDetails}
          labelFor={changeLabel}
        />
      )}
      {answers.map(([k, v]) => (
        <p key={k} className="text-xs text-muted-foreground">
          {k}: {v}
        </p>
      ))}
    </div>
  )
}

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
  const today = operationalTodayIso()
  const isClosed = incident.status === 'CLOSED'
  const investigation = incident.investigation

  const [finalOutcome, setFinalOutcome] = React.useState(outcome?.finalOutcome ?? '')
  const [lessons, setLessons] = React.useState(outcome?.lessonsLearned ?? '')
  const [preventability, setPreventability] = React.useState<string>(outcome?.preventability ?? '')
  const [rows, setRows] = React.useState<OutcomeSharingEntry[]>(() =>
    sharingRows(incident, outcome?.outcomeSharing ?? []),
  )
  // A results letter recorded (or changed) on the Review tab updates those rows here too.
  const candourRowsKey = JSON.stringify(incident.candour?.outcomeRows ?? [])
  React.useEffect(() => {
    setRows((prev) => withCandourRows(prev, JSON.parse(candourRowsKey) as OutcomeSharingEntry[]))
  }, [candourRowsKey])
  // "Learning shared with the team" form is commented out for now; keep the saved values as they are.
  const [learnedOn] = React.useState(outcome?.learningSharedOn ?? '')
  const [learnedHow] = React.useState(outcome?.learningSharedMethod ?? '')
  const [learnedNote] = React.useState(outcome?.learningSharedNote ?? '')
  const [comments, setComments] = React.useState(outcome?.finalManagementComments ?? '')
  const [triedSave, setTriedSave] = React.useState(false)

  const patchRow = (key: string, patch: Partial<OutcomeSharingEntry>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const missing = [
    !finalOutcome.trim() && 'final outcome',
    investigation && !lessons.trim() && 'lessons learned',
    ...rows.map((r) => {
      const m = rowMissing(r, today)
      return m ? `${rowTitle(r, incident)} (${m})` : null
    }),
    !!learnedOn !== !!learnedHow && 'when and how the learning was shared',
    learnedOn && learnedOn > today && 'a learning-shared date that is not in the future',
  ].filter((m): m is string => Boolean(m))

  function save() {
    setTriedSave(true)
    if (missing.length) return
    const input: UpsertIncidentOutcomeInput = {
      finalOutcome: finalOutcome.trim() || undefined,
      lessonsLearned: lessons.trim() || undefined,
      ...(investigation
        ? {}
        : { preventability: (preventability || undefined) as IncidentPreventability | undefined }),
      outcomeSharing: rows.map((r) => ({
        ...r,
        // A hidden next-of-kin name (row not shared) isn't kept.
        name: r.personKind === 'REPRESENTATIVE' && !r.shared ? '' : r.name.trim(),
        sharedOn: r.shared ? r.sharedOn : null,
        method: r.shared ? r.method : null,
        notSharedReason: r.shared ? null : r.notSharedReason,
        note: r.note?.trim() || null,
      })),
      learningSharedOn: learnedOn || null,
      learningSharedMethod: learnedHow || null,
      learningSharedNote: learnedNote.trim() || null,
      finalManagementComments: comments.trim() || undefined,
    }
    saveOutcome.mutate(input)
  }

  const causes =
    investigation && investigation.contributingFactors.length > 0 ? (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
        <p className="text-xs font-semibold text-foreground">Causes found in the investigation</p>
        <ContributingFactorsReadView
          factors={investigation.contributingFactors}
          details={investigation.contributingFactorDetails}
          labelFor={(code) =>
            INCIDENT_CONTRIBUTING_FACTOR_OPTIONS.find((f) => f.value === code)?.label ?? code
          }
        />
      </div>
    ) : null

  // Read-only view for users who can't edit the outcome.
  if (!canEditOutcome) {
    if (!outcome?.finalOutcome && !isClosed) {
      return (
        <div className="space-y-3 text-sm">
          <IncidentStaffActionsSection incident={incident} canEdit={false} />
          <IncidentExternalBodiesSummary bodies={incident.externalBodies ?? []} />
          <p className="text-muted-foreground">No closure outcome recorded yet.</p>
        </div>
      )
    }
    const savedRows = outcome?.outcomeSharing ?? []
    return (
      <div className="space-y-3 text-sm">
        <IncidentStaffActionsSection incident={incident} canEdit={false} />
        <IncidentExternalBodiesSummary bodies={incident.externalBodies ?? []} />
        {isClosed && (
          <Badge variant="success" size="sm">
            <Lock className="mr-1 h-3 w-3" /> Closed
          </Badge>
        )}
        {outcome?.finalOutcome && <ReadField label="Final outcome" value={outcome.finalOutcome} />}
        {outcome?.lessonsLearned && <ReadField label="Lessons learned" value={outcome.lessonsLearned} />}
        <ReadField
          label="Could this have been prevented?"
          value={
            preventabilityLabel(investigation ? investigation.preventable : outcome?.preventability) ??
            'Not answered'
          }
        />
        <MeasuresSummary incident={incident} />
        {savedRows.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Outcome shared with</p>
            <ul className="mt-1 space-y-0.5">
              {savedRows.map((r) => (
                <li key={r.key}>
                  <span className="text-foreground">{rowTitle(r, incident)}</span>
                  {r.personKind === 'REPRESENTATIVE' && r.name ? ` (${r.name})` : ''}
                  <span className="text-muted-foreground"> — {sharingSummary(r)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* "Learning shared with the team" is hidden for now (commented out on request).
        {outcome?.learningSharedOn && (
          <ReadField
            label="Learning shared with the team"
            value={`${formatOrganisationIsoDateLong(outcome.learningSharedOn)} · ${optionLabel(LEARNING_SHARED_METHOD_OPTIONS, outcome.learningSharedMethod ?? null)}${outcome.learningSharedNote ? ` — ${outcome.learningSharedNote}` : ''}`}
          />
        )}
        */}
        {outcome?.finalManagementComments && (
          <ReadField label="Final management comments" value={outcome.finalManagementComments} />
        )}
        <LegacyOutcomeAnswers outcome={outcome} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isClosed && (
        <div className="flex items-center justify-between rounded-md bg-success/10 px-3 py-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" /> Incident closed
          </span>
        </div>
      )}

      <IncidentStaffActionsSection incident={incident} canEdit={canEditOutcome && !isClosed} />
      <IncidentExternalBodiesSummary bodies={incident.externalBodies ?? []} />

      <FieldLabel label="Final outcome" required>
        <Textarea
          className="mt-1"
          rows={2}
          value={finalOutcome}
          onChange={(e) => setFinalOutcome(e.target.value)}
          placeholder="What was found and what has been done, in a few lines"
        />
      </FieldLabel>

      {causes}

      <FieldLabel label="Lessons learned" required={!!investigation}>
        <Textarea
          className="mt-1"
          rows={2}
          value={lessons}
          onChange={(e) => setLessons(e.target.value)}
          placeholder="What will the team do differently?"
        />
      </FieldLabel>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Could this have been prevented?</p>
        {investigation ? (
          <p className="mt-1 text-sm text-foreground">
            {preventabilityLabel(investigation.preventable) ?? 'Not answered'}
            <span className="text-xs text-muted-foreground"> — from the investigation</span>
          </p>
        ) : (
          <select
            className={`${selectClass} mt-1`}
            value={preventability}
            onChange={(e) => setPreventability(e.target.value)}
            aria-label="Could this have been prevented?"
          >
            <option value="">Not set</option>
            {INCIDENT_PREVENTABILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <MeasuresSummary incident={incident} />

      <div className="space-y-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Outcome shared with<span className="ml-0.5 text-destructive dark:text-red-400">*</span>
          </p>
          <p className="text-xs text-muted-foreground">
            For each person, say when and how they were told the outcome — or why they weren’t.
          </p>
        </div>
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No people are recorded on this incident.</p>
        )}
        {rows.map((r) => {
          const rowError = triedSave ? rowMissing(r, today) : null
          if (r.source === 'CANDOUR') {
            const letter = (incident.candour?.records ?? []).find(
              (p) => p.record?.resultsAttachment?.id === r.attachmentId,
            )?.record?.resultsAttachment
            return (
              <div key={r.key} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                <p className="text-sm font-medium text-foreground">{rowTitle(r, incident)}</p>
                <p className="mt-0.5 text-sm text-foreground">
                  {r.personKind === 'REPRESENTATIVE' && r.name ? `${r.name} — ` : ''}
                  {sharingSummary(r)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  From the Duty of Candour results letter{letter ? ` (${letter.name})` : ''}. Change it in the Duty of
                  Candour tab.
                </p>
              </div>
            )
          }
          return (
            <div
              key={r.key}
              className={`rounded-md border px-3 py-2 ${rowError ? 'border-destructive/50' : 'border-border'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{rowTitle(r, incident)}</p>
                <div className="flex gap-3" role="radiogroup" aria-label={rowTitle(r, incident)}>
                  <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name={`share-${r.key}`}
                      checked={r.shared}
                      onChange={() => patchRow(r.key, { shared: true, notSharedReason: null })}
                    />
                    Shared
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                    <input
                      type="radio"
                      name={`share-${r.key}`}
                      checked={!r.shared && !!r.notSharedReason}
                      onChange={() =>
                        patchRow(r.key, { shared: false, notSharedReason: r.notSharedReason ?? 'NOT_NEEDED' })
                      }
                    />
                    Not shared
                  </label>
                </div>
              </div>
              {/* The next of kin's name is only needed when the outcome was shared with them. */}
              {r.personKind === 'REPRESENTATIVE' && r.shared && (
                <Input
                  className="mt-2"
                  placeholder="Name and relationship (e.g. Sarah Smith, daughter)"
                  value={r.name}
                  onChange={(e) => patchRow(r.key, { name: e.target.value })}
                  aria-label="Next of kin / representative name"
                />
              )}
              {r.shared && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <input
                    type="date"
                    className={selectClass}
                    max={today}
                    value={r.sharedOn ?? ''}
                    onChange={(e) => patchRow(r.key, { sharedOn: e.target.value || null })}
                    aria-label="Date shared"
                  />
                  <select
                    className={selectClass}
                    value={r.method ?? ''}
                    onChange={(e) => patchRow(r.key, { method: e.target.value || null })}
                    aria-label="How it was shared"
                  >
                    <option value="">How?</option>
                    {OUTCOME_SHARING_METHOD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {!r.shared && r.notSharedReason && (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <select
                    className={selectClass}
                    value={r.notSharedReason}
                    onChange={(e) => patchRow(r.key, { notSharedReason: e.target.value })}
                    aria-label="Why not shared"
                  >
                    {OUTCOME_NOT_SHARED_REASON_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder={r.notSharedReason === 'NOT_APPROPRIATE' ? 'Why? (required)' : 'Note (optional)'}
                    value={r.note ?? ''}
                    onChange={(e) => patchRow(r.key, { note: e.target.value })}
                    aria-label="Note"
                  />
                </div>
              )}
              {rowError && (
                <p className="mt-1 text-xs text-destructive dark:text-red-400">Needed: {rowError}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* "Learning shared with the team" is hidden for now (commented out on request). Saved values are
          still sent back unchanged, so nothing already recorded is lost.
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Learning shared with the team</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="date"
            className={selectClass}
            max={today}
            value={learnedOn}
            onChange={(e) => setLearnedOn(e.target.value)}
            aria-label="Date learning shared"
          />
          <select
            className={selectClass}
            value={learnedHow}
            onChange={(e) => setLearnedHow(e.target.value)}
            aria-label="How learning was shared"
          >
            <option value="">How?</option>
            {LEARNING_SHARED_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          placeholder="Note (optional) — e.g. covered at the 14 Oct team meeting"
          value={learnedNote}
          onChange={(e) => setLearnedNote(e.target.value)}
          aria-label="Learning shared note"
        />
        <p className="text-xs text-muted-foreground">Leave empty if it hasn’t been shared yet.</p>
      </div>
      */}

      <FieldLabel label="Final management comments">
        <Textarea className="mt-1" rows={2} value={comments} onChange={(e) => setComments(e.target.value)} />
      </FieldLabel>

      <LegacyOutcomeAnswers outcome={outcome} />

      {triedSave && missing.length > 0 && (
        <p role="alert" className="text-sm text-destructive dark:text-red-400">
          Still needed: {missing.join(', ')}.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="outline" loading={saveOutcome.isPending} onClick={save}>
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
        {required && <span className="ml-0.5 text-destructive dark:text-red-400">*</span>}
      </label>
      {children}
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
