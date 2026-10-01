import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import type { AdlWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import { FALLS_CASE_FINDING_FIELD_KEYS } from '@/features/service-users/initial-assessment/utils/falls-case-finding'
import type { MovingHandlingOperationsMetadata } from '@/features/service-users/initial-assessment/utils/moving-handling-operations'
import { computeMustScore, mustStepScoresEntered, type MustMetadata } from '@/features/service-users/initial-assessment/utils/must-scoring'
import {
  findQuestionByFieldKey,
  findQuestionByTextIncludes,
  isYesAnswer,
} from '@/features/service-users/initial-assessment/utils/question-lookup'
import {
  applySpecialistOverride,
  specialistRelevanceFromInputs,
  type SpecialistInputs,
  type SpecialistOverride,
  type SpecialistRelevance,
} from '@/features/service-users/initial-assessment/utils/specialist-relevance-rules'
import { movingHandlingUsesHoist } from '@/features/service-users/initial-assessment/utils/sync-hoist-from-moving-handling'
import { computeWaterlowScore, type WaterlowMetadata } from '@/features/service-users/initial-assessment/utils/waterlow-scoring'

export type SpecialistContext = {
  sections: InitialAssessmentSection[]
  answers: Record<string, InitialAssessmentAnswerInput>
  waterlow?: WaterlowMetadata
  mustAssessment?: MustMetadata
  adl?: AdlWorksheetMetadata
  movingHandlingOperations?: MovingHandlingOperationsMetadata
}

/** Stored in `metadata.tabRelevanceOverrides` (current) and `…History` (audit trail). */
export type SpecialistOverrides = Record<string, SpecialistOverride>

/**
 * Pull the Core IA screening answers the relevance rules need. fieldKey first, stable question text
 * as the fallback for older templates. Mirrors careflow-api `specialistInputsFromSubmission`.
 */
export function specialistInputsFromAssessment(ctx: SpecialistContext): SpecialistInputs {
  const { sections, answers } = ctx
  const q = (fieldKey: string, text?: string) =>
    findQuestionByFieldKey(sections, fieldKey) ?? (text ? findQuestionByTextIncludes(sections, text) : undefined)
  const yesNo = (fieldKey: string, text?: string): boolean | null => {
    const question = q(fieldKey, text)
    if (!question) return null
    const value = answers[question.id]
    if (isYesAnswer(value)) return true
    if (value?.checked === false || value?.booleanValue === false) return false
    return null
  }
  const selected = (fieldKey: string): string[] | null => {
    const question = q(fieldKey)
    const raw = question ? answers[question.id]?.selectedOptions : undefined
    if (Array.isArray(raw)) return raw.length ? raw.map(String) : null
    if (typeof raw === 'string' && raw.trim()) return [raw.trim()]
    return null
  }
  const single = (fieldKey: string): string | null => selected(fieldKey)?.[0] ?? null

  const hoistFromTasks = movingHandlingUsesHoist(ctx.movingHandlingOperations)
  const adlRows = ctx.adl?.rows
  const waterlowScore = computeWaterlowScore(ctx.waterlow)
  const k = FALLS_CASE_FINDING_FIELD_KEYS

  return {
    painConcerns: selected('painConcerns'),
    nutritionStatus: single('nutritionStatus'),
    appetiteStatus: selected('appetiteStatus'),
    unableToWeigh: yesNo('unableToWeigh'),
    swallowingConcerns: selected('swallowingConcerns'),
    capacityDoubt: yesNo('capacityDoubt'),
    understands: single('understandsAssessmentInfo'),
    covertMedication: yesNo('covertMedicationRequired'),
    mcaRequired: yesNo('mcaRequired', 'mca required'),
    dolRestrictions: selected('dolRestrictions'),
    dolConcern: single('dolConcern'),
    skinCondition: yesNo('skinCondition'),
    hasWounds: yesNo('hasWounds'),
    restrictedToBed: yesNo('restrictedToBed', 'restricted to bed'),
    usesHoist: hoistFromTasks !== undefined ? hoistFromTasks : yesNo('usesHoistOrSling'),
    independentAllTransfers: yesNo('independentAllTransfers', 'independent with all transfers'),
    bladder: selected('bladderContinenceOptions'),
    bowel: selected('bowelContinenceOptions'),
    diabetic: yesNo('serviceUserIsDiabetic'),
    mustScore: mustStepScoresEntered(ctx.mustAssessment) ? computeMustScore(ctx.mustAssessment) : null,
    waterlowScore: waterlowScore > 0 ? waterlowScore : null,
    adlScores: adlRows?.length ? Object.fromEntries(adlRows.map((r) => [r.id, Number(r.score) || 0])) : null,
    falls: {
      fallsLast12Months: yesNo(k.fallsLast12Months),
      unsteadiness: yesNo(k.unsteadiness),
      fearOfFalling: yesNo(k.fearOfFalling),
      clinicalConcern: yesNo(k.clinicalConcern),
    },
    furtherEquipment: yesNo('furtherEquipmentRequired'),
    fireRisks: yesNo('fireSafetyRisksIdentified'),
    smokeAlarmWorking: yesNo('smokeAlarmFittedWorking'),
    smoking: single('smokingStatus'),
    oxygen: yesNo('oxygenDependent'),
    hoarding: yesNo('hoardingRisk', 'hoarding or clutter risk'),
    infectionPrecautions: yesNo('infectionPrecautionsRequired'),
    bedRails: yesNo('bedRailsInUseOrConsidered'),
    canSelfEvacuate: yesNo('canSelfEvacuate'),
    acpOffered: single('acpDiscussionOffered'),
    eolRelevant: single('eolRelevant'),
  }
}

/** Relevance of one specialist tab (null for Core / finalisation tabs), with any override applied. */
export function specialistRelevance(
  tabId: number,
  ctx: SpecialistContext,
  overrides?: SpecialistOverrides,
  inputs: SpecialistInputs = specialistInputsFromAssessment(ctx),
): (SpecialistRelevance & { overridden?: SpecialistOverride; computed?: SpecialistRelevance }) | null {
  const computed = specialistRelevanceFromInputs(tabId, inputs)
  if (!computed) return null
  const applied = applySpecialistOverride(computed, overrides?.[String(tabId)])
  return { ...applied, computed }
}
