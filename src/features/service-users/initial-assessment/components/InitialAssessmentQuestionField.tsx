import type { ReactElement } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import {
  InitialAssessmentControlTooltip,
  iaQuestionTooltipText,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentControlTooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'
import {
  type QuestionOption,
  resolveQuestionOptions,
} from '@/features/service-users/initial-assessment/utils/question-options'
import { isSecureQuestion } from '@/features/service-users/initial-assessment/utils/secure-field'
import {
  clinicalMeasurementUnit,
  isClinicalMeasurementField,
} from '@/features/service-users/initial-assessment/utils/vitals-validation'
import { InitialAssessmentSecureTextField } from '@/features/service-users/initial-assessment/components/InitialAssessmentSecureTextField'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
} from '@/features/service-users/initial-assessment/types'
import { InitialAssessmentPaperYesNoRow } from '@/features/service-users/initial-assessment/components/InitialAssessmentPaperYesNoRow'
import { holisticQuestionLabel } from '@/features/service-users/initial-assessment/utils/holistic-assessment-labels'
import {
  IA_FORM_TEXTAREA_CLASS,
  IA_FORM_TEXTAREA_COMPACT_CLASS,
  IA_META_BADGE_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_LABEL_SECONDARY_CLASS,
  IA_LEGEND_CLASS,
  IA_HINT_CLASS,
  IA_OPTION_LABEL_CLASS,
  IA_CHECKBOX_CLASS,
  IA_SIMPLE_FIELD_CLASS,
  IA_SIMPLE_INPUT_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

const areaCls = cn(IA_FORM_TEXTAREA_CLASS)

const ASSESSOR_NOTES_TOOLTIP =
  'Optional context for auditors or care plan authors when this answer needs explanation.'

type Props = {
  question: InitialAssessmentQuestion
  value: InitialAssessmentAnswerInput | undefined
  prefillHint?: string | null
  errorMessage?: string | null
  disabled?: boolean
  serviceUserId?: string
  submissionId?: string | null
  /** Compact row styling for §12 panel shells; `simple` = flat §1 profile layout. */
  layout?: 'default' | 'section12' | 'clinicalMeasurement' | 'simple'
  hideLabel?: boolean
  useHolisticLabels?: boolean
  woundTypeCatalog?: QuestionOption[]
  onChange: (patch: InitialAssessmentAnswerInput) => void
}

function toInput(questionId: string, patch: Partial<InitialAssessmentAnswerInput>): InitialAssessmentAnswerInput {
  return { questionId, ...patch }
}

function yesNoTriState(value: InitialAssessmentAnswerInput | undefined): boolean | null {
  if (value?.checked === true || value?.booleanValue === true) return true
  if (value?.checked === false || value?.booleanValue === false) return false
  return null
}

function showAssessorNotes(question: InitialAssessmentQuestion): boolean {
  if (isClinicalMeasurementField(question)) return false
  if (
    question.questionType === 'YES_NO' ||
    question.questionType === 'CHECKBOX' ||
    question.questionType === 'SINGLE_SELECT' ||
    question.questionType === 'MULTI_SELECT' ||
    question.questionType === 'TEXTAREA'
  ) {
    return false
  }
  if (question.allowNotes === false) return false
  return true
}

function selectedValues(value: InitialAssessmentAnswerInput | undefined): string[] {
  const raw = value?.selectedOptions
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string' && raw) return [raw]
  return []
}

export function InitialAssessmentQuestionField({
  question,
  value,
  prefillHint,
  errorMessage,
  disabled,
  serviceUserId,
  submissionId,
  layout = 'default',
  hideLabel = false,
  useHolisticLabels = true,
  woundTypeCatalog,
  onChange,
}: Props) {
  const id = question.id
  const qid = question.id
  const options = resolveQuestionOptions(question, woundTypeCatalog)
  const hasError = Boolean(errorMessage)
  const simple = layout === 'simple'
  const section12 = layout === 'section12' || layout === 'clinicalMeasurement'
  const clinicalMeasurement = layout === 'clinicalMeasurement' || isClinicalMeasurementField(question)
  const fieldShellClass = simple ? IA_SIMPLE_FIELD_CLASS : section12 ? undefined : 'space-y-1 p-1'
  const inputClass = simple ? IA_SIMPLE_INPUT_CLASS : 'h-10 max-w-xs text-base'
  const showMetaChips = !simple
  const tooltipContent = iaQuestionTooltipText(question)
  const helpId = `${id}-help`
  const describedBy = question.helpText ? helpId : undefined

  const withTooltip = (
    element: ReactElement,
    options?: { content?: string | null; disabled?: boolean; className?: string },
  ) => (
    <InitialAssessmentControlTooltip
      content={options?.content ?? tooltipContent}
      disabled={options?.disabled ?? disabled}
      className={options?.className}
    >
      {element}
    </InitialAssessmentControlTooltip>
  )
  const errorEl = hasError ? (
    <p className="mt-1 text-xs font-medium text-destructive" role="alert">
      {errorMessage}
    </p>
  ) : null

  const metaChips = (
    <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
      {question.riskFlag ? (
        <span className={cn(IA_META_BADGE_CLASS, 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200')}>
          Risk
        </span>
      ) : null}
      {question.carePlanTrigger ? (
        <span className={cn(IA_META_BADGE_CLASS, 'bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200')}>
          Care plan
        </span>
      ) : null}
      {isSecureQuestion(question) ? (
        <span className={cn(IA_META_BADGE_CLASS, 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200')}>
          Secure
        </span>
      ) : null}
      {question.metadata?.syncKey || question.metadata?.syncFromKey ? (
        <span className={cn(IA_META_BADGE_CLASS, 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200')}>
          Synced
        </span>
      ) : null}
    </span>
  )

  const requiredMark = question.isRequired ? (
    <span className="text-teal-700 dark:text-teal-400" aria-hidden>
      {' '}
      *
    </span>
  ) : null

  const displayText = useHolisticLabels
    ? holisticQuestionLabel(question.questionText)
    : question.questionText

  const questionLabel = hideLabel ? null : (
    <>
      {displayText}
      {requiredMark}
      {showMetaChips ? metaChips : null}
    </>
  )

  const labelEl = questionLabel ? (
    <Label htmlFor={id} className={IA_QUESTION_LABEL_CLASS}>
      {questionLabel}
    </Label>
  ) : null

  const hintEl = prefillHint ? (
    <p
      className={cn(
        simple ? 'text-xs' : 'mt-1.5 flex items-start gap-1.5 text-teal-900 dark:text-teal-200',
        IA_HINT_CLASS,
      )}
    >
      {simple ? (
        <>On file: {prefillHint}</>
      ) : (
        <>
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" aria-hidden />
          On file: {prefillHint}
        </>
      )}
    </p>
  ) : null

  const srHelpEl = question.helpText ? (
    <span id={helpId} className="sr-only">
      {question.helpText}
    </span>
  ) : null

  const notesEl =
    showAssessorNotes(question) ? (
      <div className="mt-2 space-y-1">
        <Label htmlFor={`${id}-notes`} className={IA_LABEL_SECONDARY_CLASS}>
          Assessor notes (optional)
        </Label>
        {withTooltip(
          <textarea
            id={`${id}-notes`}
            className={cn(IA_FORM_TEXTAREA_COMPACT_CLASS, disabled && 'opacity-70')}
            rows={2}
            disabled={disabled}
            placeholder="Context for auditors or care plan authors…"
            value={value?.notes ?? ''}
            onChange={(e) => onChange(toInput(qid, { ...value, notes: e.target.value }))}
          />,
          { content: ASSESSOR_NOTES_TOOLTIP, className: 'block w-full' },
        )}
      </div>
    ) : null

  const fieldMetaFooter = (
    <>
      {hintEl}
      {errorEl}
    </>
  )

  const fieldFooter = (
    <>
      {fieldMetaFooter}
      {notesEl}
    </>
  )

  if (question.questionType === 'YES_NO') {
    return (
      <div className={fieldShellClass}>
        {srHelpEl}
        {withTooltip(
          <div className="min-w-0">
            <InitialAssessmentPaperYesNoRow
              label={hideLabel ? null : (questionLabel ?? displayText)}
              ariaLabel={hideLabel ? displayText : undefined}
              name={`ia-yesno-${id}`}
              value={yesNoTriState(value)}
              disabled={disabled}
              showDivider={false}
              onChange={(v) =>
                onChange(
                  toInput(qid, {
                    checked: v,
                    booleanValue: v,
                  }),
                )
              }
            />
          </div>,
          { className: 'block w-full' },
        )}
        {hintEl}
        {errorEl}
      </div>
    )
  }

  if (question.questionType === 'CHECKBOX') {
    const checked = value?.checked === true || value?.booleanValue === true
    return (
      <div className={fieldShellClass ?? 'p-1'}>
        {srHelpEl}
        <label className={cn('flex cursor-pointer items-start gap-2.5', IA_OPTION_LABEL_CLASS)}>
          {withTooltip(
            <input
              type="checkbox"
              className={cn('mt-1', IA_CHECKBOX_CLASS)}
              checked={checked}
              disabled={disabled}
              aria-describedby={describedBy}
              onChange={(e) =>
                onChange(
                  toInput(qid, {
                    checked: e.target.checked,
                    booleanValue: e.target.checked,
                  }),
                )
              }
            />,
            { className: 'inline-flex shrink-0' },
          )}
          <span>
            {questionLabel ?? question.questionText}
            {fieldFooter}
          </span>
        </label>
      </div>
    )
  }

  if (question.questionType === 'SINGLE_SELECT' && options.length > 0) {
    const current = selectedValues(value)[0] ?? ''
    return (
      <div className={fieldShellClass ?? 'space-y-1 p-1'}>
        {labelEl}
        <Select
          value={current || '_none'}
          disabled={disabled}
          onValueChange={(v) =>
            onChange(toInput(qid, { selectedOptions: v === '_none' ? [] : [v] }))
          }
        >
          <SelectTrigger id={id} className={simple ? IA_SIMPLE_INPUT_CLASS : 'h-10 max-w-md text-base'}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Select…</SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldMetaFooter}
        {notesEl}
      </div>
    )
  }

  if (question.questionType === 'MULTI_SELECT' && options.length > 0) {
    const selected = new Set(selectedValues(value))
    return (
      <fieldset className="space-y-2 p-1">
        <legend className={IA_LEGEND_CLASS}>
          {question.questionText}
          {requiredMark}
          {metaChips}
        </legend>
        {fieldFooter}
        <div className="flex flex-col gap-2">
          {srHelpEl}
          {options.map((opt) => (
            <label key={opt.value} className={cn('flex cursor-pointer items-center gap-2.5', IA_OPTION_LABEL_CLASS)}>
              {withTooltip(
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  disabled={disabled}
                  checked={selected.has(opt.value)}
                  aria-describedby={describedBy}
                  onChange={(e) => {
                    const next = new Set(selected)
                    if (e.target.checked) next.add(opt.value)
                    else next.delete(opt.value)
                    onChange(toInput(qid, { selectedOptions: [...next] }))
                  }}
                />,
                { className: 'inline-flex shrink-0' },
              )}
              {opt.label}
            </label>
          ))}
        </div>
      </fieldset>
    )
  }

  if (question.questionType === 'TEXTAREA') {
    return (
      <div className={fieldShellClass ?? 'space-y-1 p-1'}>
        {labelEl}
        {srHelpEl}
        {withTooltip(
          <textarea
            id={id}
            className={cn(areaCls, disabled && 'opacity-70', simple && 'min-h-[72px]')}
            disabled={disabled}
            rows={simple ? 2 : 3}
            aria-describedby={describedBy}
            placeholder={simple ? 'Enter details…' : undefined}
            value={value?.textValue ?? ''}
            onChange={(e) => onChange(toInput(qid, { ...value, textValue: e.target.value }))}
          />,
          { className: 'block w-full' },
        )}
        {fieldMetaFooter}
        {notesEl}
      </div>
    )
  }

  if (question.questionType === 'NUMBER') {
    const unit = clinicalMeasurementUnit(question)
    if (clinicalMeasurement) {
      return (
        <div className="py-0.5">
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_9.5rem] sm:items-center sm:gap-4">
            <Label htmlFor={id} className={cn(IA_QUESTION_LABEL_CLASS, 'sm:pe-2')}>
              {question.questionText.replace(/\s*\([^)]+\)\s*$/, '')}
              {requiredMark}
              {metaChips}
            </Label>
            <div className="flex items-center gap-2 sm:justify-end">
              {srHelpEl}
              {withTooltip(
                <Input
                  id={id}
                  type="number"
                  inputMode="decimal"
                  aria-label={question.questionText}
                  aria-describedby={describedBy}
                  className="h-10 w-full tabular-nums text-base sm:w-[5.5rem]"
                  disabled={disabled}
                  placeholder="—"
                  value={value?.numberValue ?? ''}
                  onChange={(e) => {
                    const n = e.target.value === '' ? undefined : Number(e.target.value)
                    onChange(toInput(qid, { numberValue: Number.isFinite(n) ? n : undefined }))
                  }}
                />,
                { className: 'inline-flex' },
              )}
              {unit ? (
                <span className="w-12 shrink-0 text-sm font-medium text-muted-foreground">{unit}</span>
              ) : null}
            </div>
          </div>
          {hintEl}
          {errorEl}
        </div>
      )
    }
    return (
      <div className={fieldShellClass ?? 'space-y-1 p-1'}>
        {labelEl}
        {srHelpEl}
        {withTooltip(
          <Input
            id={id}
            type="number"
            className={inputClass}
            disabled={disabled}
            placeholder="Enter number"
            aria-describedby={describedBy}
            value={value?.numberValue ?? ''}
            onChange={(e) => {
              const n = e.target.value === '' ? undefined : Number(e.target.value)
              onChange(toInput(qid, { numberValue: Number.isFinite(n) ? n : undefined }))
            }}
          />,
          { className: simple ? 'inline-flex max-w-md w-full' : 'inline-flex max-w-xs w-full' },
        )}
        {fieldMetaFooter}
        {notesEl}
      </div>
    )
  }

  if (question.questionType === 'DATE') {
    return (
      <div className={fieldShellClass ?? 'space-y-1 p-1'}>
        {labelEl}
        {srHelpEl}
        {withTooltip(
          <Input
            id={id}
            type="date"
            className={inputClass}
            disabled={disabled}
            aria-describedby={describedBy}
            value={value?.dateValue?.slice(0, 10) ?? ''}
            onChange={(e) =>
              onChange(toInput(qid, {
                dateValue: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined,
              }))
            }
          />,
          { className: simple ? 'inline-flex max-w-md w-full' : 'inline-flex max-w-xs w-full' },
        )}
        {fieldMetaFooter}
        {notesEl}
      </div>
    )
  }

  if (
    isSecureQuestion(question) &&
    question.questionType === 'TEXT' &&
    serviceUserId &&
    submissionId
  ) {
    return (
      <div className="space-y-1 p-1">
        <Label htmlFor={id} className={IA_QUESTION_LABEL_CLASS}>
          {question.questionText}
          {requiredMark}
          {metaChips}
        </Label>
        {fieldFooter}
        {srHelpEl}
        {withTooltip(
          <span className="block w-full max-w-md">
            <InitialAssessmentSecureTextField
              id={id}
              serviceUserId={serviceUserId}
              submissionId={submissionId}
              questionId={qid}
              value={value}
              disabled={disabled}
              onChange={onChange}
            />
          </span>,
          { className: 'block w-full' },
        )}
        <p className={IA_HINT_CLASS}>Encrypted at rest. Reveal is audited.</p>
      </div>
    )
  }

  return (
    <div className={fieldShellClass ?? 'space-y-1 p-1'}>
      {labelEl}
      {srHelpEl}
      {withTooltip(
        <Input
          id={id}
          className={simple ? IA_SIMPLE_INPUT_CLASS : 'h-10 text-base'}
          disabled={disabled}
          placeholder="Enter details"
          aria-describedby={describedBy}
          value={value?.textValue ?? ''}
          onChange={(e) => onChange(toInput(qid, { ...value, textValue: e.target.value }))}
        />,
        { className: simple ? 'block max-w-md' : 'block w-full' },
      )}
      {fieldMetaFooter}
      {notesEl}
    </div>
  )
}
