import * as React from 'react'
import { ChoiceOption } from '@/features/surveys/components/SurveyQuestionField'
import { useSurveyStrings } from '@/features/surveys/survey-ui-strings'

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
  const t = useSurveyStrings()
  const name = React.useId()
  return (
    <fieldset
      className="mb-3 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
      data-testid="survey-answer-without-name"
      aria-describedby={`${name}-about ${name}-note`}
    >
      <legend className="float-left w-full text-sm font-medium text-foreground">
        <h2 className="text-sm font-medium" id="survey-answer-without-name-title">{t('giveName')}</h2>
      </legend>
      <p id={`${name}-about`} className="clear-left pt-0.5 text-xs text-muted-foreground">
        {t('withoutNameAbout')}
      </p>
      <p id={`${name}-note`} className="mt-1 text-xs text-muted-foreground" data-testid="survey-answer-without-name-note">
        {t('withoutNameNote')}
      </p>
      <div className="mt-3 grid gap-2">
        <ChoiceOption type="radio" name={`${name}-choice`} checked={!withoutName} disabled={disabled} onChange={() => onChange(false)}>
          {t('answerWithName')}
        </ChoiceOption>
        <ChoiceOption type="radio" name={`${name}-choice`} checked={withoutName} disabled={disabled} onChange={() => onChange(true)}>
          {t('answerWithoutName')}
        </ChoiceOption>
      </div>
    </fieldset>
  )
}
