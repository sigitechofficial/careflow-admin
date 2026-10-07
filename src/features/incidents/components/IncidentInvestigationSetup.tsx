import * as React from 'react'
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import {
  formatOrganisationDateTime,
  formatOrganisationIsoDate,
  formatOrganisationIsoDateLong,
} from '@/shared/lib/organisation-display-format.store'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import {
  usePauseIncidentInvestigation,
  useResumeIncidentInvestigation,
} from '@/features/incidents/hooks/useIncidents'
import {
  INVESTIGATION_LEVEL_OPTIONS,
  INVESTIGATION_STATUS_LABELS,
  INVESTIGATOR_INVOLVEMENT_OPTIONS,
  type IncidentInvestigation,
  type IncidentInvestigatorOption,
  type InvestigationLevel,
  type InvestigatorInvolvement,
} from '@/features/incidents/types'

const inputClass =
  'mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'

export type InvestigationSetupValues = {
  investigationLevel: InvestigationLevel | ''
  leadInvestigatorEmployeeId: string
  investigatorInvolved: InvestigatorInvolvement | ''
  investigatorInvolvedReason: string
  targetDate: string
  termsOfReference: string
}

export function initialSetupValues(investigation: IncidentInvestigation | null): InvestigationSetupValues {
  return {
    investigationLevel: investigation?.investigationLevel ?? '',
    leadInvestigatorEmployeeId: investigation?.leadInvestigatorEmployeeId ?? '',
    investigatorInvolved: investigation?.investigatorInvolved ?? '',
    investigatorInvolvedReason: investigation?.investigatorInvolvedReason ?? '',
    targetDate: investigation?.targetDate ?? '',
    termsOfReference: investigation?.termsOfReference ?? '',
  }
}

/** Set-up answers still missing before the investigation can be completed (key → message). */
export function setupCompletionErrors(v: InvestigationSetupValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!v.investigationLevel) errors.investigationLevel = 'Needed to complete'
  if (!v.leadInvestigatorEmployeeId) errors.leadInvestigatorEmployeeId = 'Needed to complete'
  if (!v.investigatorInvolved) errors.investigatorInvolved = 'Needed to complete'
  if (v.investigatorInvolved === 'YES' && !v.investigatorInvolvedReason.trim()) {
    errors.investigatorInvolvedReason = 'Needed to complete'
  }
  if (!v.targetDate) errors.targetDate = 'Needed to complete'
  if (!v.termsOfReference.trim()) errors.termsOfReference = 'Needed to complete'
  return errors
}

const levelLabel = (v: string | null | undefined) =>
  INVESTIGATION_LEVEL_OPTIONS.find((o) => o.value === v)?.label ?? null

const involvementLabel = (v: string | null | undefined) =>
  INVESTIGATOR_INVOLVEMENT_OPTIONS.find((o) => o.value === v)?.label ?? null

function Req() {
  return <span className="ml-0.5 text-destructive dark:text-red-400" aria-hidden>*</span>
}

function FieldError({ message }: { message?: string }) {
  return message ? <p data-field-error className="mt-1 text-xs text-destructive dark:text-red-400">{message}</p> : null
}

function StatusBadge({ investigation }: { investigation: IncidentInvestigation }) {
  const status = investigation.investigationStatus ?? 'IN_PROGRESS'
  return (
    <Badge
      size="sm"
      variant={status === 'COMPLETED' ? 'success' : status === 'PAUSED' ? 'warning' : 'info'}
    >
      {INVESTIGATION_STATUS_LABELS[status]}
    </Badge>
  )
}

function OverdueBadge() {
  return (
    <Badge size="sm" variant="destructive">
      Overdue
    </Badge>
  )
}

/** "Lead investigator · Level · Due <date> · <status>" from the saved investigation. */
export function InvestigationSummaryLine({ investigation }: { investigation: IncidentInvestigation }) {
  const parts = [
    investigation.leadInvestigatorName ?? 'No lead investigator',
    levelLabel(investigation.investigationLevel) ?? 'Level not set',
    investigation.targetDate
      ? `Due ${formatOrganisationIsoDate(investigation.targetDate)}`
      : 'No target date',
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
      <span className="font-medium text-foreground">{parts.join(' · ')}</span>
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <StatusBadge investigation={investigation} />
      {investigation.overdue && <OverdueBadge />}
    </div>
  )
}

/** Past and current pauses (kept after resuming). */
function PauseHistory({ investigation }: { investigation: IncidentInvestigation }) {
  const [open, setOpen] = React.useState(false)
  const pauses = investigation.pauses ?? []
  if (!pauses.length) return null
  return (
    <div className="mt-2">
      <button
        type="button"
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        Pause history ({pauses.length})
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1.5">
          {[...pauses].reverse().map((p) => (
            <li key={p.id} className="rounded-md border border-border px-2.5 py-1.5 text-xs">
              <p className="text-foreground">
                Paused {formatOrganisationDateTime(p.pausedAt)}
                {p.pausedByName ? ` by ${p.pausedByName}` : ''}
                {p.nextReviewDate ? ` · review ${formatOrganisationIsoDateLong(p.nextReviewDate)}` : ''}
              </p>
              <p className="whitespace-pre-wrap text-muted-foreground">{p.reason}</p>
              <p className="text-muted-foreground">
                {p.resumedAt
                  ? `Resumed ${formatOrganisationDateTime(p.resumedAt)}${p.resumedByName ? ` by ${p.resumedByName}` : ''}`
                  : 'Still paused'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Status: In progress / Paused (Completed only comes from completing the investigation). */
function InvestigationStatusControl({
  incidentId,
  investigation,
  canEdit,
}: {
  incidentId: string
  investigation: IncidentInvestigation | null
  canEdit: boolean
}) {
  const pause = usePauseIncidentInvestigation(incidentId)
  const resume = useResumeIncidentInvestigation(incidentId)
  const [pausing, setPausing] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const [nextReviewDate, setNextReviewDate] = React.useState('')
  const today = operationalTodayIso()
  const status = investigation?.investigationStatus ?? 'IN_PROGRESS'

  if (!investigation) {
    return (
      <p className="mt-1 text-sm text-muted-foreground">
        In progress once the investigation is first saved.
      </p>
    )
  }

  const current = investigation.currentPause
  const pauseInfo =
    status === 'PAUSED' && current ? (
      <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
        <p className="text-foreground">
          Paused {formatOrganisationDateTime(current.pausedAt)}
          {current.nextReviewDate
            ? ` · next review ${formatOrganisationIsoDateLong(current.nextReviewDate)}`
            : ''}
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{current.reason}</p>
      </div>
    ) : null

  if (!canEdit || status === 'COMPLETED') {
    return (
      <div className="mt-1">
        <StatusBadge investigation={investigation} />
        {pauseInfo}
        <PauseHistory investigation={investigation} />
      </div>
    )
  }

  function onStatusChange(next: string) {
    if (next === 'PAUSED' && status === 'IN_PROGRESS') {
      setPausing(true)
    } else if (next === 'IN_PROGRESS' && status === 'PAUSED') {
      resume.mutate()
    } else {
      setPausing(false)
    }
  }

  const canConfirmPause = reason.trim().length > 0 && !!nextReviewDate && nextReviewDate >= today

  return (
    <div className="mt-1">
      <select
        className={inputClass}
        value={pausing ? 'PAUSED' : status}
        onChange={(e) => onStatusChange(e.target.value)}
        disabled={pause.isPending || resume.isPending}
        aria-label="Investigation status"
      >
        <option value="IN_PROGRESS">{INVESTIGATION_STATUS_LABELS.IN_PROGRESS}</option>
        <option value="PAUSED">{INVESTIGATION_STATUS_LABELS.PAUSED}</option>
      </select>
      <p className="mt-1 text-xs text-muted-foreground">
        Completed is set by “Save &amp; complete”.
      </p>
      {pausing && status === 'IN_PROGRESS' && (
        <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/20 p-3">
          <div>
            <label className="text-xs font-medium text-foreground" htmlFor="pause-reason">
              Reason for pausing
              <Req />
            </label>
            <Textarea
              id="pause-reason"
              className="mt-1"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground" htmlFor="pause-review">
              Next review date
              <Req />
            </label>
            <input
              id="pause-review"
              type="date"
              className={inputClass}
              min={today}
              value={nextReviewDate}
              onChange={(e) => setNextReviewDate(e.target.value)}
            />
            {nextReviewDate && nextReviewDate < today && (
              <FieldError message="Must be today or later" />
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPausing(false)
                setReason('')
                setNextReviewDate('')
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={pause.isPending}
              disabled={!canConfirmPause}
              onClick={() =>
                pause.mutate(
                  { reason: reason.trim(), nextReviewDate },
                  {
                    onSuccess: () => {
                      setPausing(false)
                      setReason('')
                      setNextReviewDate('')
                    },
                  },
                )
              }
            >
              Pause investigation
            </Button>
          </div>
        </div>
      )}
      {pauseInfo}
      {status === 'PAUSED' && (
        <Button
          className="mt-2"
          size="sm"
          variant="outline"
          loading={resume.isPending}
          onClick={() => resume.mutate()}
        >
          Resume investigation
        </Button>
      )}
      <PauseHistory investigation={investigation} />
    </div>
  )
}

/** Editable set-up (level, lead, involvement, dates, terms of reference, status). */
export function InvestigationSetupForm({
  incidentId,
  investigation,
  values,
  onChange,
  errors,
  investigators,
  investigatorsLoading,
  suggestedLeadId,
  suggestHigherLevel,
}: {
  incidentId: string
  investigation: IncidentInvestigation | null
  values: InvestigationSetupValues
  onChange: (patch: Partial<InvestigationSetupValues>) => void
  errors: Record<string, string>
  investigators: IncidentInvestigatorOption[]
  investigatorsLoading: boolean
  /** Shown as a visible suggestion when no lead is saved yet. */
  suggestedLeadId: string | null
  /** High / Critical severity or a death. */
  suggestHigherLevel: boolean
}) {
  const today = operationalTodayIso()
  const startedOn = investigation?.startedOn ?? null
  const completed = investigation?.investigationStatus === 'COMPLETED'
  // A saved lead who is no longer eligible still shows (by name) until changed.
  const leadOptions = React.useMemo(() => {
    const rows = [...investigators]
    if (
      investigation?.leadInvestigatorEmployeeId &&
      !rows.some((r) => r.id === investigation.leadInvestigatorEmployeeId)
    ) {
      rows.unshift({
        id: investigation.leadInvestigatorEmployeeId,
        name: `${investigation.leadInvestigatorName ?? 'Unknown staff member'} (no longer eligible)`,
        designation: null,
        isCurrentUser: false,
      })
    }
    return rows
  }, [investigators, investigation?.leadInvestigatorEmployeeId, investigation?.leadInvestigatorName])

  return (
    <div className="space-y-4 rounded-lg border border-border p-3 sm:p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Investigation set-up
      </h4>

      <div role="radiogroup" aria-labelledby="inv-level-label">
        <p id="inv-level-label" className="text-xs uppercase tracking-wide text-muted-foreground">
          Investigation level
          <Req />
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          How in-depth the investigation needs to be, in proportion to the harm and risk.
        </p>
        <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          {INVESTIGATION_LEVEL_OPTIONS.map((o) => (
            <label
              key={o.value}
              className={cn(
                'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm',
                values.investigationLevel === o.value ? 'border-primary bg-primary/5' : 'border-border',
              )}
            >
              <input
                type="radio"
                name="investigation-level"
                className="mt-0.5"
                checked={values.investigationLevel === o.value}
                onChange={() => onChange({ investigationLevel: o.value })}
              />
              <span>
                <span className="font-medium text-foreground">{o.label}</span>
                <span className="block text-xs text-muted-foreground">{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {suggestHigherLevel && values.investigationLevel !== 'ENHANCED' && values.investigationLevel !== 'COMPREHENSIVE' && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Consider Enhanced or Comprehensive Investigation
          </p>
        )}
        <FieldError message={errors.investigationLevel} />
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="inv-lead">
          Lead investigator
          <Req />
        </label>
        <select
          id="inv-lead"
          className={inputClass}
          value={values.leadInvestigatorEmployeeId}
          onChange={(e) => onChange({ leadInvestigatorEmployeeId: e.target.value })}
          aria-invalid={errors.leadInvestigatorEmployeeId ? true : undefined}
        >
          <option value="">{investigatorsLoading ? 'Loading…' : 'Select lead investigator'}</option>
          {leadOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} — {u.designation ?? 'No designation'}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted-foreground">
          {suggestedLeadId && values.leadInvestigatorEmployeeId === suggestedLeadId && !investigation?.leadInvestigatorEmployeeId
            ? 'Suggested: you. Change it if someone else will lead. '
            : ''}
          Active carers and managers. This is separate from the incident owner.
        </p>
        <FieldError message={errors.leadInvestigatorEmployeeId} />
      </div>

      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm text-foreground" id="inv-involved-label">
            Was the lead investigator directly involved in the incident?
            <Req />
          </span>
          <div role="radiogroup" aria-labelledby="inv-involved-label" className="flex shrink-0 gap-3">
            {INVESTIGATOR_INVOLVEMENT_OPTIONS.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground">
                <input
                  type="radio"
                  name="investigator-involved"
                  checked={values.investigatorInvolved === o.value}
                  onChange={() => onChange({ investigatorInvolved: o.value })}
                />
                {o.label}
              </label>
            ))}
          </div>
        </div>
        <FieldError message={errors.investigatorInvolved} />
        {values.investigatorInvolved === 'YES' && (
          <div className="mt-2">
            <label className="text-xs font-medium text-foreground" htmlFor="inv-involved-reason">
              Reason this investigator is still appropriate
              <Req />
            </label>
            <Textarea
              id="inv-involved-reason"
              className="mt-1"
              rows={2}
              value={values.investigatorInvolvedReason}
              onChange={(e) => onChange({ investigatorInvolvedReason: e.target.value })}
              aria-invalid={errors.investigatorInvolvedReason ? true : undefined}
            />
            <FieldError message={errors.investigatorInvolvedReason} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Investigation started</p>
          <p className="mt-1 flex h-9 items-center text-sm text-foreground">
            {startedOn ? formatOrganisationIsoDateLong(startedOn) : 'When first saved'}
          </p>
        </div>
        <div>
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground" htmlFor="inv-target">
            <span>
              Target completion date
              <Req />
            </span>
            {investigation?.overdue && <OverdueBadge />}
          </label>
          <input
            id="inv-target"
            type="date"
            className={inputClass}
            min={startedOn ?? today}
            value={values.targetDate}
            disabled={completed}
            onChange={(e) => onChange({ targetDate: e.target.value })}
            aria-invalid={errors.targetDate ? true : undefined}
          />
          {values.targetDate && values.targetDate < (startedOn ?? today) && (
            <FieldError message="Can’t be before the investigation started" />
          )}
          <FieldError message={errors.targetDate} />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="inv-tor">
          Terms of reference / investigation scope
          <Req />
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          What questions does this investigation need to answer? For example: Was the care plan
          followed? Were staff trained and competent for this task? Could the risk have been
          identified earlier?
        </p>
        <Textarea
          id="inv-tor"
          className="mt-1"
          rows={3}
          value={values.termsOfReference}
          onChange={(e) => onChange({ termsOfReference: e.target.value })}
          aria-invalid={errors.termsOfReference ? true : undefined}
        />
        <FieldError message={errors.termsOfReference} />
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Investigation status</p>
        <InvestigationStatusControl incidentId={incidentId} investigation={investigation} canEdit />
      </div>
    </div>
  )
}

/** Read-only set-up. */
export function InvestigationSetupReadView({
  incidentId,
  investigation,
}: {
  incidentId: string
  investigation: IncidentInvestigation
}) {
  const rows: [string, React.ReactNode][] = [
    ['Investigation level', levelLabel(investigation.investigationLevel) ?? 'Not set'],
    ['Lead investigator', investigation.leadInvestigatorName ?? 'Not set'],
    [
      'Lead investigator directly involved',
      involvementLabel(investigation.investigatorInvolved) ?? 'Not answered',
    ],
    [
      'Investigation started',
      investigation.startedOn ? formatOrganisationIsoDateLong(investigation.startedOn) : '—',
    ],
    [
      'Target completion date',
      investigation.targetDate ? (
        <span className="inline-flex items-center gap-1.5">
          {formatOrganisationIsoDateLong(investigation.targetDate)}
          {investigation.overdue && <OverdueBadge />}
        </span>
      ) : (
        'Not set'
      ),
    ],
  ]
  return (
    <div className="space-y-2">
      <dl className="space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {investigation.investigatorInvolved === 'YES' && investigation.investigatorInvolvedReason && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Why this investigator is still appropriate
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-foreground">
            {investigation.investigatorInvolvedReason}
          </p>
        </div>
      )}
      {investigation.termsOfReference && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Terms of reference</p>
          <p className="mt-0.5 whitespace-pre-wrap text-foreground">{investigation.termsOfReference}</p>
        </div>
      )}
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Investigation status</p>
        <InvestigationStatusControl incidentId={incidentId} investigation={investigation} canEdit={false} />
      </div>
    </div>
  )
}
