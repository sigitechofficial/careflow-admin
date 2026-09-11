import type { InitialAssessmentRiskRecord } from '@/features/service-users/initial-assessment/types'
import {
  findOpenIaRisks,
  supportingInfoFromIaRisk,
} from '@/features/alerts/medical-safety/medical-alert-suggestions'

/**
 * Catalogue codes that can be suggested from existing CareFlow sources
 * (IA risks / clinical falls / legal DoLS). User still confirms by ticking/saving.
 */
export type SuggestedConditionCode =
  | 'HIGH_RISK_FALLS'
  | 'CHOKING_RISK'
  | 'NUTRITION_HYDRATION'
  | 'DYSPHAGIA'
  | 'COMMUNITY_DOLS'
  | 'DIABETES'
  | 'COPD'
  | 'PALLIATIVE_CARE'

export type ConditionSuggestionInput = {
  iaRiskRecords?: InitialAssessmentRiskRecord[] | null
  iaRisksReady?: boolean
  /** From IA clinical summary when available. */
  fallsLast12Months?: boolean | null
  /** Explicit DoLS authorisation rows on legal documents. */
  hasDolsRecord?: boolean
  /** Active condition codes already saved (exclude from "suggested"). */
  alreadyActiveCodes?: Iterable<string>
}

/**
 * Returns catalogue condition codes suggested from IA / legal evidence.
 * Does not invent codes from empty or question-only risks.
 */
export function suggestConditionCodesFromSources(
  input: ConditionSuggestionInput,
): SuggestedConditionCode[] {
  const suggested = new Set<SuggestedConditionCode>()
  const already = new Set(
    [...(input.alreadyActiveCodes ?? [])].map((c) => c.trim().toUpperCase()).filter(Boolean),
  )

  const add = (code: SuggestedConditionCode) => {
    if (!already.has(code)) suggested.add(code)
  }

  if (input.iaRisksReady) {
    const records = input.iaRiskRecords ?? []
    for (const r of findOpenIaRisks(records, ['FALLS'])) {
      if (supportingInfoFromIaRisk(r)) add('HIGH_RISK_FALLS')
    }
    for (const r of findOpenIaRisks(records, ['CHOKING'])) {
      if (supportingInfoFromIaRisk(r)) {
        add('CHOKING_RISK')
        add('DYSPHAGIA')
      }
    }
    for (const r of findOpenIaRisks(records, ['NUTRITION', 'HYDRATION'])) {
      if (supportingInfoFromIaRisk(r)) add('NUTRITION_HYDRATION')
    }
  }

  if (input.fallsLast12Months === true) add('HIGH_RISK_FALLS')
  if (input.hasDolsRecord) add('COMMUNITY_DOLS')

  return [...suggested]
}

/** Care-plan form names surfaced after saving related medical conditions. */
export const CONDITION_CARE_PLAN_HINTS: Partial<Record<string, string>> = {
  HIGH_RISK_FALLS: 'Falls',
  CHOKING_RISK: 'Eating and Drinking',
  DYSPHAGIA: 'Eating and Drinking',
  NUTRITION_HYDRATION: 'Eating and Drinking',
  POOR_EATING_DRINKING: 'Eating and Drinking',
  EATING_DISORDER: 'Eating and Drinking',
  DIABETES: 'Medication',
  MEDICATION: 'Medication',
  MEDICATION_BY_CARER: 'Medication',
  PRN_MEDICATIONS: 'Medication',
  PROMPT_ASSIST_MEDICATION: 'Medication',
  CRUSH_MEDICATION: 'Medication',
  COPD: 'Physical Health',
  ASTHMA: 'Physical Health',
  RESPIRATORY_DISEASE: 'Physical Health',
  DEMENTIA: 'Dementia Care plan',
  COMMUNICATION_NEEDS: 'Communication',
  COMMUNITY_DOLS: 'Personal Safety',
  PALLIATIVE_CARE: 'Final Days',
  END_OF_LIFE: 'Final Days',
}
