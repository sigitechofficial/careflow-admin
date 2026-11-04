/**
 * Read-only "Assessment summary" (Finalisation → outcome summary tab): the key findings of the whole
 * IA in one place, built from answers already given. Nothing here is typed by the assessor.
 */
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  findQuestionByFieldKey,
  isExplicitNo,
  isYesAnswer,
} from '@/features/service-users/initial-assessment/utils/question-lookup'
import { labelForQuestionOptionValue } from '@/features/service-users/initial-assessment/utils/question-options'
import { iaQuestionLabel } from '@/features/service-users/initial-assessment/utils/holistic-assessment-labels'
import {
  isCapacityDecisionComplete,
  type CapacityDecisionRecord,
} from '@/features/service-users/initial-assessment/utils/capacity-decisions'
import type { SpecialistStatus } from '@/features/service-users/initial-assessment/utils/specialist-relevance-rules'

type Answers = Record<string, InitialAssessmentAnswerInput>

export type SummaryTone = 'danger' | 'warn' | 'ok' | 'neutral'
export type SummaryItem = { label: string; value: string; tone: SummaryTone }
export type SpecialistSummaryRow = { tabId: number; title: string; status: SpecialistStatus; completed: boolean }

export type AssessmentSummary = {
  specialists: SpecialistSummaryRow[]
  items: SummaryItem[]
  risks: string[]
  goals: string[]
  conditions: string[]
}

export type AssessmentSummaryInput = {
  sections: InitialAssessmentSection[]
  answers: Answers
  specialists: SpecialistSummaryRow[]
  capacityDecisions: CapacityDecisionRecord[]
  goals: string[]
  conditions: string[]
}

const NOT_ANSWERED = 'Not answered'

function selected(sections: InitialAssessmentSection[], answers: Answers, fieldKey: string): string[] {
  const q = findQuestionByFieldKey(sections, fieldKey)
  const raw = q ? answers[q.id]?.selectedOptions : undefined
  if (Array.isArray(raw)) return raw.map(String)
  return typeof raw === 'string' && raw ? [raw] : []
}

function optionLabels(sections: InitialAssessmentSection[], answers: Answers, fieldKey: string): string[] {
  const q = findQuestionByFieldKey(sections, fieldKey)
  if (!q) return []
  return selected(sections, answers, fieldKey).map((v) => labelForQuestionOptionValue(v, q))
}

function yesNo(sections: InitialAssessmentSection[], answers: Answers, fieldKey: string): boolean | null {
  const q = findQuestionByFieldKey(sections, fieldKey)
  if (!q) return null
  const a = answers[q.id]
  if (isYesAnswer(a)) return true
  if (isExplicitNo(a)) return false
  return null
}

export function buildAssessmentSummary(input: AssessmentSummaryInput): AssessmentSummary {
  const { sections, answers } = input
  const items: SummaryItem[] = []
  const yn = (key: string) => yesNo(sections, answers, key)

  const consent = yn('consentToAssessment')
  items.push({
    label: 'Consent to this assessment',
    value: consent === true ? 'Given' : consent === false ? 'Refused' : NOT_ANSWERED,
    tone: consent === true ? 'ok' : consent === false ? 'danger' : 'neutral',
  })
  const care = yn('consentToCare')
  items.push({
    label: 'Consent to receive care',
    value: care === true ? 'Given' : care === false ? 'Refused' : NOT_ANSWERED,
    tone: care === true ? 'ok' : care === false ? 'danger' : 'neutral',
  })

  const doubt = yn('capacityDoubt')
  const complete = input.capacityDecisions.filter(isCapacityDecisionComplete)
  const lacking = complete.filter((d) => d.outcome === 'lacks_capacity').length
  items.push({
    label: 'Mental capacity',
    value:
      doubt === true
        ? `Reason to doubt recorded — ${complete.length} decision${complete.length === 1 ? '' : 's'} assessed${lacking ? `, lacks capacity for ${lacking}` : ''}`
        : doubt === false
          ? 'Presumed — no reason to doubt'
          : NOT_ANSWERED,
    tone: doubt === true ? (complete.length ? 'warn' : 'danger') : doubt === false ? 'ok' : 'neutral',
  })

  const authority = optionLabels(sections, answers, 'legalAuthority')
  items.push({
    label: 'Legal authority',
    value: authority.length ? authority.join(', ') : NOT_ANSWERED,
    tone: 'neutral',
  })

  const restrictions = selected(sections, answers, 'dolRestrictions')
  const restrictionLabels = optionLabels(sections, answers, 'dolRestrictions').filter(
    (_, i) => restrictions[i] !== 'none',
  )
  const dolStatus = optionLabels(sections, answers, 'dolAuthorisationStatus')
  items.push({
    label: 'Restrictions / deprivation of liberty',
    value: restrictions.length
      ? restrictionLabels.length
        ? `${restrictionLabels.join('; ')}${dolStatus.length ? ` — ${dolStatus[0]}` : ''}`
        : 'No restrictions'
      : NOT_ANSWERED,
    tone: restrictionLabels.length ? 'warn' : restrictions.length ? 'ok' : 'neutral',
  })

  const onMeds = yn('takingPrescribedMedication')
  const support = optionLabels(sections, answers, 'medicationSupportLevel')
  items.push({
    label: 'Medication support',
    value: onMeds === false ? 'No prescribed medication' : support[0] ?? (onMeds ? 'Support level not recorded' : NOT_ANSWERED),
    tone: 'neutral',
  })

  const dnacpr = yn('dnacprRespectInPlace')
  items.push({
    label: 'DNACPR / ReSPECT',
    value:
      dnacpr === true
        ? 'Reported in the assessment — the office must see the original'
        : dnacpr === false
          ? 'None reported'
          : NOT_ANSWERED,
    tone: dnacpr === true ? 'warn' : 'neutral',
  })

  const eol = optionLabels(sections, answers, 'eolRelevant')
  items.push({ label: 'Palliative / end of life', value: eol[0] ?? NOT_ANSWERED, tone: 'neutral' })

  // Answers flagged as a risk (Yes on a risk question).
  const risks: string[] = []
  for (const sec of sections) {
    for (const q of sec.questions) {
      if (!q.riskFlag || !isYesAnswer(answers[q.id])) continue
      const label = iaQuestionLabel(q)
      if (!risks.includes(label)) risks.push(label)
    }
  }

  return {
    specialists: input.specialists,
    items,
    risks,
    goals: input.goals.filter((g) => g.trim()),
    conditions: input.conditions.filter((c) => c.trim()),
  }
}
