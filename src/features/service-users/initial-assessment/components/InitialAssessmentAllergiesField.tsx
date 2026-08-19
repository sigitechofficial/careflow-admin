import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { useServiceUserAllergies } from '@/features/service-users/hooks/useServiceUserTabs'
import { ServiceUserAllergiesTab } from '@/features/service-users/components/ServiceUserAllergiesTab'
import { formatAllergiesAssessmentText } from '@/features/service-users/utils/format-allergies-assessment-text'
import { holisticQuestionLabel } from '@/features/service-users/initial-assessment/utils/holistic-assessment-labels'
import type { InitialAssessmentAnswerInput, InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import {
  IA_HINT_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_SIMPLE_FIELD_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { fieldKeyOf } from '@/features/service-users/initial-assessment/utils/question-lookup'

type Props = {
  question: InitialAssessmentQuestion
  value: InitialAssessmentAnswerInput | undefined
  serviceUserId: string
  errorMessage?: string | null
  disabled?: boolean
  variant?: 'default' | 'simple'
  onChange: (patch: InitialAssessmentAnswerInput) => void
}

export function isAllergiesSummaryQuestion(question: InitialAssessmentQuestion): boolean {
  return (
    fieldKeyOf(question) === 'allergiesSummary' || question.questionText.trim() === 'Allergies (summary)'
  )
}

export function InitialAssessmentAllergiesField({
  question,
  value,
  serviceUserId,
  errorMessage,
  disabled,
  variant = 'default',
  onChange,
}: Props) {
  const lookupsQuery = useServiceUserLookups()
  const allergiesQuery = useServiceUserAllergies(serviceUserId, Boolean(serviceUserId))
  const simple = variant === 'simple'
  const label = holisticQuestionLabel(question.questionText)
  const summary = formatAllergiesAssessmentText(allergiesQuery.data ?? [])
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  React.useEffect(() => {
    if (disabled) return
    if (!allergiesQuery.isSuccess) return
    if ((value?.textValue ?? '') === summary) return
    onChangeRef.current({ questionId: question.id, textValue: summary })
  }, [allergiesQuery.isSuccess, disabled, question.id, summary, value?.textValue])

  return (
    <div className={cn(simple && IA_SIMPLE_FIELD_CLASS, 'space-y-2')} data-testid="ia-allergies-field">
      <p className={simple ? IA_QUESTION_LABEL_CLASS : 'text-sm font-medium'}>{label}</p>
      <p className={IA_HINT_CLASS}>
        Choose from the allergy catalogue (same list as Settings → Allergies). Changes also update the
        service user profile.{' '}
        <Link
          to="/service-users/$serviceUserId"
          params={{ serviceUserId }}
          search={{ tab: 'allergies' }}
          className="font-medium text-teal-800 underline-offset-2 hover:underline dark:text-teal-300"
        >
          Open profile allergies
        </Link>
      </p>
      <ServiceUserAllergiesTab
        serviceUserId={serviceUserId}
        allergyCatalog={lookupsQuery.data?.allergies ?? []}
        compact
        hideHeading
        disabled={disabled}
      />
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  )
}
