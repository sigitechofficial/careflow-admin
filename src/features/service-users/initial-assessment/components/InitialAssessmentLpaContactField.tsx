import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/form-field'
import { plainTextFromHtml } from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { holisticQuestionLabel } from '@/features/service-users/initial-assessment/utils/holistic-assessment-labels'
import type { InitialAssessmentAnswerInput, InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import {
  IA_LABEL_SECONDARY_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_SIMPLE_FIELD_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  question: InitialAssessmentQuestion
  value: InitialAssessmentAnswerInput | undefined
  errorMessage?: string | null
  disabled?: boolean
  variant?: 'default' | 'simple'
  onChange: (patch: InitialAssessmentAnswerInput) => void
}

type LpaContactDraft = {
  contact: string
  address: string
}

/** Stored as one text answer so exports and summaries show both lines. */
export function formatLpaContactAssessmentText(draft: LpaContactDraft): string {
  return [
    draft.contact.trim() ? `Contact: ${draft.contact.trim()}` : '',
    draft.address.trim() ? `Address: ${draft.address.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function parseLpaContactAssessmentText(text: string | undefined | null): LpaContactDraft {
  // Older answers are rich text: keep paragraph / line breaks as new lines before stripping tags.
  const raw = plainTextFromHtml((text ?? '').replace(/<br\s*\/?>|<\/(p|div|li)>/gi, '\n')).trim()
  if (!raw) return { contact: '', address: '' }
  const contact = raw.match(/^Contact:\s*(.*)$/im)?.[1]?.trim()
  const address = raw.match(/^Address:\s*(.*)$/im)?.[1]?.trim()
  if (contact === undefined && address === undefined) {
    // Older free-text (rich text) answers: keep everything in the contact box.
    return { contact: raw.replace(/\s*\r?\n\s*/g, ', '), address: '' }
  }
  return { contact: contact ?? '', address: address ?? '' }
}

export function InitialAssessmentLpaContactField({
  question,
  value,
  errorMessage,
  disabled,
  variant = 'default',
  onChange,
}: Props) {
  const simple = variant === 'simple'
  // Local draft keeps what is typed (e.g. trailing spaces); the saved text is trimmed.
  const [draft, setDraft] = React.useState<LpaContactDraft>(() =>
    parseLpaContactAssessmentText(value?.textValue),
  )

  React.useEffect(() => {
    setDraft((current) =>
      formatLpaContactAssessmentText(current) === (value?.textValue ?? '')
        ? current
        : parseLpaContactAssessmentText(value?.textValue),
    )
  }, [value?.textValue])

  const setField = (key: keyof LpaContactDraft, nextValue: string) => {
    const next = { ...draft, [key]: nextValue }
    setDraft(next)
    onChange({
      ...(value ?? { questionId: question.id }),
      questionId: question.id,
      textValue: formatLpaContactAssessmentText(next),
    })
  }

  return (
    <div className={simple ? IA_SIMPLE_FIELD_CLASS : 'space-y-3 p-1'}>
      <Label className={IA_QUESTION_LABEL_CLASS}>
        {holisticQuestionLabel(question.questionText)}
        {question.isRequired ? (
          <span className="text-teal-700 dark:text-teal-400" aria-hidden>
            {' '}
            *
          </span>
        ) : null}
      </Label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${question.id}-lpaContact`} className={IA_LABEL_SECONDARY_CLASS}>
            Contact
          </Label>
          <Input
            id={`${question.id}-lpaContact`}
            value={draft.contact}
            onChange={(e) => setField('contact', e.target.value)}
            disabled={disabled}
            placeholder="Phone number / email"
            className={cn('h-10 text-base', simple && 'w-full')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${question.id}-lpaAddress`} className={IA_LABEL_SECONDARY_CLASS}>
            Address
          </Label>
          <Input
            id={`${question.id}-lpaAddress`}
            value={draft.address}
            onChange={(e) => setField('address', e.target.value)}
            disabled={disabled}
            placeholder="Address"
            className={cn('h-10 text-base', simple && 'w-full')}
          />
        </div>
      </div>
      {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
    </div>
  )
}
