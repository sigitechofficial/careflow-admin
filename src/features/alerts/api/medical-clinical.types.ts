/** Phase 3 clinical SoT types — not alerts.Alert */

export type MedicalConditionCategory =
  | 'MENTAL_HEALTH'
  | 'NEUROLOGICAL'
  | 'CARDIOVASCULAR'
  | 'RESPIRATORY'
  | 'ENDOCRINE_METABOLIC'
  | 'LEARNING_DISABILITY'
  | 'DEVELOPMENTAL'
  | 'PALLIATIVE'
  | 'OTHER'

export type ServiceUserMedicalConditionStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'

export type ReasonableAdjustmentType =
  | 'COMMUNICATION'
  | 'PHYSICAL_ACCESS'
  | 'SENSORY'
  | 'COGNITIVE'
  | 'CULTURAL_RELIGIOUS'
  | 'EQUIPMENT'
  | 'ROUTINE_TIMING'
  | 'OTHER'

export type ServiceUserClinicalDataSource =
  | 'MANUAL'
  | 'INITIAL_ASSESSMENT'
  | 'CARE_PLAN'
  | 'DOCUMENTS'
  | 'PROFILE'
  | 'IMPORT'

export const MEDICAL_MONITORING_KEYS = {
  WEIGHT_CHANGE_THRESHOLD_KG: 'WEIGHT_CHANGE_THRESHOLD_KG',
  FLUID_TARGET_REQUIRED: 'FLUID_TARGET_REQUIRED',
  MEDICAL_ALERT_CAPABILITIES: 'MEDICAL_ALERT_CAPABILITIES',
  MEDICAL_ALERT_GENERAL_ALERT: 'MEDICAL_ALERT_GENERAL_ALERT',
  MEDICAL_ALERT_COMMUNICATION: 'MEDICAL_ALERT_COMMUNICATION',
  MEDICAL_ALERT_DIABETES: 'MEDICAL_ALERT_DIABETES',
  MEDICAL_ALERT_DIETARY: 'MEDICAL_ALERT_DIETARY',
  MEDICAL_ALERT_PALLIATIVE: 'MEDICAL_ALERT_PALLIATIVE',
  MEDICAL_ALERT_BEHAVIOUR: 'MEDICAL_ALERT_BEHAVIOUR',
  MEDICAL_ALERT_FALLS: 'MEDICAL_ALERT_FALLS',
  MEDICAL_ALERT_DOLS: 'MEDICAL_ALERT_DOLS',
  MEDICAL_ALERT_CHOKING: 'MEDICAL_ALERT_CHOKING',
  MEDICAL_ALERT_COPD: 'MEDICAL_ALERT_COPD',
  MEDICAL_ALERT_DNACPR: 'MEDICAL_ALERT_DNACPR',
  MEDICAL_ALERT_RISK_LEVEL: 'MEDICAL_ALERT_RISK_LEVEL',
  MEDICAL_ALERT_ALLERGIES: 'MEDICAL_ALERT_ALLERGIES',
} as const

export type MedicalMonitoringConfigKey =
  (typeof MEDICAL_MONITORING_KEYS)[keyof typeof MEDICAL_MONITORING_KEYS]

/** Gate id → monitoring config key for manual Medical Alert YES/NO answers. */
export const MEDICAL_ALERT_GATE_CONFIG_KEYS = {
  capabilities: MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_CAPABILITIES,
  'general-alert': MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_GENERAL_ALERT,
  communication: MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_COMMUNICATION,
  diabetes: MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_DIABETES,
  dietary: MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_DIETARY,
  palliative: MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_PALLIATIVE,
  behaviour: MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_BEHAVIOUR,
  falls: MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_FALLS,
  dols: MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_DOLS,
  choking: MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_CHOKING,
  copd: MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_COPD,
  dnacpr: MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_DNACPR,
  'risk-level': MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_RISK_LEVEL,
  allergies: MEDICAL_MONITORING_KEYS.MEDICAL_ALERT_ALLERGIES,
} as const

export type MedicalAlertGateId = keyof typeof MEDICAL_ALERT_GATE_CONFIG_KEYS

export const MEDICAL_ALERT_GATE_IDS = Object.keys(
  MEDICAL_ALERT_GATE_CONFIG_KEYS,
) as MedicalAlertGateId[]

export function isMedicalAlertConfigKey(key: string): boolean {
  return key.startsWith('MEDICAL_ALERT_')
}

export type MedicalConditionCatalogRow = {
  id: string
  code: string
  name: string
  category: MedicalConditionCategory | string
  description: string | null
  sortOrder: number
  isActive: boolean
}

export type ServiceUserMedicalConditionRow = {
  id: string
  serviceUserId: string
  conditionId: string
  status: ServiceUserMedicalConditionStatus
  notes: string
  onsetDate: string | null
  reviewDate: string | null
  /** Older API builds omit the care details. */
  impactOnCare?: string
  carerGuidance?: string
  confirmationSource?: string
  sourceSubmissionId?: string | null
  source: ServiceUserClinicalDataSource | string
  isActive: boolean
  createdAt: string
  updatedAt: string
  condition?: {
    id: string
    code: string
    name: string
    category: string
  }
}

export type ReasonableAdjustmentRow = {
  id: string
  serviceUserId: string
  type: ReasonableAdjustmentType | string
  description: string
  notes: string
  isActive: boolean
  source: ServiceUserClinicalDataSource | string
  createdAt: string
  updatedAt: string
}

export type MedicalHistoryEventRow = {
  id: string
  serviceUserId: string
  title: string
  eventDate: string | null
  approximateDate: string | null
  description: string
  notes: string
  source: ServiceUserClinicalDataSource | string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type MonitoringConfigRow = {
  id: string
  serviceUserId: string
  configKey: string
  enabled: boolean
  numericValue: number | null
  booleanValue: boolean | null
  textValue: string | null
  notes: string
  observationTypeId: string | null
  createdAt: string
  updatedAt: string
}

export type UsualParameterRow = {
  id: string
  serviceUserId: string
  observationTypeId: string
  enabled: boolean
  usualNumericValue: number | null
  usualTextValue: string | null
  usualPayload: Record<string, unknown> | null
  lowerBand: number | null
  upperBand: number | null
  notes: string
  createdAt: string
  updatedAt: string
  observationType?: { id: string; code: string; name: string }
}

export type MedicalAlertCategory =
  | 'CAPABILITIES'
  | 'GENERAL_ALERT'
  | 'COMMUNICATION'
  | 'DIABETES'
  | 'DIETARY'
  | 'PALLIATIVE'
  | 'BEHAVIOUR'
  | 'FALLS'
  | 'DOLS'
  | 'CHOKING'
  | 'COPD'
  | 'DNACPR'
  | 'RISK_LEVEL'
  | 'ALLERGIES'
  | 'CUSTOM'

export type MedicalAlertSeverity = 'CRITICAL' | 'IMPORTANT' | 'INFO'

export type MedicalAlertRow = {
  id: string
  serviceUserId: string
  title: string
  category: MedicalAlertCategory | string | null
  severity: MedicalAlertSeverity | string | null
  description: string
  actionForCarer: string
  notes: string
  isActive: boolean
  source: ServiceUserClinicalDataSource | string
  createdAt: string
  updatedAt: string
}

export const MEDICAL_ALERT_CATEGORY_LABELS: Record<MedicalAlertCategory, string> = {
  CAPABILITIES: 'Capabilities',
  GENERAL_ALERT: 'General Alert',
  COMMUNICATION: 'Communication',
  DIABETES: 'Diabetes',
  DIETARY: 'Dietary',
  PALLIATIVE: 'Palliative Care',
  BEHAVIOUR: 'Behaviour',
  FALLS: 'Falls',
  DOLS: 'DoLS',
  CHOKING: 'Choking',
  COPD: 'COPD',
  DNACPR: 'DNACPR',
  RISK_LEVEL: 'Risk Level',
  ALLERGIES: 'Allergies',
  CUSTOM: 'Custom',
}

export const MEDICAL_ALERT_CATEGORIES = Object.keys(
  MEDICAL_ALERT_CATEGORY_LABELS,
) as MedicalAlertCategory[]

export const MEDICAL_ALERT_SEVERITY_LABELS: Record<MedicalAlertSeverity, string> = {
  CRITICAL: 'Critical',
  IMPORTANT: 'Important',
  INFO: 'Info',
}

export const MEDICAL_ALERT_SEVERITIES = Object.keys(
  MEDICAL_ALERT_SEVERITY_LABELS,
) as MedicalAlertSeverity[]

export const MEDICAL_CONDITION_CATEGORY_LABELS: Record<string, string> = {
  MENTAL_HEALTH: 'Mental health',
  NEUROLOGICAL: 'Neurological',
  CARDIOVASCULAR: 'Cardiovascular',
  RESPIRATORY: 'Respiratory',
  ENDOCRINE_METABOLIC: 'Endocrine / metabolic',
  LEARNING_DISABILITY: 'Learning disability',
  DEVELOPMENTAL: 'Developmental',
  PALLIATIVE: 'Palliative',
  OTHER: 'Other',
}

export const MEDICAL_CONDITION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  DISCONTINUED: 'Discontinued',
}

export const REASONABLE_ADJUSTMENT_TYPE_LABELS: Record<ReasonableAdjustmentType, string> = {
  COMMUNICATION: 'Communication',
  PHYSICAL_ACCESS: 'Physical access',
  SENSORY: 'Sensory',
  COGNITIVE: 'Cognitive',
  CULTURAL_RELIGIOUS: 'Cultural / religious',
  EQUIPMENT: 'Equipment',
  ROUTINE_TIMING: 'Routine / timing',
  OTHER: 'Other',
}

export const REASONABLE_ADJUSTMENT_TYPES = Object.keys(
  REASONABLE_ADJUSTMENT_TYPE_LABELS,
) as ReasonableAdjustmentType[]

export const MONITORING_KEY_LABELS: Record<MedicalMonitoringConfigKey, string> = {
  WEIGHT_CHANGE_THRESHOLD_KG: 'Weight change threshold',
  FLUID_TARGET_REQUIRED: 'Fluid target required',
  MEDICAL_ALERT_CAPABILITIES: 'Medical alert: Capabilities',
  MEDICAL_ALERT_GENERAL_ALERT: 'Medical alert: General Alert',
  MEDICAL_ALERT_COMMUNICATION: 'Medical alert: Communication',
  MEDICAL_ALERT_DIABETES: 'Medical alert: Diabetes',
  MEDICAL_ALERT_DIETARY: 'Medical alert: Dietary',
  MEDICAL_ALERT_PALLIATIVE: 'Medical alert: Palliative Care',
  MEDICAL_ALERT_BEHAVIOUR: 'Medical alert: Behaviour',
  MEDICAL_ALERT_FALLS: 'Medical alert: Falls',
  MEDICAL_ALERT_DOLS: 'Medical alert: DoLS',
  MEDICAL_ALERT_CHOKING: 'Medical alert: Choking',
  MEDICAL_ALERT_COPD: 'Medical alert: COPD',
  MEDICAL_ALERT_DNACPR: 'Medical alert: DNACPR',
  MEDICAL_ALERT_RISK_LEVEL: 'Medical alert: Risk Level',
  MEDICAL_ALERT_ALLERGIES: 'Medical alert: Allergies',
}
