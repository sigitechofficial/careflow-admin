import { InitialAssessmentQuestionField } from '@/features/service-users/initial-assessment/components/InitialAssessmentQuestionField'
import { InitialAssessmentPanelFieldList } from '@/features/service-users/initial-assessment/components/InitialAssessmentPanelFieldList'
import {
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import {
  assessorSignOffQuestions,
  serviceUserSignOffQuestions,
} from '@/features/service-users/initial-assessment/utils/sign-off-questions'
import { shouldShowQuestion } from '@/features/service-users/initial-assessment/utils/conditional-visibility'
import { IA_CALLOUT_NEUTRAL_CLASS, IA_INTRO_CLASS, IA_SECTION_BODY_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import { cn } from '@/shared/lib/utils'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

type Props = {
  section: InitialAssessmentSection
  allSections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  questionErrors?: Map<string, string>
  disabled: boolean
  serviceUserId: string
  submissionId: string | null
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void
}

function SignOffGroup({
  title,
  hint,
  questions,
  allSections,
  draftAnswers,
  questionErrors,
  disabled,
  serviceUserId,
  submissionId,
  onChange,
}: {
  title: string
  hint: string
  questions: InitialAssessmentQuestion[]
  allSections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  questionErrors?: Map<string, string>
  disabled: boolean
  serviceUserId: string
  submissionId: string | null
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void
}) {
  const visible = questions.filter((q) => shouldShowQuestion(q, allSections, draftAnswers))
  if (visible.length === 0) return null

  return (
    <InitialAssessmentSection12PanelShell title={title} hint={hint} bodyVariant="content">
      <InitialAssessmentPanelFieldList
        questions={visible}
        renderField={(q) => (
          <InitialAssessmentQuestionField
            question={q}
            value={draftAnswers[q.id]}
            disabled={disabled}
            serviceUserId={serviceUserId}
            submissionId={submissionId}
            layout="section12"
            errorMessage={questionErrors?.get(q.id) ?? null}
            onChange={(patch) => onChange(q.id, patch)}
          />
        )}
      />
    </InitialAssessmentSection12PanelShell>
  )
}

export function InitialAssessmentSignOffPanel({
  section,
  allSections,
  draftAnswers,
  questionErrors,
  disabled,
  serviceUserId,
  submissionId,
  onChange,
}: Props) {
  const suQuestions = serviceUserSignOffQuestions(section.questions)
  const assessorQuestions = assessorSignOffQuestions(section.questions)
  if (suQuestions.length === 0 && assessorQuestions.length === 0) return null

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-sign-off-panel">
      <p className={cn(IA_CALLOUT_NEUTRAL_CLASS, IA_INTRO_CLASS)}>
        Agreement and assessor declaration are required before submit. Dates and names must match your
        organisation&apos;s sign-off policy.
      </p>
      <SignOffGroup
        title="14.6 Service user agreement"
        hint="Confirm the person receiving care (or their representative) has agreed to the assessment findings."
        questions={suQuestions}
        allSections={allSections}
        draftAnswers={draftAnswers}
        questionErrors={questionErrors}
        disabled={disabled}
        serviceUserId={serviceUserId}
        submissionId={submissionId}
        onChange={onChange}
      />
      <SignOffGroup
        title="14.8 Assessor sign-off details"
        hint="Assessor confirms accuracy of the assessment and records their sign-off details."
        questions={assessorQuestions}
        allSections={allSections}
        draftAnswers={draftAnswers}
        questionErrors={questionErrors}
        disabled={disabled}
        serviceUserId={serviceUserId}
        submissionId={submissionId}
        onChange={onChange}
      />
    </div>
  )
}
