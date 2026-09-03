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

export const CONSENT_CAPACITY_STEPS: ConsentCapacityStep[] = [
  {
    id: 'consent',
    title: 'Consent',
    description: 'Assessment and care consent must be recorded before proceeding.',
    specRefs: ['2.1', '2.2'],
  },
  {
    id: 'understanding',
    title: 'Understanding',
    description: 'Confirm information was explained in an accessible way.',
    specRefs: ['2.3'],
  },
  {
    id: 'capacity',
    title: 'Capacity & MCA',
    description: 'Capacity assessment, MCA requirement, best interest and representatives.',
    specRefs: ['2.4', '2.5', '2.6', '2.7'],
  },
  {
    id: 'sharing',
    title: 'Information sharing',
    description: 'GP, family, pharmacy and local authority sharing consent.',
    specRefs: ['2.8'],
  },
  {
    id: 'dols',
    title: 'DoLS / LPS',
    description: 'Record whether a DoLS or LPS authorisation is in place. Certificates stay in the document store.',
    specRefs: ['2.9'],
  },
]

/** Spec-ref subtitles for step nav (e.g. `2.1 Consent to assessment · 2.2 Consent to receive care`). */
export function consentStepSpecRefsLabel(step: ConsentCapacityStep): string {
  return step.specRefs.map(specRefLabel).join(' · ')
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
