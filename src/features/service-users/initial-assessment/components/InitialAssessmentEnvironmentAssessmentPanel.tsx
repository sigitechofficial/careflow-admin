import { Fragment } from 'react'
import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { cn } from '@/shared/lib/utils'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  computeLoneWorkerAxes,
  suggestLoneWorkerControlMeasures,
  ENVIRONMENT_ASSESSMENT_GOALS_PROMPTS,
  ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS,
  ENVIRONMENT_ASSESSMENT_LONE_WORKER_LEVELS,
  ENVIRONMENT_ASSESSMENT_STAFF_CHECKLIST,
  ENVIRONMENT_ASSESSMENT_TABLE_QUESTIONS,
  type EnvironmentAssessmentLoneWorkerFactorId,
  type EnvironmentAssessmentMetadata,
  type EnvironmentAssessmentQuestionId,
  type LoneWorkerRiskLevel,
} from '@/features/service-users/initial-assessment/utils/environment-assessment'
import {
  IA_CHECKBOX_CLASS,
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_RADIO_CLASS,
  IA_SECTION_BODY_CLASS,
  IA_SUBSECTION_PANEL_HEADER_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  value: EnvironmentAssessmentMetadata
  disabled?: boolean
  onChange: (next: EnvironmentAssessmentMetadata) => void
}

function YesNoColumnCell({
  name,
  selected,
  column,
  disabled,
  ariaLabel,
  onSelect,
}: {
  name: string
  selected: boolean | null | undefined
  column: 'yes' | 'no'
  disabled?: boolean
  ariaLabel: string
  onSelect: (value: boolean) => void
}) {
  const checked = column === 'yes' ? selected === true : selected === false

  return (
    <HolisticAssessmentTableCell className="w-16 text-center align-middle">
      <label
        className={cn(
          'inline-flex cursor-pointer items-center justify-center',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <input
          type="radio"
          name={name}
          className={IA_RADIO_CLASS}
          checked={checked}
          disabled={disabled}
          aria-label={`${ariaLabel} — ${column === 'yes' ? 'Yes' : 'No'}`}
          onChange={() => onSelect(column === 'yes')}
        />
      </label>
    </HolisticAssessmentTableCell>
  )
}

export function InitialAssessmentEnvironmentAssessmentPanel({ value, disabled, onChange }: Props) {
  const patch = (partial: Partial<EnvironmentAssessmentMetadata>) => onChange({ ...value, ...partial })

  const patchQuestion = (id: EnvironmentAssessmentQuestionId, answer: boolean) => {
    patch({ [id]: answer })
  }

  const patchLoneWorkerFactor = (id: EnvironmentAssessmentLoneWorkerFactorId, answer: boolean) => {
    patch({ [id]: answer })
  }

  const computedAxes = computeLoneWorkerAxes(value)
  const computedLevel = computedAxes?.level ?? null
  const levelWord = (l: 'Low' | 'Med' | 'High') => (l === 'Med' ? 'Medium' : l)
  const computedLevelLabel = computedLevel ? levelWord(computedLevel) : 'No risk yet'
  const computedLevelTone =
    computedLevel === 'High'
      ? 'bg-destructive/15 text-destructive'
      : computedLevel === 'Med'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
        : computedLevel === 'Low'
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
          : 'bg-muted text-muted-foreground'

  // Rule-based suggested control measures (suggestion only — inserted on click, then editable).
  const suggestedMeasures = suggestLoneWorkerControlMeasures(value)
  const insertSuggestedMeasures = () => {
    const current = value.staffSafetyInstructions ?? ''
    const currentText = current.replace(/<[^>]+>/g, ' ').toLowerCase()
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const toAdd = suggestedMeasures.filter(
      (m) => !currentText.includes(m.slice(0, 24).toLowerCase()),
    )
    if (toAdd.length === 0) return
    const html = toAdd.map((m) => `<p>${esc(m)}</p>`).join('')
    patch({ staffSafetyInstructions: current ? `${current}${html}` : html })
  }

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-environment-assessment-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="Environment Assessment" />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:bg-card dark:border-slate-700">
          <HolisticAssessmentTable
            columns={[
              {
                key: 'question',
                header: 'Environment assessment',
                className: 'w-[72%]',
              },
              { key: 'yes', header: 'Yes', className: 'w-[14%] text-center' },
              { key: 'no', header: 'No', className: 'w-[14%] text-center' },
            ]}
          >
            {ENVIRONMENT_ASSESSMENT_TABLE_QUESTIONS.map((q) => {
              const answer = value[q.id]
              const name = `environment-assessment-${q.id}`
              const ariaLabel = q.staffOnly ? `Staff only — ${q.label}` : q.label

              return (
                <HolisticAssessmentTableRow key={q.id}>
                  <HolisticAssessmentTableCell className="align-top text-sm">
                    {q.staffOnly ? (
                      <>
                        <span className="font-semibold">Staff Only</span>
                        {' — '}
                        {q.label}
                      </>
                    ) : (
                      q.label
                    )}
                  </HolisticAssessmentTableCell>
                  <YesNoColumnCell
                    name={name}
                    selected={answer}
                    column="yes"
                    disabled={disabled}
                    ariaLabel={ariaLabel}
                    onSelect={(v) => patchQuestion(q.id, v)}
                  />
                  <YesNoColumnCell
                    name={name}
                    selected={answer}
                    column="no"
                    disabled={disabled}
                    ariaLabel={ariaLabel}
                    onSelect={(v) => patchQuestion(q.id, v)}
                  />
                </HolisticAssessmentTableRow>
              )
            })}
          </HolisticAssessmentTable>

          <section
            className="overflow-hidden rounded-sm border border-slate-300 dark:border-slate-600"
            data-testid="ia-lone-worker-section"
          >
            <div className={IA_SUBSECTION_PANEL_HEADER_CLASS}>
              <h4 className="text-sm font-semibold text-foreground">Lone Worker &amp; Staff Safety</h4>
            </div>
            <div className="space-y-4 p-4">
              <HolisticAssessmentTable
                columns={[
                  { key: 'question', header: 'Lone worker / staff safety factor', className: 'w-[72%]' },
                  { key: 'yes', header: 'Yes', className: 'w-[14%] text-center' },
                  { key: 'no', header: 'No', className: 'w-[14%] text-center' },
                ]}
              >
                {ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS.map((q) => {
                  const answer = value[q.id]
                  const name = `environment-lone-worker-${q.id}`
                  const detailsValue = (value[q.detailsKey] as string | undefined) ?? ''
                  const detailsMissing = answer === true && detailsValue.trim().length === 0
                  return (
                    <Fragment key={q.id}>
                      <HolisticAssessmentTableRow>
                        <HolisticAssessmentTableCell className="align-top text-sm">
                          {q.label}
                        </HolisticAssessmentTableCell>
                        <YesNoColumnCell
                          name={name}
                          selected={answer}
                          column="yes"
                          disabled={disabled}
                          ariaLabel={q.label}
                          onSelect={(v) => patchLoneWorkerFactor(q.id, v)}
                        />
                        <YesNoColumnCell
                          name={name}
                          selected={answer}
                          column="no"
                          disabled={disabled}
                          ariaLabel={q.label}
                          onSelect={(v) => patchLoneWorkerFactor(q.id, v)}
                        />
                      </HolisticAssessmentTableRow>
                      {answer === true && (
                        <HolisticAssessmentTableRow>
                          <HolisticAssessmentTableCell colSpan={3} className="bg-slate-50/60 dark:bg-slate-900/30">
                            <Label
                              htmlFor={`${name}-details`}
                              className={cn(IA_QUESTION_LABEL_CLASS, 'flex items-center gap-1')}
                            >
                              Risk Details / Notes
                              <span className="text-destructive" aria-hidden="true">
                                *
                              </span>
                            </Label>
                            <Textarea
                              id={`${name}-details`}
                              className={cn('mt-1', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                              plain
                              compact
                              rows={2}
                              error={detailsMissing}
                              disabled={disabled}
                              required
                              aria-required="true"
                              placeholder="Please provide details"
                              value={detailsValue}
                              onChange={(e) => patch({ [q.detailsKey]: e.target.value })}
                            />
                            {detailsMissing && (
                              <p className="mt-1 text-xs text-destructive">
                                Please provide details for this risk.
                              </p>
                            )}
                          </HolisticAssessmentTableCell>
                        </HolisticAssessmentTableRow>
                      )}
                    </Fragment>
                  )
                })}
              </HolisticAssessmentTable>

              <div className="space-y-4 rounded-sm border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Staff Use Only
                </p>

                <div>
                  <span className={IA_QUESTION_LABEL_CLASS}>Lone worker risk identified?</span>
                  <div className="mt-2 flex gap-6">
                    {(
                      [
                        { label: 'Yes', v: true },
                        { label: 'No', v: false },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.label}
                        className={cn(
                          'flex cursor-pointer items-center gap-2',
                          IA_OPTION_LABEL_CLASS,
                          disabled && 'cursor-not-allowed opacity-60',
                        )}
                      >
                        <input
                          type="radio"
                          name="environment-lone-worker-identified"
                          className={IA_RADIO_CLASS}
                          disabled={disabled}
                          checked={value.loneWorkerRiskIdentified === opt.v}
                          onChange={() => patch({ loneWorkerRiskIdentified: opt.v })}
                          aria-label={`Lone worker risk identified — ${opt.label}`}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Auto-calculated from answers:</span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        computedLevelTone,
                      )}
                      data-testid="lone-worker-computed-level"
                    >
                      {computedLevelLabel}
                    </span>
                    {computedAxes && (
                      <span className="text-xs text-muted-foreground">
                        (Likelihood {levelWord(computedAxes.likelihood)} × Severity{' '}
                        {levelWord(computedAxes.severity)})
                      </span>
                    )}
                  </div>
                  <div className="mb-3 rounded-sm border border-slate-200 bg-white/60 p-3 text-xs text-muted-foreground dark:border-slate-700 dark:bg-card/60">
                    <p className="mb-1 font-semibold text-foreground">
                      How the risk level is decided (Likelihood × Severity, §13.7)
                    </p>
                    <p className="mb-1">
                      Each answered factor sets a <strong>Likelihood</strong> (how likely an incident
                      is) and a <strong>Severity</strong> (how serious / how hard to get help). Each
                      axis takes its worst factor (Low=1, Medium=2, High=3), then:
                    </p>
                    <ul className="space-y-1">
                      <li>
                        <span className="font-semibold text-destructive">High</span> — score 6–9
                        (e.g. any High × High factor such as physical violence, past safeguarding, or
                        previous SOS).
                      </li>
                      <li>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">Medium</span>{' '}
                        — score 3–5.
                      </li>
                      <li>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Low</span>{' '}
                        — score 1–2.
                      </li>
                      <li>
                        <span className="font-semibold">No risk</span> — no factors marked Yes.
                      </li>
                    </ul>
                    <p className="mt-1">
                      Carer works alone <em>and</em> night / late visits pushes Severity to High.
                    </p>
                  </div>
                  <Label htmlFor="environment-lone-worker-level" className={IA_QUESTION_LABEL_CLASS}>
                    Risk level (leave on Auto-calculate to use the value above, or override)
                  </Label>
                  <select
                    id="environment-lone-worker-level"
                    className={cn(
                      'mt-1 block w-full max-w-xs rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900',
                      disabled && 'cursor-not-allowed opacity-60',
                    )}
                    disabled={disabled}
                    value={value.loneWorkerRiskLevel ?? ''}
                    onChange={(e) =>
                      patch({
                        loneWorkerRiskLevel: e.target.value
                          ? (e.target.value as LoneWorkerRiskLevel)
                          : undefined,
                      })
                    }
                  >
                    <option value="">Auto-calculate</option>
                    {ENVIRONMENT_ASSESSMENT_LONE_WORKER_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                {suggestedMeasures.length > 0 && (
                  <div className="rounded-sm border border-sky-200 bg-sky-50/70 p-3 dark:border-sky-900 dark:bg-sky-950/30">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">
                        Suggested control measures ({suggestedMeasures.length})
                      </p>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={insertSuggestedMeasures}
                          className="rounded-sm border border-sky-300 bg-white px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-transparent dark:text-sky-300 dark:hover:bg-sky-900/40"
                          data-testid="lone-worker-insert-suggestions"
                        >
                          Insert into control measures
                        </button>
                      )}
                    </div>
                    <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                      {suggestedMeasures.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] italic text-muted-foreground">
                      Suggestions only — insert, then edit or add your own. Nothing is saved
                      automatically.
                    </p>
                  </div>
                )}

                <div>
                  <Label
                    htmlFor="environment-staff-safety-instructions"
                    className={IA_QUESTION_LABEL_CLASS}
                  >
                    Control Measures / Safety Actions
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Optional. Record mitigation steps — e.g. two carers required, avoid evening
                    visits, review before visit, safety monitoring required, contact office before
                    entering property.
                  </p>
                  <Textarea
                    id="environment-staff-safety-instructions"
                    className={cn('mt-1 min-h-[120px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                    disabled={disabled}
                    placeholder="e.g. Two carers required; avoid evening visits; contact office before entering property."
                    value={value.staffSafetyInstructions ?? ''}
                    onChange={(e) => patch({ staffSafetyInstructions: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-sm border border-slate-300 dark:border-slate-600">
            <div className={IA_SUBSECTION_PANEL_HEADER_CLASS}>
              <h4 className="text-sm font-semibold text-foreground">My Goals</h4>
            </div>
            <div className="space-y-4 p-4">
              {ENVIRONMENT_ASSESSMENT_GOALS_PROMPTS.map((prompt) => (
                <div key={prompt.key}>
                  <Label htmlFor={`environment-${prompt.key}`} className={IA_QUESTION_LABEL_CLASS}>
                    {prompt.label}
                  </Label>
                  <Textarea
                    id={`environment-${prompt.key}`}
                    className={cn('mt-1 min-h-[120px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                    disabled={disabled}
                    value={value[prompt.key] ?? ''}
                    onChange={(e) => patch({ [prompt.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-sm border border-slate-300 dark:border-slate-600">
            <div className={IA_SUBSECTION_PANEL_HEADER_CLASS}>
              <h4 className="text-sm font-semibold text-foreground">Staff Use Only</h4>
            </div>
            <div className="space-y-4 p-4">
              <ul className="space-y-3">
                {ENVIRONMENT_ASSESSMENT_STAFF_CHECKLIST.map((item) => (
                  <li key={item.key}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5',
                        IA_OPTION_LABEL_CLASS,
                        disabled && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <input
                        type="checkbox"
                        className={cn('mt-0.5 shrink-0', IA_CHECKBOX_CLASS)}
                        disabled={disabled}
                        checked={value[item.key] === true}
                        onChange={(e) => patch({ [item.key]: e.target.checked ? true : undefined })}
                        aria-label={item.label}
                      />
                      <span>{item.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div>
                <Label htmlFor="environment-staff-notes" className={IA_QUESTION_LABEL_CLASS}>
                  Additional notes
                </Label>
                <Textarea
                  id="environment-staff-notes"
                  className={cn('mt-1 min-h-[160px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
                  disabled={disabled}
                  value={value.staffNotes ?? ''}
                  onChange={(e) => patch({ staffNotes: e.target.value })}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
