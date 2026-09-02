import * as React from 'react'
import { FileUp, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useInitialAssessmentAttachments,
  useUploadInitialAssessmentAttachment,
} from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import {
  CONSENT_CAPACITY_STEPS,
  consentStepSpecRefsLabel,
  questionsForConsentStep,
} from '@/features/service-users/initial-assessment/utils/consent-capacity-steps'
import { findQuestionBySpecRef, isExplicitNo } from '@/features/service-users/initial-assessment/utils/question-lookup'
import {
  InitialAssessmentSection12FieldRow,
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import {
  IA_CALLOUT_AMBER_CLASS,
  IA_CALLOUT_VIOLET_CLASS,
  IA_CALLOUT_TITLE_CLASS,
  IA_HINT_CLASS,
  IA_QUESTION_LABEL_CLASS,
  IA_SECTION_BODY_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'

type Props = {
  section: InitialAssessmentSection
  allSections: InitialAssessmentSection[]
  visibleQuestions: InitialAssessmentQuestion[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  disabled: boolean
  serviceUserId: string
  submissionId: string | null
  renderField: (q: InitialAssessmentQuestion) => React.ReactNode
}

export function InitialAssessmentConsentCapacitySection({
  allSections,
  visibleQuestions,
  draftAnswers,
  disabled,
  serviceUserId,
  submissionId,
  renderField,
}: Props) {
  const fileRef = React.useRef<HTMLInputElement>(null)

  const attachmentsQuery = useInitialAssessmentAttachments(serviceUserId, submissionId)
  const uploadMutation = useUploadInitialAssessmentAttachment(serviceUserId, submissionId ?? '')
  const mcaDocs = (attachmentsQuery.data ?? []).filter((a) => a.category === 'MCA_DOCUMENT')

  const consentQ = findQuestionBySpecRef(allSections, '2.1')
  const capacityQ = findQuestionBySpecRef(allSections, '2.4')
  const consentBlocked = consentQ && isExplicitNo(draftAnswers[consentQ.id])
  const capacityIssue = capacityQ && isExplicitNo(draftAnswers[capacityQ.id])

  const onMcaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !submissionId || disabled) return
    try {
      await uploadMutation.mutateAsync({ file, category: 'MCA_DOCUMENT', label: file.name })
      toastSuccess('MCA document uploaded')
    } catch (err) {
      toastApiError(err, 'Upload failed')
    }
  }

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-consent-capacity-section">
      <div className={IA_CALLOUT_VIOLET_CLASS}>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-700 dark:text-violet-300" aria-hidden />
          <div>
            <p className={cn(IA_CALLOUT_TITLE_CLASS, 'text-violet-950 dark:text-violet-100')}>
              Consent, capacity and information sharing
            </p>
            <p className={cn('mt-1', IA_HINT_CLASS)}>
              Consent must be Yes to submit. If capacity is not intact, complete the MCA block and attach
              documentation.
            </p>
          </div>
        </div>
      </div>

      {consentBlocked ? (
        <div
          className={cn(
            IA_CALLOUT_AMBER_CLASS,
            'border-red-300 bg-red-50 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100',
          )}
          role="alert"
        >
          Consent to assessment is No — assessment cannot be submitted until consent is obtained or a valid
          best-interest process is recorded.
        </div>
      ) : null}

      {capacityIssue ? (
        <div className={cn(IA_CALLOUT_AMBER_CLASS, 'text-sm text-amber-950 dark:text-amber-100')} role="status">
          Capacity not intact — complete the MCA section below and attach documentation before submit.
        </div>
      ) : null}

      {CONSENT_CAPACITY_STEPS.map((step) => {
        const qs = questionsForConsentStep(visibleQuestions, step)
        if (qs.length === 0) return null
        return (
          <InitialAssessmentSection12PanelShell
            key={step.id}
            title={consentStepSpecRefsLabel(step)}
            hint={step.description}
            bodyVariant="content"
            testId={`ia-consent-step-${step.id}`}
          >
            {qs.map((q) => (
                <InitialAssessmentSection12FieldRow key={q.id}>{renderField(q)}</InitialAssessmentSection12FieldRow>
              ))}

            {step.id === 'capacity' ? (
              <div className={IA_CALLOUT_VIOLET_CLASS}>
                <p className={cn(IA_QUESTION_LABEL_CLASS, 'text-violet-950 dark:text-violet-100')}>
                  MCA documentation
                </p>
                <p className={cn('mt-1', IA_HINT_CLASS)}>
                  Attach completed MCA forms, best interest records, or LPA documentation.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={onMcaUpload}
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || !submissionId || uploadMutation.isPending}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="mr-2 h-4 w-4" />
                    )}
                    Upload MCA document
                  </Button>
                  {mcaDocs.length > 0 ? (
                    <span className="text-sm text-emerald-700 dark:text-emerald-300">
                      {mcaDocs.length} document{mcaDocs.length === 1 ? '' : 's'} attached
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">No MCA documents yet</span>
                  )}
                </div>
              </div>
            ) : null}
          </InitialAssessmentSection12PanelShell>
        )
      })}
    </div>
  )
}

export function isConsentCapacitySection(sectionNumber: number): boolean {
  return sectionNumber === 2
}
