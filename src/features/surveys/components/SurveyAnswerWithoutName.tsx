import * as React from 'react'
import { ChoiceOption } from '@/features/surveys/components/SurveyQuestionField'
import {
  ANSWER_WITH_NAME_LABEL,
  ANSWER_WITHOUT_NAME_LABEL,
  ANSWER_WITHOUT_NAME_NOTE,
} from '@/features/surveys/types'

/**
 * Named surveys that allow it: the person chooses whether their answers carry their name. Without
 * their name, the answers are not linked to them and the contact-me question is not asked.
 */
export function SurveyAnswerWithoutNameChoice({
  withoutName,
  disabled,
  onChange,
}: {
  withoutName: boolean
  disabled?: boolean
  onChange: (withoutName: boolean) => void
}) {
  const name = React.useId()
  return (
    <fieldset
      className="mb-3 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
      data-testid="survey-answer-without-name"
      aria-describedby={`${name}-about ${name}-note`}
    >
      <legend className="float-left w-full text-sm font-medium text-foreground">
        <h2 className="text-sm font-medium" id="survey-answer-without-name-title">Do you want to give your name?</h2>
      </legend>
      <p id={`${name}-about`} className="clear-left pt-0.5 text-xs text-muted-foreground">
        You can answer without your name. Your answers are then not linked to you, so we cannot follow
        them up or contact you about them.
      </p>
      <p id={`${name}-note`} className="mt-1 text-xs text-muted-foreground" data-testid="survey-answer-without-name-note">
        {ANSWER_WITHOUT_NAME_NOTE}
      </p>
      <div className="mt-3 grid gap-2">
        <ChoiceOption type="radio" name={`${name}-choice`} checked={!withoutName} disabled={disabled} onChange={() => onChange(false)}>
          {ANSWER_WITH_NAME_LABEL}
        </ChoiceOption>
        <ChoiceOption type="radio" name={`${name}-choice`} checked={withoutName} disabled={disabled} onChange={() => onChange(true)}>
          {ANSWER_WITHOUT_NAME_LABEL}
        </ChoiceOption>
      </div>
    </fieldset>
  )
}
