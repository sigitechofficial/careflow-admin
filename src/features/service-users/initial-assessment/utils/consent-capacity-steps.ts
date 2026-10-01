import { isAnsweredForStep } from '@/features/service-users/initial-assessment/utils/consent-capacity-status'
import { specRefLabel } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
} from '@/features/service-users/initial-assessment/types'

export type ConsentCapacityStep = {
  id: string
  title: string
  description: string
  specRefs: string[]
}

/**
 * Consent tab panels, in the order staff ask the questions (questions inside a panel follow sortOrder).
 * `capacity` also carries the MCA-tab refs (2.5–2.7) and `care-consent` the sign-off tab's §2.2.
 */
export const CONSENT_CAPACITY_STEPS: ConsentCapacityStep[] = [
  {
    id: 'understanding',
    title: 'Understanding and consent',
    description: 'Explain the purpose, check understanding, then record consent and any communication support.',
    specRefs: ['2.3', '2.1'],
  },
  {
    id: 'sharing',
    title: 'Involvement and information sharing',
    description: 'Family or representative involvement, who information can be shared with, and anything they refuse.',
    specRefs: ['2.8', '2.11'],
  },
  {
    id: 'capacity',
    title: 'Mental capacity',
    description: 'Capacity is presumed — record any reason to doubt it and anyone legally authorised to decide.',
    specRefs: ['2.4', '2.5', '2.6', '2.7'],
  },
  {
    id: 'restrictions',
    title: 'Restrictions and record',
    description: 'Consent restrictions or preferences to follow, and who recorded consent.',
    specRefs: ['2.12'],
  },
  {
    id: 'care-consent',
    title: 'Consent to receive care',
    description: 'Consent to the proposed care, agreed at sign-off.',
    specRefs: ['2.2'],
  },
  {
    id: 'dols',
    title: 'Deprivation of liberty',
    description:
      'Restrictions recorded in the Core assessment → could they amount to a deprivation of liberty? → manager / legal review → legal route and status. Never decided here.',
    specRefs: ['2.9'],
  },
]

/**
 * Spec-ref subtitles for step nav (e.g. `2.1 Consent to assessment · 2.2 Consent to receive care`).
 * Pass the step's shown questions to list only the refs rendered on this tab.
 */
export function consentStepSpecRefsLabel(
  step: ConsentCapacityStep,
  shownQuestions?: InitialAssessmentQuestion[],
): string {
  const shown = shownQuestions
    ? new Set(shownQuestions.map((q) => q.metadata?.specRef).filter((r): r is string => typeof r === 'string'))
    : null
  const refs = shown ? step.specRefs.filter((ref) => shown.has(ref)) : step.specRefs
  return refs.map(specRefLabel).join(' · ')
}

export function questionsForConsentStep(
  questions: InitialAssessmentQuestion[],
  step: ConsentCapacityStep,
): InitialAssessmentQuestion[] {
  const refs = new Set(step.specRefs)
  return questions.filter((q) => {
    const ref = q.metadata?.specRef
    return typeof ref === 'string' && refs.has(ref)
  })
}

export function stepStatus(
  questions: InitialAssessmentQuestion[],
  draftAnswers: Record<string, InitialAssessmentAnswerInput>,
): 'complete' | 'partial' | 'empty' {
  if (questions.length === 0) return 'empty'
  const answered = questions.filter((q) => isAnsweredForStep(q, draftAnswers[q.id])).length
  if (answered === 0) return 'empty'
  if (answered === questions.length) return 'complete'
  return 'partial'
}
