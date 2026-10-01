/**
 * Display only: which Core answers make a specialist assessment Required, so the question can say
 * "Falls Screening is now required (Tab 13)". Mirrors the `required(...)` branches of
 * specialist-relevance-rules.ts — the rules stay the source of truth; a note only shows while the
 * tab's current status (after any override) is Required.
 */
import * as React from 'react'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  findQuestionByFieldKey,
  findQuestionByTextIncludes,
  isYesAnswer,
} from '@/features/service-users/initial-assessment/utils/question-lookup'
import { FALLS_CASE_FINDING_FIELD_KEYS } from '@/features/service-users/initial-assessment/utils/falls-case-finding'
import {
  SPECIALIST_TAB_IDS as T,
  type SpecialistStatus,
} from '@/features/service-users/initial-assessment/utils/specialist-relevance-rules'
import { holisticTabById, holisticTabRef } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'

type Answer = InitialAssessmentAnswerInput | undefined

const yes = (a: Answer) => isYesAnswer(a)
const no = (a: Answer) => a?.checked === false || a?.booleanValue === false
const selectedValues = (a: Answer): string[] => {
  const raw = a?.selectedOptions
  if (Array.isArray(raw)) return raw.map(String)
  return typeof raw === 'string' && raw ? [raw] : []
}
const anyOf = (...values: string[]) => (a: Answer) => selectedValues(a).some((v) => values.includes(v))

const PAIN_REQUIRED = [
  'mild_movement',
  'moderate_movement',
  'severe_movement',
  'mild_rest',
  'moderate_rest',
  'severe_rest',
  'unable_to_self_report',
  'gp_review_requested',
]

type Trigger = { tabId: number; fieldKey: string; text?: string; fires: (a: Answer) => boolean }

export const SPECIALIST_QUESTION_TRIGGERS: readonly Trigger[] = [
  { tabId: T.pain, fieldKey: 'painConcerns', fires: anyOf(...PAIN_REQUIRED) },
  { tabId: T.falls, fieldKey: FALLS_CASE_FINDING_FIELD_KEYS.fallsLast12Months, fires: yes },
  { tabId: T.falls, fieldKey: FALLS_CASE_FINDING_FIELD_KEYS.unsteadiness, fires: yes },
  { tabId: T.must, fieldKey: 'nutritionStatus', fires: anyOf('malnourished', 'severely_malnourished') },
  { tabId: T.mca, fieldKey: 'capacityDoubt', fires: yes },
  { tabId: T.mca, fieldKey: 'covertMedicationRequired', fires: yes },
  { tabId: T.mca, fieldKey: 'dolRestrictions', fires: (a) => selectedValues(a).some((v) => v !== 'none') },
  { tabId: T.mca, fieldKey: 'dolConcern', fires: anyOf('yes', 'unsure') },
  { tabId: T.mcaChecklist, fieldKey: 'mcaRequired', text: 'mca required', fires: yes },
  { tabId: T.skin, fieldKey: 'skinCondition', fires: yes },
  { tabId: T.skin, fieldKey: 'hasWounds', fires: yes },
  { tabId: T.waterlow, fieldKey: 'restrictedToBed', text: 'restricted to bed', fires: yes },
  { tabId: T.waterlow, fieldKey: 'usesHoistOrSling', fires: yes },
  { tabId: T.waterlow, fieldKey: 'hasWounds', fires: yes },
  { tabId: T.waterlow, fieldKey: 'skinCondition', fires: yes },
  { tabId: T.movingHandling, fieldKey: 'restrictedToBed', text: 'restricted to bed', fires: yes },
  { tabId: T.movingHandling, fieldKey: 'usesHoistOrSling', fires: yes },
  {
    tabId: T.movingHandling,
    fieldKey: 'independentAllTransfers',
    text: 'independent with all transfers',
    fires: no,
  },
  { tabId: T.equipment, fieldKey: 'hasWounds', fires: yes },
  { tabId: T.fire, fieldKey: 'fireSafetyRisksIdentified', fires: yes },
  { tabId: T.fire, fieldKey: 'smokeAlarmFittedWorking', fires: no },
  { tabId: T.fire, fieldKey: 'smokingStatus', fires: anyOf('current_smoker', 'vapes') },
  { tabId: T.fire, fieldKey: 'oxygenDependent', fires: yes },
  { tabId: T.fire, fieldKey: 'hoardingRisk', text: 'hoarding or clutter risk', fires: yes },
  { tabId: T.infection, fieldKey: 'infectionPrecautionsRequired', fires: yes },
  { tabId: T.bedRails, fieldKey: 'bedRailsInUseOrConsidered', fires: yes },
  { tabId: T.peep, fieldKey: 'canSelfEvacuate', fires: no },
  { tabId: T.acp, fieldKey: 'acpDiscussionOffered', fires: anyOf('yes_now') },
  { tabId: T.eol, fieldKey: 'eolRelevant', fires: anyOf('yes') },
]

/** questionId → "<Assessment> is now required (Tab n)" lines, for Required tabs only. */
export function specialistTriggerNotes(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
  statusByTab: ReadonlyMap<number, SpecialistStatus>,
): Map<string, string[]> {
  const notes = new Map<string, string[]>()
  for (const t of SPECIALIST_QUESTION_TRIGGERS) {
    if (statusByTab.get(t.tabId) !== 'required') continue
    const q =
      findQuestionByFieldKey(sections, t.fieldKey) ?? (t.text ? findQuestionByTextIncludes(sections, t.text) : undefined)
    if (!q || !t.fires(answers[q.id])) continue
    const title = holisticTabById(t.tabId)?.title ?? 'Specialist assessment'
    const line = `${title} is now required (${holisticTabRef(t.tabId)})`
    const list = notes.get(q.id) ?? []
    if (!list.includes(line)) list.push(line)
    notes.set(q.id, list)
  }
  return notes
}

export const SpecialistTriggerNotesContext = React.createContext<ReadonlyMap<string, string[]>>(new Map())
