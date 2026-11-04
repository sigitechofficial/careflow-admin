import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label, Textarea } from '@/shared/ui/form-field'
import { InlineConfirm } from '@/shared/ui/inline-confirm'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { InitialAssessmentYesNoCardField } from '@/features/service-users/initial-assessment/components/InitialAssessmentYesNoCardField'
import {
  IA_CALLOUT_AMBER_CLASS,
  IA_CALLOUT_NEUTRAL_CLASS,
  IA_CALLOUT_TEAL_CLASS,
  IA_HINT_CLASS,
  IA_QUESTION_LABEL_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import {
  authorityCoverage,
  type LegalAuthorityCoverage,
  type LegalAuthorityRow,
} from '@/features/service-users/initial-assessment/utils/legal-authority-coverage'
import {
  CAPACITY_DECISION_OPTIONS,
  capacityDecisionGaps,
  completedDecisionFor,
  decisionTitle,
  indicatedOutcome,
  newCapacityDecision,
  type CapacityDecisionNeed,
  type CapacityDecisionRecord,
  type CapacityDecisionType,
  type YesNo,
} from '@/features/service-users/initial-assessment/utils/capacity-decisions'

type Props = {
  records: CapacityDecisionRecord[]
  needs: CapacityDecisionNeed[]
  disabled?: boolean
  /** Pre-fills "assessor" on new records. */
  assessorName?: string
  /** Legal authority register — shows whether a checked authority covers each decision. */
  legalAuthorities?: LegalAuthorityRow[]
  onChange: (next: CapacityDecisionRecord[]) => void
}

const OUTCOME_LABEL = {
  has_capacity: 'I have capacity to make this decision',
  lacks_capacity: 'I lack capacity to make this decision (at this time)',
} as const

const FUNCTIONAL: Array<{ key: 'understand' | 'retain' | 'weigh' | 'communicate'; label: string }> = [
  { key: 'understand', label: 'Can I understand the information relevant to the decision?' },
  { key: 'retain', label: 'Can I retain that information long enough to make the decision?' },
  { key: 'weigh', label: 'Can I use or weigh that information as part of making the decision?' },
  { key: 'communicate', label: 'Can I communicate my decision (by talking or any other means)?' },
]

const toBool = (v?: YesNo) => (v === 'yes' ? true : v === 'no' ? false : null)
const toYesNo = (v: boolean): YesNo => (v ? 'yes' : 'no')

/**
 * Decision-specific capacity assessments (MCA 2005). One card per decision; capacity is presumed and
 * the person's wishes and any objection are recorded whatever the outcome.
 */
export function InitialAssessmentCapacityDecisionsPanel({
  records,
  needs,
  disabled,
  assessorName,
  legalAuthorities = [],
  onChange,
}: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const add = (decision?: CapacityDecisionType) =>
    onChange([...records, { ...newCapacityDecision(decision), assessorName, assessedOn: today }])
  const update = (id: string, patch: Partial<CapacityDecisionRecord>) =>
    onChange(records.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const remove = (id: string) => onChange(records.filter((r) => r.id !== id))

  const openNeeds = needs.filter(
    (n) => !completedDecisionFor(records, n.decision) && !records.some((r) => r.decision === n.decision),
  )

  return (
    <div className="space-y-4" data-testid="ia-capacity-decisions">
      <div className={cn(IA_CALLOUT_NEUTRAL_CLASS, 'text-sm')}>
        <p className="font-semibold">Decision-specific capacity assessments</p>
        <p className={IA_HINT_CLASS}>
          Capacity is presumed. Assess one decision at a time, at the time it needs making — never a general
          &ldquo;has / lacks capacity&rdquo;. An unwise decision is not a lack of capacity. Record the
          person&apos;s wishes and any objection whatever the outcome.
        </p>
      </div>

      {openNeeds.length ? (
        <div className={cn(IA_CALLOUT_AMBER_CLASS, 'space-y-2 text-sm')} data-testid="ia-capacity-needs">
          <p className="font-semibold">From the screening</p>
          {openNeeds.map((n) => (
            <div key={n.decision} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{n.required ? 'Required' : 'Suggested'}:</strong>{' '}
                {CAPACITY_DECISION_OPTIONS.find((o) => o.value === n.decision)?.label} — {n.reason}
              </span>
              {!disabled ? (
                <Button type="button" size="sm" variant="outline" onClick={() => add(n.decision)}>
                  Assess this decision
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {records.map((r) => (
        <DecisionCard
          key={r.id}
          record={r}
          coverage={authorityCoverage(legalAuthorities, r.decision, today)}
          disabled={disabled}
          onPatch={(patch) => update(r.id, patch)}
          onRemove={() => remove(r.id)}
        />
      ))}

      {!disabled ? (
        <Button type="button" variant="outline" onClick={() => add()} data-testid="ia-capacity-add">
          {records.length ? 'Add another decision' : 'Add a capacity assessment'}
        </Button>
      ) : null}
    </div>
  )
}

function DecisionCard({
  record: r,
  coverage,
  disabled,
  onPatch,
  onRemove,
}: {
  record: CapacityDecisionRecord
  coverage: LegalAuthorityCoverage
  disabled?: boolean
  onPatch: (patch: Partial<CapacityDecisionRecord>) => void
  onRemove: () => void
}) {
  const gaps = capacityDecisionGaps(r)
  const indicated = indicatedOutcome(r)
  const anyUnable = FUNCTIONAL.some((f) => r[f.key] === 'no')
  const lacks = r.outcome === 'lacks_capacity'

  const text = (key: keyof CapacityDecisionRecord, label: string, hint?: string, rows = 2) => (
    <div className="space-y-1">
      <Label className={IA_QUESTION_LABEL_CLASS}>{label}</Label>
      {hint ? <p className={IA_HINT_CLASS}>{hint}</p> : null}
      <Textarea
        rows={rows}
        className="min-h-[56px]"
        value={(r[key] as string | undefined) ?? ''}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onPatch({ [key]: e.target.value } as Partial<CapacityDecisionRecord>)}
      />
    </div>
  )
  const yesNo = (key: keyof CapacityDecisionRecord, label: string) => (
    <InitialAssessmentYesNoCardField
      name={`${r.id}-${String(key)}`}
      label={label}
      value={toBool(r[key] as YesNo | undefined)}
      disabled={disabled}
      onChange={(v) => onPatch({ [key]: toYesNo(v) } as Partial<CapacityDecisionRecord>)}
    />
  )

  return (
    <InitialAssessmentSection12PanelShell
      title={decisionTitle(r)}
      hint={r.outcome ? OUTCOME_LABEL[r.outcome] : 'Not yet decided'}
      testId="ia-capacity-decision"
      bodyVariant="content"
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <Label className={IA_QUESTION_LABEL_CLASS}>Decision being assessed</Label>
          <Select
            value={r.decision ?? ''}
            disabled={disabled}
            onValueChange={(v) => onPatch({ decision: v as CapacityDecisionType })}
          >
            <SelectTrigger aria-label="Decision being assessed">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {CAPACITY_DECISION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {r.decision === 'other' ? (
            <Input
              value={r.decisionOther ?? ''}
              disabled={disabled}
              aria-label="Describe the decision"
              placeholder="Describe the decision"
              onChange={(e) => onPatch({ decisionOther: e.target.value })}
            />
          ) : null}
        </div>

        {text(
          'relevantInformation',
          'The information I was given',
          'The options, and what could happen if I decide one way, the other, or not at all.',
        )}
        {text(
          'practicableSteps',
          'Steps taken to help me decide',
          'e.g. the best time of day for me, my hearing aids / glasses, simple words or pictures, someone I trust present.',
        )}

        <div className="space-y-3">
          <p className="text-sm font-semibold">Can I make this decision?</p>
          {FUNCTIONAL.map((f) => (
            <div key={f.key} className="space-y-1">
              {yesNo(f.key, f.label)}
              {r[f.key] === 'no' ? text(`${f.key}Evidence` as keyof CapacityDecisionRecord, 'What shows this?') : null}
            </div>
          ))}
        </div>

        {anyUnable ? (
          <div className="space-y-3">
            {yesNo('impairment', 'Is there an impairment of, or disturbance in, the functioning of my mind or brain?')}
            {r.impairment === 'yes' ? text('impairmentDetails', 'My impairment (e.g. diagnosis, delirium, intoxication)') : null}
            {r.impairment === 'yes'
              ? yesNo('causativeNexus', 'Am I unable to decide because of that impairment?')
              : null}
          </div>
        ) : null}

        <div className="space-y-1">
          <Label className={IA_QUESTION_LABEL_CLASS}>Outcome for this decision</Label>
          {indicated ? <p className={IA_HINT_CLASS}>The answers indicate: {OUTCOME_LABEL[indicated]}.</p> : null}
          <Select
            value={r.outcome ?? ''}
            disabled={disabled}
            onValueChange={(v) => onPatch({ outcome: v as CapacityDecisionRecord['outcome'] })}
          >
            <SelectTrigger aria-label="Outcome for this decision">
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="has_capacity">{OUTCOME_LABEL.has_capacity}</SelectItem>
              <SelectItem value="lacks_capacity">{OUTCOME_LABEL.lacks_capacity}</SelectItem>
            </SelectContent>
          </Select>
          {r.outcome && indicated && r.outcome !== indicated
            ? text('outcomeReason', 'Why the outcome differs from the answers')
            : null}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">My views (always recorded)</p>
          {text('wishes', 'My wishes about this decision')}
          {text('feelings', 'My feelings')}
          {text('beliefsValues', 'My beliefs and values')}
          {text('previousWishes', 'My past wishes (e.g. said before, written down, advance decision)')}
          {yesNo('objection', 'Do I object (in words or behaviour)?')}
          {r.objection === 'yes' ? text('objectionDetails', 'How do I object?') : null}
        </div>

        {lacks ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Who decides</p>
            <p
              className={cn(coverage.status === 'covered' ? IA_CALLOUT_TEAL_CLASS : IA_CALLOUT_NEUTRAL_CLASS, 'text-sm')}
              data-testid="ia-capacity-authority-coverage"
            >
              <strong>Legal authority register:</strong> {coverage.note}
            </p>
            {yesNo('authorityCovers', 'Does a verified legal authority cover this specific decision?')}
            {r.authorityCovers === 'yes' && coverage.status !== 'covered' ? (
              <p className={cn(IA_CALLOUT_AMBER_CLASS, 'text-sm')} data-testid="ia-capacity-authority-mismatch">
                The register has no checked authority for this decision. Add or verify it on the service user&apos;s
                Documents tab, or record a best-interests decision.
              </p>
            ) : null}
            <p className={IA_HINT_CLASS}>
              Only a registered Health &amp; Welfare LPA or a deputy / court order that covers this decision. A
              Property &amp; Finance LPA, appointee or next of kin never decides care.
            </p>
            {r.authorityCovers === 'yes' ? text('authorityDetails', 'Which authority, and how it was checked') : null}
            {r.authorityCovers === 'no' ? (
              <>
                {text('bestInterestsDecisionMaker', 'Best-interests decision maker')}
                {text('bestInterestsConsulted', 'Who was consulted (family, carers, professionals)')}
                {text('lessRestrictiveOptions', 'Less restrictive options considered')}
                {text('bestInterestsOutcome', 'Best-interests decision')}
                {yesNo('imcaRequired', 'Is an IMCA needed (no one appropriate to consult)?')}
              </>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className={IA_QUESTION_LABEL_CLASS}>Assessor</Label>
            <Input
              value={r.assessorName ?? ''}
              disabled={disabled}
              aria-label="Assessor"
              onChange={(e) => onPatch({ assessorName: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className={IA_QUESTION_LABEL_CLASS}>Date assessed</Label>
            <Input
              type="date"
              value={r.assessedOn ?? ''}
              disabled={disabled}
              aria-label="Date assessed"
              onChange={(e) => onPatch({ assessedOn: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className={IA_QUESTION_LABEL_CLASS}>Review by</Label>
            <Input
              type="date"
              value={r.reviewDate ?? ''}
              disabled={disabled}
              aria-label="Review by"
              onChange={(e) => onPatch({ reviewDate: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-2">
          {gaps.length ? (
            <p className={cn(IA_CALLOUT_AMBER_CLASS, 'text-sm')} data-testid="ia-capacity-gaps">
              Still needed: {gaps.join(', ')}
            </p>
          ) : (
            <p className={cn(IA_CALLOUT_TEAL_CLASS, 'text-sm')} data-testid="ia-capacity-complete">
              Complete
            </p>
          )}
          {!disabled ? (
            <InlineConfirm
              title="Remove this capacity assessment?"
              description="It is removed from this assessment when you save."
              destructive
              onConfirm={onRemove}
            >
              <Button type="button" size="sm" variant="ghost">
                Remove
              </Button>
            </InlineConfirm>
          ) : null}
        </div>
      </div>
    </InitialAssessmentSection12PanelShell>
  )
}
