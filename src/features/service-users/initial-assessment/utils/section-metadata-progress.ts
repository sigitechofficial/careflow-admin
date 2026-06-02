import { isAdlWorksheetComplete, type AdlWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import type {
  DailyLivingAidsMetadata,
  EquipmentChecklistMetadata,
  FinanceSupportMetadata,
  PracticalCareTasksMetadata,
  TransferMatrixMetadata,
} from '@/features/service-users/initial-assessment/utils/mobility-metadata'
import { isWaterlowScoringComplete } from '@/features/service-users/initial-assessment/utils/waterlow-questions'
import type { WaterlowMetadata } from '@/features/service-users/initial-assessment/utils/waterlow-scoring'

export type MetadataProgressSlot = { answered: number; total: number; requiredAnswered?: number; requiredTotal?: number }

function boolAnswered(value: boolean | null | undefined): boolean {
  return value === true || value === false
}

/** Non-template assessor work shown in custom panels (§11 Waterlow tab, §12 metadata). */
export function sectionMetadataProgress(params: {
  sectionNumber: number
  waterlow?: WaterlowMetadata
  adl?: AdlWorksheetMetadata
  transfers?: TransferMatrixMetadata
  equipmentChecklist?: EquipmentChecklistMetadata
  equipmentChecklistVisible?: boolean
  dailyLivingAids?: DailyLivingAidsMetadata
  financeSupport?: FinanceSupportMetadata
  financeSupportVisible?: boolean
  practicalCare?: PracticalCareTasksMetadata
}): MetadataProgressSlot {
  const { sectionNumber } = params
  if (sectionNumber === 11) {
    const complete = isWaterlowScoringComplete(params.waterlow)
    return { answered: complete ? 1 : 0, total: 1, requiredAnswered: complete ? 1 : 0, requiredTotal: 0 }
  }

  if (sectionNumber !== 12) {
    return { answered: 0, total: 0 }
  }

  let answered = 0
  let total = 0
  let requiredAnswered = 0
  let requiredTotal = 0

  const adlComplete = isAdlWorksheetComplete(params.adl?.rows)
  total += 1
  if (adlComplete) answered += 1

  const transferRows = params.transfers?.rows ?? []
  const transferTotal = transferRows.length + 1
  total += transferTotal
  const transferAnswered =
    transferRows.filter((r) => r.level != null && !Number.isNaN(r.level)).length +
    (boolAnswered(params.transfers?.independentWithAll) ? 1 : 0)
  answered += transferAnswered

  const dl = params.dailyLivingAids
  const dlFields: (boolean | null | undefined)[] = [
    dl?.aidsInUseOrRequired,
    dl?.furtherEquipmentRequired,
    dl?.equipmentOrdered,
  ]
  total += dlFields.length
  answered += dlFields.filter(boolAnswered).length

  if (params.equipmentChecklistVisible) {
    const eq = params.equipmentChecklist
    const eqFields: (boolean | null | undefined)[] = [
      eq?.hoistServiced,
      eq?.profilingBedServiced,
      eq?.staffTrainingCoversHoist,
      eq?.otGuidanceRequired,
    ]
    total += eqFields.length
    answered += eqFields.filter(boolAnswered).length
  }

  if (params.financeSupportVisible) {
    total += 1
    requiredTotal += 1
    const financeStarted =
      Boolean(params.financeSupport?.supportTypes?.length) ||
      boolAnswered(params.financeSupport?.staffHandleCash) ||
      Boolean(params.financeSupport?.details?.trim())
    if (financeStarted) {
      answered += 1
      requiredAnswered += 1
    }
  }

  const practicalFields: (keyof PracticalCareTasksMetadata)[] = [
    'laundry',
    'cleaning',
    'shopping',
    'financeAssistance',
    'otherComment',
  ]
  total += practicalFields.length
  answered += practicalFields.filter((k) => {
    const v = params.practicalCare?.[k]
    return typeof v === 'string' && Boolean(v.trim())
  }).length

  total += 1
  if (boolAnswered(params.adl?.fallsAssessmentCompleted)) answered += 1
  if (params.adl?.fallsAssessmentCompleted === true) {
    total += 1
    if (params.adl.fallsAssessmentDate?.trim()) answered += 1
  }

  return { answered, total, requiredAnswered, requiredTotal }
}
