import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import { InitialAssessmentYesNoCardField } from '@/features/service-users/initial-assessment/components/InitialAssessmentYesNoCardField'
import { Label } from '@/shared/ui/form-field'
import { InitialAssessmentTextarea as Textarea } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { cn } from '@/shared/lib/utils'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  END_OF_LIFE_ASSESSMENT_QUESTIONS,
  endOfLifeAnswerKey,
  endOfLifeNotesKey,
  endOfLifeNotesValue,
  endOfLifeTriAnswerKey,
  endOfLifeTriValue,
  endOfLifeYesNoValue,
  type EndOfLifeAssessmentMetadata,
  type EndOfLifeQuestionDef,
  type EndOfLifeTriStateAnswer,
} from '@/features/service-users/initial-assessment/utils/end-of-life-assessment'
import {
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_HINT_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_RADIO_CLASS,
  IA_SECTION_BODY_CLASS,
  IA_SUBSECTION_PANEL_HEADER_CLASS,
  IA_YES_NO_CARD_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  value: EndOfLifeAssessmentMetadata
  disabled?: boolean
  onChange: (next: EndOfLifeAssessmentMetadata) => void
}

function YesNoUnknownRow({
  name,
  value,
  disabled,
  label,
  onChange,
}: {
  name: string
  value: EndOfLifeTriStateAnswer | undefined
  disabled?: boolean
  label: string
  onChange: (value: EndOfLifeTriStateAnswer) => void
}) {
  const options: { id: EndOfLifeTriStateAnswer; text: string }[] = [
    { id: 'yes', text: 'Yes' },
    { id: 'no', text: 'No' },
    { id: 'unknown', text: 'Unknown' },
  ]

  return (
    <div className={IA_YES_NO_CARD_CLASS}>
      <div className="flex min-h-10 items-center gap-3 sm:gap-4">
        <span className={cn('min-w-0 flex-1 text-sm font-medium text-foreground')}>{label}</span>
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
    </div>
  )
}

function QuestionBlock({
  question,
  value,
  disabled,
  onChange,
}: {
  question: EndOfLifeQuestionDef
  value: EndOfLifeAssessmentMetadata
  disabled?: boolean
  onChange: (next: EndOfLifeAssessmentMetadata) => void
}) {
  const notesKey = endOfLifeNotesKey(question.id)
  const notes = endOfLifeNotesValue(value, question.id) ?? ''
  const setNotes = (next: string) => onChange({ ...value, [notesKey]: next })

  return (
    <section className="space-y-3 border-b border-border/60 pb-5 last:border-b-0">
      {question.kind === 'yesNo' ? (
        <InitialAssessmentYesNoCardField
          name={`eol-${question.id}`}
          label={question.label}
          value={endOfLifeYesNoValue(value, question.id) ?? null}
          disabled={disabled}
          showDivider={false}
          onChange={(v) => onChange({ ...value, [endOfLifeAnswerKey(question.id)]: v })}
        />
      ) : null}

      {question.kind === 'yesNoUnknown' ? (
        <YesNoUnknownRow
          name={`eol-${question.id}`}
          label={question.label}
          value={endOfLifeTriValue(value, question.id) ?? null}
          disabled={disabled}
          onChange={(v) => onChange({ ...value, [endOfLifeTriAnswerKey(question.id)]: v })}
        />
      ) : null}

      {question.kind === 'notesOnly' ? (
        <Label htmlFor={`eol-notes-${question.id}`} className={IA_QUESTION_LABEL_CLASS}>
          {question.label}
        </Label>
      ) : null}

      {question.hint ? (
        <p className={cn('text-sm', IA_HINT_CLASS)}>{question.hint}</p>
      ) : null}

      <Textarea
        id={`eol-notes-${question.id}`}
        className={cn('min-h-[120px]', IA_FORM_TEXTAREA_COMPACT_CLASS)}
        disabled={disabled}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </section>
  )
}

export function InitialAssessmentEndOfLifeAssessmentPanel({ value, disabled, onChange }: Props) {
  let lastWishesHeaderShown = false

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-end-of-life-assessment-panel">
      <div className={HOLISTIC_SECTION_SHELL_CLASS}>
        <HolisticSectionHeader title="End of Life Assessment" />

        <div className="space-y-2 border-t border-slate-200 bg-white p-4 dark:border-slate-700">
          {END_OF_LIFE_ASSESSMENT_QUESTIONS.map((question) => {
            const showLastWishesHeader =
              question.section === 'lastWishes' && !lastWishesHeaderShown
            if (showLastWishesHeader) lastWishesHeaderShown = true

            return (
              <div key={question.id}>
                {showLastWishesHeader ? (
                  <div className={cn(IA_SUBSECTION_PANEL_HEADER_CLASS, 'mb-4 mt-2')}>
                    <h4 className="text-sm font-semibold uppercase tracking-wide underline">
                      Last wishes
                    </h4>
                  </div>
                ) : null}
                <QuestionBlock
                  question={question}
                  value={value}
                  disabled={disabled}
                  onChange={onChange}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
