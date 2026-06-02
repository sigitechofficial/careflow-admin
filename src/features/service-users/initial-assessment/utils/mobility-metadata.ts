import { ADL_LEVELS } from '@/features/service-users/initial-assessment/utils/submission-metadata'

export type TransferMatrixRow = {
  id: string
  label: string
  level: number | null
}

export const TRANSFER_MATRIX_ROWS: { id: string; label: string }[] = [
  { id: 'bedToChair', label: 'Bed to chair' },
  { id: 'chairToBed', label: 'Chair to bed' },
  { id: 'commodeToChair', label: 'Commode to chair' },
  { id: 'commodeToBed', label: 'Commode to bed' },
  { id: 'commodeToShower', label: 'Commode/chair to shower' },
  { id: 'commodeToBath', label: 'Commode/chair to bath' },
]

export type TransferMatrixMetadata = {
  rows?: TransferMatrixRow[]
  independentWithAll?: boolean
  comments?: string
}

export type FinanceSupportMetadata = {
  required?: boolean
  supportTypes?: string[]
  staffHandleCash?: boolean
  maxCashAmount?: number | null
  receiptRequired?: boolean
  familyInvolved?: boolean
  consentRecorded?: boolean
  managerApprovalRequired?: boolean
  financialRiskIdentified?: boolean
  safeguardingConcern?: boolean
  details?: string
}

export type EquipmentChecklistMetadata = {
  hoistServiced?: boolean | null
  profilingBedServiced?: boolean | null
  staffTrainingCoversHoist?: boolean | null
  otGuidanceRequired?: boolean | null
  comments?: string
}

/** Paper §12.9 — aids to support daily living (distinct from mobility aids §12.8). */
export type DailyLivingAidsMetadata = {
  aidsInUseOrRequired?: boolean | null
  aidsList?: string
  furtherEquipmentRequired?: boolean | null
  furtherEquipmentDetails?: string
  equipmentOrdered?: boolean | null
  equipmentOrderedDate?: string | null
  additionalComments?: string
}

/** Paper §12.11 — practical care task assistance notes. */
export type PracticalCareTasksMetadata = {
  laundry?: string
  cleaning?: string
  shopping?: string
  financeAssistance?: string
  otherComment?: string
}

export const FINANCE_SUPPORT_TYPES = [
  { value: 'pension', label: 'Collecting pension' },
  { value: 'bills', label: 'Paying bills' },
  { value: 'cash', label: 'Handling cash' },
  { value: 'shopping', label: 'Shopping money' },
  { value: 'banking', label: 'Banking support' },
  { value: 'receipts', label: 'Managing receipts' },
  { value: 'other', label: 'Other' },
] as const

export function defaultTransferMatrixRows(): TransferMatrixRow[] {
  return TRANSFER_MATRIX_ROWS.map((r) => ({ ...r, level: null }))
}

export function normalizeTransferMatrix(value: TransferMatrixMetadata | undefined): TransferMatrixRow[] {
  const existing = value?.rows ?? []
  return TRANSFER_MATRIX_ROWS.map((r) => {
    const row = existing.find((x) => x.id === r.id)
    return row ?? { ...r, level: null }
  })
}

export function transferLevelLabel(level: number | null): string {
  if (level == null) return 'N/A'
  return ADL_LEVELS[level]?.replace(/\s*\(\d+\)/, '') ?? String(level)
}

export function parseMobilityMetadata(meta: Record<string, unknown>) {
  const transfers: TransferMatrixMetadata =
    meta.transfers && typeof meta.transfers === 'object'
      ? (meta.transfers as TransferMatrixMetadata)
      : {}
  const financeSupport: FinanceSupportMetadata =
    meta.financeSupport && typeof meta.financeSupport === 'object'
      ? (meta.financeSupport as FinanceSupportMetadata)
      : {}
  const equipmentChecklist: EquipmentChecklistMetadata =
    meta.equipmentChecklist && typeof meta.equipmentChecklist === 'object'
      ? (meta.equipmentChecklist as EquipmentChecklistMetadata)
      : {}
  const dailyLivingAids: DailyLivingAidsMetadata =
    meta.dailyLivingAids && typeof meta.dailyLivingAids === 'object'
      ? (meta.dailyLivingAids as DailyLivingAidsMetadata)
      : {}
  const practicalCare: PracticalCareTasksMetadata =
    meta.practicalCare && typeof meta.practicalCare === 'object'
      ? (meta.practicalCare as PracticalCareTasksMetadata)
      : {}

  const approvedForCareStart = meta.approvedForCareStart === true
  const careStartConditions =
    typeof meta.careStartConditions === 'string' ? meta.careStartConditions : null
  const careActivationBlocked = meta.careActivationBlocked === true

  return {
    transfers,
    financeSupport,
    equipmentChecklist,
    dailyLivingAids,
    practicalCare,
    approvedForCareStart,
    careStartConditions,
    careActivationBlocked,
  }
}
