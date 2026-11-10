import * as React from 'react'
import { SurveyLookupChoice } from '@/features/surveys/components/SurveyLookupChoice'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'
import type {
  PublicSurveyQuestion,
  SurveyAnswerInput,
  SurveyQuestionType,
} from '@/features/surveys/types'

import { likertLabels } from '@/features/surveys/survey-likert'
import { MAX_RESPONDENT_TEXT } from '@/features/surveys/types'
import { commentShown, hasAnswer, otherChosen, toggleMultiOption } from '@/features/surveys/survey-logic'
import { useSurveyStrings } from '@/features/surveys/survey-ui-strings'

/**
 * One survey question with its answer control — shared by the public form, the portal, staff
 * recording and every preview.
 *
 * Accessibility (WCAG 2.2 AA): answers are native radio buttons and check boxes inside a
 * fieldset whose legend is the question; text boxes are labelled by the question; help text and
 * errors are tied to the control with aria-describedby; control borders meet 3:1 contrast.
 */

/** The numbers a rating question offers (shared with the paper copy). */
export function ratingValues(config: Record<string, unknown> | null): number[] {
  const min = typeof config?.min === 'number' ? config.min : 0
  const max = typeof config?.max === 'number' ? config.max : 10
  return Array.from({ length: Math.max(0, max - min) + 1 }, (_, i) => min + i)
}

/** The answers a choice or scale question offers (shared with the paper copy). */
export function choiceOptions(q: Pick<PublicSurveyQuestion, 'questionType' | 'options'>): string[] {
  if (q.questionType === 'LIKERT') {
    return likertLabels(q.options)
  }
  return q.options ?? []
}

export function hasValue(type: SurveyQuestionType, answer: SurveyAnswerInput | undefined): boolean {
  return hasAnswer(type, answer)
}

/** Question types answered by choosing (a group of radio buttons or check boxes). */
const GROUPED_TYPES: ReadonlySet<SurveyQuestionType> = new Set<SurveyQuestionType>([
  'YES_NO',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'LIKERT',
  'RATING',
])

/** The DOM id of a question's block (the error summary links here). */
export const questionAnchorId = (questionId: string) => `survey-question-${questionId}`

const TEXT_BOX_CLASS = cn(
  'w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
  'border-input',
)

const INVALID_CLASS = 'border-destructive'

/** "* (required)": the star is for sighted people, the words for screen readers. */
export function RequiredMark() {
  const t = useSurveyStrings()
  return (
    <>
      <span aria-hidden="true" className="ml-1 text-destructive">
        *
      </span>
      <span className="sr-only"> {t('required')}</span>
    </>
  )
}

/** An error by a control; "Error:" is read out first, as on GOV.UK forms. */
export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  const t = useSurveyStrings()
  return (
    <p id={id} className="mt-2 text-sm font-medium text-destructive" data-testid="survey-field-error">
      <span className="sr-only">{t('errorPrefix')} </span>
      {children}
    </p>
  )
}

const joinIds = (...ids: Array<string | null | undefined | false>) => ids.filter(Boolean).join(' ') || undefined

/** A respondent's own words: the "Other" text or a comment. */
function RespondentTextBox({
  id,
  label,
  value,
  required,
  disabled,
  anonymous,
  error,
  onChange,
  testId,
}: {
  id: string
  label: string
  value: string
  required?: boolean
  disabled: boolean
  anonymous?: boolean
  error?: string | null
  onChange: (next: string) => void
  testId: string
}) {
  const t = useSurveyStrings()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  return (
    <div className="mt-3 space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-foreground">
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      <textarea
        id={id}
        rows={2}
        maxLength={MAX_RESPONDENT_TEXT}
        disabled={disabled}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={joinIds(error && errorId, anonymous && hintId)}
        onChange={e => onChange(e.target.value)}
        className={cn(TEXT_BOX_CLASS, error && INVALID_CLASS)}
        data-testid={testId}
      />
      {anonymous ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {t('noNames')}
        </p>
      ) : null}
    </div>
  )
}

/**
 * One answer to choose: a native radio button (one answer) or check box (several) inside a large
 * card-style label, so the whole card is the target and screen readers hear "radio button,
 * 2 of 5, checked".
 */
export function ChoiceOption({
  type,
  name,
  checked,
  disabled,
  invalid,
  onChange,
  children,
}: {
  type: 'radio' | 'checkbox'
  name: string
  checked: boolean
  disabled?: boolean
  invalid?: boolean
  /** Radio: called when chosen. Check box: called with the new ticked state. */
  onChange: (checked: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label
      data-checked={checked || undefined}
      className={cn(
        'flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm text-foreground transition-colors',
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-background',
        checked
          ? 'border-teal-600 bg-teal-600/10 ring-1 ring-teal-600/40'
          : 'border-input bg-background hover:bg-muted/60',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={e => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-teal-600 focus-visible:outline-none"
      />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  )
}

/** A rating number: a radio button drawn as a number tile (40 × 40 px). */
function RatingOption({
  name,
  value,
  checked,
  disabled,
  invalid,
  onChoose,
}: {
  name: string
  value: number
  checked: boolean
  disabled: boolean
  invalid?: boolean
  onChoose: () => void
}) {
  return (
    <label className={cn('relative', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={() => onChoose()}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-medium tabular-nums transition-colors',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-background',
          checked
            ? 'border-teal-600 bg-teal-600 text-white'
            : 'border-input bg-background text-foreground hover:bg-muted/60',
          disabled && 'opacity-60',
        )}
      >
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </label>
  )
}

export function QuestionField({
  q,
  index,
  value,
  disabled,
  onChange,
  anonymous,
  error,
  otherTextError,
  headingLevel = 2,
}: {
  q: PublicSurveyQuestion
  index: number
  value: SurveyAnswerInput | undefined
  disabled: boolean
  onChange: (next: SurveyAnswerInput) => void
  /** Anonymous survey: text boxes remind people not to write names. */
  anonymous?: boolean
  /** Shown after a submit attempt when the question still needs an answer. */
  error?: string | null
  /** Shown after a submit attempt when "Other" is chosen but not described. */
  otherTextError?: string | null
  /** 2 on a page of questions; 3 when the questions sit under section headings (h2). */
  headingLevel?: 2 | 3 | 4 | 5
}) {
  const t = useSurveyStrings()
  // In another language: the label shown for an answer (the English answer is still what is sent).
  const shownAs = (opt: string) => q.optionLabels?.[opt] ?? opt
  const uid = React.useId()
  const base = `q${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const headingId = `${base}-title`
  const helpId = `${base}-help`
  const errorId = `${base}-error`
  const inputId = `${base}-input`
  const groupName = `${base}-answer`
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4' | 'h5'

  const options = choiceOptions(q)
  const other = q.otherOption ?? null
  // Changing the answer keeps the person's Other text and comment (they are left out on submit
  // when no longer offered), so changing their mind does not lose what they wrote.
  const keep = { otherText: value?.otherText, comment: value?.comment }
  const choose = (next: Omit<SurveyAnswerInput, 'questionId'>) => onChange({ questionId: q.id, ...keep, ...next })
  const showOther = otherChosen(q, value)
  const showComment = commentShown(q, value)
  const lookup =
    Boolean(q.optionGroups?.length) && (q.questionType === 'SINGLE_SELECT' || q.questionType === 'MULTI_SELECT')
  const grouped = lookup || GROUPED_TYPES.has(q.questionType)
  const invalid = Boolean(error)
  const describedBy = joinIds(q.helpText && helpId, error && errorId)

  const title = (
    <Heading id={headingId} className="text-sm font-semibold leading-snug text-foreground sm:text-[15px]">
      {q.questionText}
      {q.isRequired ? <RequiredMark /> : null}
    </Heading>
  )
  const help = q.helpText ? (
    <p id={helpId} className="mt-1 text-xs text-muted-foreground">
      {q.helpText}
    </p>
  ) : null
  const errorLine = error ? <FieldError id={errorId}>{error}</FieldError> : null

  let control: React.ReactNode
  if (q.questionType === 'YES_NO') {
    control = (
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: t('yes'), val: true },
          { label: t('no'), val: false },
        ].map(opt => (
          <ChoiceOption
            key={opt.label}
            type="radio"
            name={groupName}
            checked={value?.booleanValue === opt.val}
            disabled={disabled}
            invalid={invalid}
            onChange={() => choose({ booleanValue: opt.val })}
          >
            {opt.label}
          </ChoiceOption>
        ))}
      </div>
    )
  } else if (lookup) {
    // A CareFlow list (e.g. ethnicity): searchable, under its group headings.
    control = (
      <SurveyLookupChoice
        questionId={q.id}
        questionText={q.questionText}
        groups={q.optionGroups!}
        multiple={q.questionType === 'MULTI_SELECT'}
        selected={value?.selectedOptions ?? []}
        disabled={disabled}
        onChange={next => choose({ selectedOptions: next })}
      />
    )
  } else if (q.questionType === 'SINGLE_SELECT' || q.questionType === 'LIKERT') {
    control = withAnswerHeadings(
      q,
      [...options, ...(other && q.questionType === 'SINGLE_SELECT' ? [other.label] : [])],
      opt => (
          <ChoiceOption
            key={opt}
            type="radio"
            name={groupName}
            checked={value?.selectedOptions?.[0] === opt}
            disabled={disabled}
            invalid={invalid}
            onChange={() => choose({ selectedOptions: [opt] })}
          >
            {shownAs(opt)}
          </ChoiceOption>
      ),
    )
  } else if (q.questionType === 'MULTI_SELECT') {
    const selected = value?.selectedOptions ?? []
    control = withAnswerHeadings(
      q,
      [...options, ...(other ? [other.label] : [])],
      opt => (
          <ChoiceOption
            key={opt}
            type="checkbox"
            name={groupName}
            checked={selected.includes(opt)}
            disabled={disabled}
            invalid={invalid}
            onChange={() => choose({ selectedOptions: toggleMultiOption(q, selected, opt) })}
          >
            {shownAs(opt)}
          </ChoiceOption>
      ),
    )
  } else if (q.questionType === 'RATING') {
    control = (
      <div className="flex flex-wrap gap-2">
        {ratingValues(q.config).map(n => (
          <RatingOption
            key={n}
            name={groupName}
            value={n}
            checked={value?.numberValue === n}
            disabled={disabled}
            invalid={invalid}
            onChoose={() => choose({ numberValue: n })}
          />
        ))}
      </div>
    )
  } else if (q.questionType === 'NUMBER') {
    control = (
      <Input
        id={inputId}
        type="number"
        inputMode="decimal"
        className={cn('h-11 w-40', invalid && INVALID_CLASS)}
        disabled={disabled}
        aria-labelledby={headingId}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        value={value?.numberValue ?? ''}
        onChange={e => {
          const raw = e.target.value
          choose({ numberValue: raw === '' ? undefined : Number(raw) })
        }}
      />
    )
  } else if (q.questionType === 'TEXTAREA') {
    control = (
      <textarea
        id={inputId}
        rows={4}
        disabled={disabled}
        aria-labelledby={headingId}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        value={value?.textValue ?? ''}
        onChange={e => onChange({ questionId: q.id, textValue: e.target.value })}
        className={cn(TEXT_BOX_CLASS, 'py-2.5', invalid && INVALID_CLASS)}
        placeholder={t('yourAnswer')}
      />
    )
  } else {
    control = (
      <Input
        id={inputId}
        type="text"
        className={cn('h-11', invalid && INVALID_CLASS)}
        disabled={disabled}
        aria-labelledby={headingId}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        value={value?.textValue ?? ''}
        onChange={e => onChange({ questionId: q.id, textValue: e.target.value })}
        placeholder={t('yourAnswer')}
      />
    )
  }

  return (
    // A plain block, not a <section>: a named section per question would flood the landmarks list.
    <div
      id={questionAnchorId(q.id)}
      className={cn(
        'scroll-mt-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5',
        invalid || otherTextError ? 'border-destructive' : 'border-border',
      )}
    >
      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-600/10 text-xs font-semibold text-teal-700 dark:text-teal-300"
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          {grouped ? (
            // The question names the group: screen readers say it when moving into the answers.
            <fieldset className="min-w-0" aria-describedby={describedBy}>
              <legend className="w-full">{title}</legend>
              {help}
              {errorLine}
              <div className="mt-3.5">{control}</div>
            </fieldset>
          ) : (
            <>
              {title}
              {help}
              {errorLine}
              <div className="mt-3.5">{control}</div>
            </>
          )}
          {showOther && other ? (
            <RespondentTextBox
              id={`${base}-other`}
              label={other.textPrompt}
              required={other.textRequired}
              value={value?.otherText ?? ''}
              disabled={disabled}
              anonymous={anonymous}
              error={otherTextError}
              onChange={text => onChange({ ...(value ?? { questionId: q.id }), otherText: text })}
              testId={`other-text-${q.id}`}
            />
          ) : null}
          {showComment && q.commentConfig ? (
            <RespondentTextBox
              id={`${base}-comment`}
              label={`${q.commentConfig.prompt} ${t('optional')}`}
              value={value?.comment ?? ''}
              disabled={disabled}
              anonymous={anonymous}
              onChange={text => onChange({ ...(value ?? { questionId: q.id }), comment: text })}
              testId={`comment-${q.id}`}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * Answers under headings (grouped answer choices, Phase 2 part 7): each heading names a group of its answers; answers in
 * no group (and "Other") follow. Without groups, the plain list.
 */
function withAnswerHeadings(q: { questionType: string; answerGroups?: Array<{ heading: string; options: string[] }> }, list: string[], render: (opt: string) => React.ReactNode) {
  const groups = q.questionType === 'SINGLE_SELECT' || q.questionType === 'MULTI_SELECT' ? (q.answerGroups ?? []) : []
  if (!groups.length) return <div className="space-y-2">{list.map(render)}</div>
  const grouped = new Set(groups.flatMap(g => g.options))
  const rest = list.filter(o => !grouped.has(o))
  return (
    <div className="space-y-3">
      {groups.map(g => (
        <div key={g.heading} role="group" aria-label={g.heading} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.heading}</p>
          {g.options.filter(o => list.includes(o)).map(render)}
        </div>
      ))}
      {rest.length ? <div className="space-y-2">{rest.map(render)}</div> : null}
    </div>
  )
}
