import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { InitialAssessmentPaperYesNoRow } from '@/features/service-users/initial-assessment/components/InitialAssessmentPaperYesNoRow'
import { Label, Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  FALLS_SCREENING_ACTION_RULES,
  FALLS_SCREENING_HEADER_QUESTIONS,
  FALLS_SCREENING_TABLE_QUESTIONS,
  computeFallsScreeningActions,
  fallsScreeningQuestionValue,
  type FallsScreeningMetadata,
  type FallsScreeningNaAnswer,
  type FallsScreeningQuestionId,
} from '@/features/service-users/initial-assessment/utils/falls-screening'
import {
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_HINT_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_RADIO_CLASS,
  IA_SECTION_BODY_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  value: FallsScreeningMetadata
  disabled?: boolean
  onChange: (next: FallsScreeningMetadata) => void
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

function HeaderYesNoNaRow({
  label,
  name,
  value,
  disabled,
  onChange,
}: {
  label: string
  name: string
  value: FallsScreeningNaAnswer | null | undefined
  disabled?: boolean
  onChange: (value: FallsScreeningNaAnswer) => void
}) {
  const options: { id: FallsScreeningNaAnswer; text: string }[] = [
    { id: 'yes', text: 'Yes' },
    { id: 'no', text: 'No' },
    { id: 'na', text: 'N/A' },
  ]

  return (
    <div className="flex flex-col gap-2 border-b border-border/60 py-2 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-4" role="radiogroup" aria-label={label}>
        {options.map(({ id, text }) => (
          <label
            key={id}
            className={cn(
              'flex cursor-pointer items-center gap-1.5',
              IA_OPTION_LABEL_CLASS,
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="radio"
              name={name}
              className={IA_RADIO_CLASS}
              checked={value === id}
              disabled={disabled}
              onChange={() => onChange(id)}
            />
            {text}
          </label>
        ))}
      </div>
    </div>
  )
}

export function InitialAssessmentFallsScreeningPanel({ value, disabled, onChange }: Props) {
  const patch = (partial: Partial<FallsScreeningMetadata>) => onChange({ ...value, ...partial })

  const patchQuestion = (id: FallsScreeningQuestionId, answer: boolean) => {
    const fieldMap = {
      q1: 'q1FallsNeedInvestigating',
      q2: 'q2DizzyOrBlackouts',
      q3: 'q3WalkingBalanceUnassessed',
      q4: 'q4FourPlusMedsNoReview',
      q5: 'q5TrippingMore',
      q6: 'q6FearOfFalling',
    } as const
    patch({ [fieldMap[id]]: answer })
  }

  const activeActions = computeFallsScreeningActions(value)
  const screeningTableEnabled = value.consentToSixQuestions === true

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-falls-screening-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="Falls screening" />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:border-slate-700">
          <section className="divide-y divide-border/60 rounded-sm border border-slate-300 dark:border-slate-600">
            {FALLS_SCREENING_HEADER_QUESTIONS.map((q) => {
              if (q.kind === 'yesNoNa') {
                return (
                  <HeaderYesNoNaRow
                    key={q.id}
                    name={`falls-header-${q.id}`}
                    label={q.label}
                    value={value.firstScreenSinceLastFall}
                    disabled={disabled}
                    onChange={(v) => patch({ firstScreenSinceLastFall: v })}
                  />
                )
              }

              const fieldValue =
                q.id === 'fallOrConcern' ? value.fallOrConcern : value.consentToSixQuestions

              return (
                <InitialAssessmentPaperYesNoRow
                  key={q.id}
                  name={`falls-header-${q.id}`}
                  label={q.label}
                  value={fieldValue ?? null}
                  disabled={disabled}
                  showDivider
                  onChange={(v) => {
                    if (q.id === 'fallOrConcern') {
                      patch({ fallOrConcern: v })
                      return
                    }
                    patch({
                      consentToSixQuestions: v,
                      ...(v
                        ? {}
                        : {
                            q1FallsNeedInvestigating: undefined,
                            q2DizzyOrBlackouts: undefined,
                            q3WalkingBalanceUnassessed: undefined,
                            q4FourPlusMedsNoReview: undefined,
                            q5TrippingMore: undefined,
                            q6FearOfFalling: undefined,
                          }),
                    })
                  }}
                />
              )
            })}
          </section>

          <section className="space-y-3">
            {value.consentToSixQuestions === false ? (
              <p className={cn('text-sm', IA_HINT_CLASS)}>
                Client did not consent to the six screening questions — table answers are not required.
              </p>
            ) : value.consentToSixQuestions == null ? (
              <p className={cn('text-sm', IA_HINT_CLASS)}>
                Record consent above before completing the six screening questions.
              </p>
            ) : null}
            <HolisticAssessmentTable
              columns={[
                { key: 'number', header: '#', className: 'w-10 text-center' },
                {
                  key: 'question',
                  header: 'Falls screening questions',
                  className: 'w-[62%]',
                },
                { key: 'yes', header: 'Yes', className: 'w-[14%] text-center' },
                { key: 'no', header: 'No', className: 'w-[14%] text-center' },
              ]}
            >
              {FALLS_SCREENING_TABLE_QUESTIONS.map((q, index) => {
                const answer = fallsScreeningQuestionValue(value, q.id)
                const name = `falls-screen-${q.id}`
                const tableDisabled = disabled || !screeningTableEnabled

                return (
                  <HolisticAssessmentTableRow key={q.id}>
                    <HolisticAssessmentTableCell className="text-center align-top font-mono text-sm tabular-nums">
                      {index + 1}
                    </HolisticAssessmentTableCell>
                    <HolisticAssessmentTableCell className="align-top text-sm">
                      {q.label}
                    </HolisticAssessmentTableCell>
                    <YesNoColumnCell
                      name={name}
                      selected={answer}
                      column="yes"
                      disabled={tableDisabled}
                      ariaLabel={q.label}
                      onSelect={(v) => patchQuestion(q.id, v)}
                    />
                    <YesNoColumnCell
                      name={name}
                      selected={answer}
                      column="no"
                      disabled={tableDisabled}
                      ariaLabel={q.label}
                      onSelect={(v) => patchQuestion(q.id, v)}
                    />
                  </HolisticAssessmentTableRow>
                )
              })}
            </HolisticAssessmentTable>
          </section>

          <section className="rounded-sm border border-slate-300 p-4 dark:border-slate-600">
            <Label htmlFor="falls-screening-comments" className={IA_QUESTION_LABEL_CLASS}>
              Additional comments:
            </Label>
            <Textarea
              id="falls-screening-comments"
              className={cn('mt-2 min-h-[120px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
              disabled={disabled}
              value={value.additionalComments ?? ''}
              onChange={(e) => patch({ additionalComments: e.target.value })}
            />
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-4 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-foreground">Recommended actions</h4>
            {activeActions.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                {activeActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            ) : (
              <p className={cn('text-sm', IA_HINT_CLASS)}>
                Complete the six screening questions to see recommended actions.
              </p>
            )}

            <div className="space-y-3">
              {FALLS_SCREENING_ACTION_RULES.map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/40 sm:flex-row sm:items-stretch"
                >
                  <div className="shrink-0 rounded bg-teal-800 px-3 py-2 font-medium text-white dark:bg-teal-900 sm:max-w-[38%]">
                    {rule.condition}
                  </div>
                  <div className="flex items-center text-muted-foreground sm:px-1">→</div>
                  <div className="flex flex-1 flex-col gap-2">
                    {rule.actions.map((action) => (
                      <div
                        key={action}
                        className="rounded bg-sky-100 px-3 py-2 text-foreground dark:bg-sky-950/50"
                      >
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
