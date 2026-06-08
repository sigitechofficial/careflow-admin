import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { Label, Textarea } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  ENVIRONMENT_ASSESSMENT_GOALS_PROMPTS,
  ENVIRONMENT_ASSESSMENT_STAFF_CHECKLIST,
  ENVIRONMENT_ASSESSMENT_TABLE_QUESTIONS,
  type EnvironmentAssessmentMetadata,
  type EnvironmentAssessmentQuestionId,
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

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-environment-assessment-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="Environment Assessment" />

        <div className="space-y-6 border-t border-slate-200 bg-white p-4 dark:border-slate-700">
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
