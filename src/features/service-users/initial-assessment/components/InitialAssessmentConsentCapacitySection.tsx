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
  questionsForConsentStep,
} from '@/features/service-users/initial-assessment/utils/consent-capacity-steps'
import {
  consentSelectedAnswer,
  hasLegalDecisionMaker,
  isCapacityInDoubt,
  understandingInDoubt,
} from '@/features/service-users/initial-assessment/utils/consent-capacity'
import {
  fieldKeyOf,
  findQuestionByFieldKey,
  isExplicitNo,
  specRefOf,
} from '@/features/service-users/initial-assessment/utils/question-lookup'
import { holisticTabRef } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
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
  /** Used to prefill the attorney's name from Personal Details. */
  onChange?: (questionId: string, patch: InitialAssessmentAnswerInput) => void
  /** Consent tab: questions in one plain list under the intro card (no panel headers / borders). */
  flat?: boolean
}

const RED_NOTE_CLASS =
  'mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
const AMBER_NOTE_CLASS = cn(IA_CALLOUT_AMBER_CLASS, 'mt-2 text-sm text-amber-950 dark:text-amber-100')


export function InitialAssessmentConsentCapacitySection({
  allSections,
  visibleQuestions,
  draftAnswers,
  disabled,
  serviceUserId,
  submissionId,
  renderField,
  onChange,
  flat = false,
}: Props) {
  const fileRef = React.useRef<HTMLInputElement>(null)

  const attachmentsQuery = useInitialAssessmentAttachments(serviceUserId, submissionId)
  const uploadMutation = useUploadInitialAssessmentAttachment(serviceUserId, submissionId ?? '')
  const mcaDocs = (attachmentsQuery.data ?? []).filter((a) => a.category === 'MCA_DOCUMENT')

  const consentQ = findQuestionByFieldKey(allSections, 'consentToAssessment')
  const consentRefused = Boolean(consentQ && isExplicitNo(draftAnswers[consentQ.id]))
  const capacityIssue = isCapacityInDoubt(allSections, draftAnswers)
  const showMcaUpload = capacityIssue || hasLegalDecisionMaker(allSections, draftAnswers)

  // Health & Welfare LPA chosen → the attorney's name starts from Personal Details' "LPA name", but only
  // when that LPA is a health (or health and finance) one — a finance attorney is never offered here.
  const legalAuthority = consentSelectedAnswer(allSections, draftAnswers, 'legalAuthority')
  const personalLpaType = consentSelectedAnswer(allSections, draftAnswers, 'lpoaAppointed')
  React.useEffect(() => {
    if (legalAuthority !== 'hw_lpa' || disabled || !onChange) return
    if (personalLpaType !== 'health' && personalLpaType !== 'both') return
    const nameQ = findQuestionByFieldKey(allSections, 'legalAuthorityName')
    const lpoaQ = findQuestionByFieldKey(allSections, 'lpoaName')
    const lpoaName = lpoaQ ? draftAnswers[lpoaQ.id]?.textValue?.trim() : undefined
    if (!nameQ || !lpoaName || draftAnswers[nameQ.id]?.textValue?.trim()) return
    onChange(nameQ.id, { questionId: nameQ.id, textValue: lpoaName })
  }, [legalAuthority, personalLpaType, disabled, onChange, allSections, draftAnswers])

  // Flat: one continuous list (no gap between the former panels) and the Yes/No card shells dropped, so
  // questions read as plain rows. Panels keep the section spacing and cards.
  const wrapSteps = (steps: React.ReactNode[]) =>
    flat ? (
      <div className="[&_.ia-yes-no-card]:rounded-none [&_.ia-yes-no-card]:border-0 [&_.ia-yes-no-card]:bg-transparent [&_.ia-yes-no-card]:px-0">
        {steps}
      </div>
    ) : (
      steps
    )

  /** Guidance shown right under the answer it is about. */
  const inlineNote = (q: InitialAssessmentQuestion): React.ReactNode => {
    const key = fieldKeyOf(q)
    if (key === 'understandsAssessmentInfo' && understandingInDoubt(allSections, draftAnswers)) {
      return (
        <p className={AMBER_NOTE_CLASS} role="status" data-testid="ia-consent-understanding-flag">
          Flag: a Mental Capacity Assessment may be needed — answer the capacity question below.
        </p>
      )
    }
    if (key === 'consentToAssessment' && consentRefused) {
      return capacityIssue ? (
        <p className={AMBER_NOTE_CLASS} role="status" data-testid="ia-consent-refused-capacity">
          Their refusal is recorded and must be considered. Because capacity is in doubt, complete the MCA
          for this decision ({holisticTabRef(3)}); if they lack capacity, record a best-interests decision
          (including their wishes and objection) or a covering legal authority. A manager will review it.
        </p>
      ) : (
        <p className={RED_NOTE_CLASS} role="alert" data-testid="ia-consent-refused">
          The service user does not consent — the assessment cannot be submitted.
        </p>
      )
    }
    if (key === 'capacityDoubt' && capacityIssue) {
      return (
        <p className={AMBER_NOTE_CLASS} role="status" data-testid="ia-capacity-doubt-mca">
          Complete MCA Screening ({holisticTabRef(3)}) and attach documentation before submit.
        </p>
      )
    }
    return null
  }

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
              Capacity is presumed. If there is reason to doubt it, complete the MCA and a best interest
              decision before submitting.
            </p>
          </div>
        </div>
      </div>

      {wrapSteps(CONSENT_CAPACITY_STEPS.map((step) => {
        const qs = questionsForConsentStep(visibleQuestions, step)
        if (qs.length === 0) return null
        const body = (
          <>
            {qs.map((q) => (
                <InitialAssessmentSection12FieldRow key={q.id}>
                  {renderField(q)}
                  {inlineNote(q)}
                </InitialAssessmentSection12FieldRow>
              ))}

            {/* On the Consent tab MCA / LPA papers only matter once capacity is in doubt or someone holds authority. */}
            {step.id === 'capacity' && (showMcaUpload || qs.some((q) => specRefOf(q) !== '2.4')) ? (
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
          </>
        )
        return flat ? (
          <div key={step.id} data-testid={`ia-consent-step-${step.id}`}>
            {body}
          </div>
        ) : (
          <InitialAssessmentSection12PanelShell
            key={step.id}
            title={step.title}
            hint={step.description}
            bodyVariant="content"
            testId={`ia-consent-step-${step.id}`}
          >
            {body}
          </InitialAssessmentSection12PanelShell>
        )
      }))}
    </div>
  )
}

export function isConsentCapacitySection(sectionNumber: number): boolean {
  return sectionNumber === 2
}
