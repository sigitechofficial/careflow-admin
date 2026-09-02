import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  sectionMetadataProgress,
  type MetadataProgressSlot,
} from '@/features/service-users/initial-assessment/utils/section-metadata-progress'
import {
  getVisibleSectionQuestions,
  type VisibleQuestionsOptions,
} from '@/features/service-users/initial-assessment/utils/visible-section-questions'
import { multiSelectHasAnswer } from '@/features/service-users/initial-assessment/utils/preferred-visit-times'
import { hasTextAnswerValue, isSecureQuestion } from '@/features/service-users/initial-assessment/utils/secure-field'
import type { AdlWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import type {
  DailyLivingAidsMetadata,
  EquipmentChecklistMetadata,
  FinanceSupportMetadata,
  PracticalCareTasksMetadata,
  TransferMatrixMetadata,
} from '@/features/service-users/initial-assessment/utils/mobility-metadata'
import type { WaterlowMetadata } from '@/features/service-users/initial-assessment/utils/waterlow-scoring'

export type SectionProgressContext = VisibleQuestionsOptions & {
  waterlow?: WaterlowMetadata
  adl?: AdlWorksheetMetadata
  transfers?: TransferMatrixMetadata
  equipmentChecklist?: EquipmentChecklistMetadata
  equipmentChecklistVisible?: boolean
  dailyLivingAids?: DailyLivingAidsMetadata
  financeSupport?: FinanceSupportMetadata
  practicalCare?: PracticalCareTasksMetadata
}

export type SectionProgressResult = {
  answered: number
  total: number
  requiredAnswered: number
  requiredTotal: number
  percent: number
}

/**
 * Optional invented measurements (MUST/Waterlow/MUAC) and optional secure codes are
 * not IA completeness slots — the QA generator correctly leaves them blank.
 * Required fields always count.
 */
const INVENTED_MEASUREMENT_FIELD_KEYS = new Set(['weightKg', 'muacCm', 'muacNutritionalRisk'])
const INVENTED_MEASUREMENT_TEXT = [
  'bmi value',
  'must score',
  'amt score',
  'weight (kg)',
  'mid upper arm circumference',
  'muac nutritional risk',
]

export function questionCountsTowardCompleteness(q: InitialAssessmentQuestion): boolean {
  if (q.isRequired) return true
  if (q.metadata?.completenessExempt === true) return false
  const key = typeof q.metadata?.fieldKey === 'string' ? q.metadata.fieldKey : ''
  if (INVENTED_MEASUREMENT_FIELD_KEYS.has(key)) return false
  const text = q.questionText.trim().toLowerCase()
  if (INVENTED_MEASUREMENT_TEXT.some((needle) => text === needle || text.startsWith(needle))) {
    return false
  }
  if (isSecureQuestion(q)) return false
  return true
}

function isAnswered(q: InitialAssessmentQuestion, value: InitialAssessmentAnswerInput | undefined): boolean {
  if (!value) return false
  if (q.questionType === 'CHECKBOX' || q.questionType === 'YES_NO') {
    if (value.checked === true || value.checked === false) return true
    if (value.booleanValue === true || value.booleanValue === false) return true
    return false
  }
  if (q.questionType === 'NUMBER') {
    return value.numberValue != null && !Number.isNaN(value.numberValue)
  }
  if (q.questionType === 'DATE') {
    return Boolean(value.dateValue?.trim())
  }
  if (q.questionType === 'MULTI_SELECT') {
    return multiSelectHasAnswer(value, q)
  }
  if (q.questionType === 'SINGLE_SELECT') {
    const opts = value.selectedOptions
    if (Array.isArray(opts)) return opts.length > 0
    if (typeof opts === 'string') return opts.length > 0
    return opts != null
  }
  return hasTextAnswerValue(value)
}

function mergeSlots(
  questions: InitialAssessmentQuestion[],
  answers: Record<string, InitialAssessmentAnswerInput>,
  meta: MetadataProgressSlot,
): SectionProgressResult {
  const counted = questions.filter(questionCountsTowardCompleteness)
  const required = counted.filter((q) => q.isRequired)
  const answered = counted.filter((q) => isAnswered(q, answers[q.id])).length
  const requiredAnswered = required.filter((q) => isAnswered(q, answers[q.id])).length
  const total = counted.length + meta.total
  const requiredTotal = required.length + (meta.requiredTotal ?? 0)
  const mergedAnswered = answered + meta.answered
  const mergedRequiredAnswered = requiredAnswered + (meta.requiredAnswered ?? 0)
  const percent = total === 0 ? 0 : Math.round((mergedAnswered / total) * 100)
  return {
    answered: mergedAnswered,
    total,
    requiredAnswered: mergedRequiredAnswered,
    requiredTotal,
    percent,
  }
}

export function sectionProgress(
  section: InitialAssessmentSection,
  answers: Record<string, InitialAssessmentAnswerInput>,
  allSections?: InitialAssessmentSection[],
  context?: SectionProgressContext,
): SectionProgressResult {
  const questions =
    allSections != null
      ? getVisibleSectionQuestions(section, allSections, answers, context)
      : section.questions.filter((q) => !context?.hubTabExcludedIds?.has(q.id))

  const meta =
    allSections != null
      ? sectionMetadataProgress({
          sectionNumber: section.sectionNumber,
          waterlow: context?.waterlow,
          adl: context?.adl,
          transfers: context?.transfers,
          equipmentChecklist: context?.equipmentChecklist,
          equipmentChecklistVisible: context?.equipmentChecklistVisible,
          dailyLivingAids: context?.dailyLivingAids,
          financeSupport: context?.financeSupport,
          financeSupportVisible: context?.financeSupportVisible,
          practicalCare: context?.practicalCare,
        })
      : { answered: 0, total: 0 }

  return mergeSlots(questions, answers, meta)
}

/** Side-nav label — counts match on-screen assessor fields, not raw template rows. */
export function formatSectionNavMeta(prog: SectionProgressResult): string {
  if (prog.total === 0) return 'No fields'
  const parts = [`${prog.answered}/${prog.total} fields`]
  const reqLeft = prog.requiredTotal - prog.requiredAnswered
  if (reqLeft > 0) parts.push(`${reqLeft} required`)
  return parts.join(' · ')
}

export function overallAssessmentProgress(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
  context?: Omit<SectionProgressContext, 'financeConsentQuestion'> & {
    financeConsentQuestion?: SectionProgressContext['financeConsentQuestion']
  },
): number {
  if (sections.length === 0) return 0
  const percents = sections.map((s) => sectionProgress(s, answers, sections, context).percent)
  return Math.round(percents.reduce((a, b) => a + b, 0) / percents.length)
}
