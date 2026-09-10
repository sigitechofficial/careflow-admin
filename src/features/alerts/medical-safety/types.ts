/**
 * Derived Medical & Safety presentation types.
 * These are NOT alerts.Alert rows — clinical facts stay in their source modules.
 */

export type SafetySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

export type SafetySourceLink = {
  label: string
  to: string
  params?: Record<string, string>
  search?: Record<string, string | number | undefined>
}

export type MedicalSafetyItem = {
  id: string
  severity: SafetySeverity
  title: string
  description: string | null
  sourceLabel: string
  updatedAt: string | null
  link: SafetySourceLink | null
  /** Group for Medical & Safety subsections */
  group: 'conditions' | 'allergies' | 'safety_risk' | 'communication' | 'immediate'
  /** Distinguishes clinical facts from operational tasks in Immediate */
  kind: 'clinical' | 'operational'
}

export type MedicalSafetySnapshot = {
  immediate: MedicalSafetyItem[]
  conditions: MedicalSafetyItem[]
  allergies: MedicalSafetyItem[]
  safetyRisk: MedicalSafetyItem[]
  communication: MedicalSafetyItem[]
  /** True when structured medical-conditions SoT is unavailable */
  conditionsUnavailable: boolean
  /** True when communication/diet needs lack a flat structured SoT */
  communicationLimited: boolean
}
