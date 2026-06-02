import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

const GATE_COPY: Partial<Record<number, { lead: string; help?: string }>> = {
  7: {
    lead: 'If oral health and continence are satisfactory, answer Yes below — detail panels stay hidden.',
    help: 'Select Yes if oral health and continence are satisfactory.',
  },
  8: {
    lead: 'If communication and sensory needs are satisfactory, answer Yes below — detail panels stay hidden.',
    help: 'Select Yes if communication and sensory needs are satisfactory.',
  },
  10: {
    lead: 'If emotional health and cognition are satisfactory, answer Yes below — detail panels stay hidden.',
    help: 'Select Yes if emotional health and cognition are satisfactory.',
  },
}

export function noConcernGateLeadCopy(sectionNumber: number): string {
  return (
    GATE_COPY[sectionNumber]?.lead ??
    'If this section is satisfactory, answer Yes below — detail panels stay hidden.'
  )
}

export function noConcernGateHelpText(sectionNumber: number, question?: InitialAssessmentQuestion): string | undefined {
  return question?.helpText ?? GATE_COPY[sectionNumber]?.help
}

export function isNoConcernMasterQuestion(q: InitialAssessmentQuestion): boolean {
  return q.metadata?.noConcernMaster === true
}

export function isNoConcernGateGroup(specRef: string): boolean {
  return specRef === '7.0' || specRef === '8.0' || specRef === '10.0'
}
