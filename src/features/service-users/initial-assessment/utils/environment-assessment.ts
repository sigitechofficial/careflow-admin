/** Environment assessment worksheet — paper form (holistic tab 12). */

export type EnvironmentAssessmentQuestionId =
  | 'homeHazards'
  | 'furniturePosition'
  | 'lightingRequirements'
  | 'temperatureSupport'
  | 'pets'
  | 'externalHazards'
  | 'infectionControlRisks'
  | 'carePlanCompleted'

export type EnvironmentAssessmentMetadata = {
  homeHazards?: boolean | null
  furniturePosition?: boolean | null
  lightingRequirements?: boolean | null
  temperatureSupport?: boolean | null
  pets?: boolean | null
  externalHazards?: boolean | null
  infectionControlRisks?: boolean | null
  carePlanCompleted?: boolean | null
  goalsAchieve?: string
  goalsCarePriorities?: string
  riskAssessmentsCompleted?: boolean
  referralRequired?: boolean
  equipmentAvailable?: boolean
  staffNotes?: string
  // ── Lone worker / staff safety factors (feed the aggregated LONE_WORKER risk) ──
  // Keys MUST match ENV_FACTOR_WEIGHTS in
  // careflow-api/src/initial-assessments/initial-assessment-lone-worker-risk.util.ts
  isolatedProperty?: boolean | null
  poorLightingAccess?: boolean | null
  unsafeArea?: boolean | null
  noMobileSignal?: boolean | null
  othersPresentRisk?: boolean | null
  carerWorksAlone?: boolean | null
  nightVisits?: boolean | null
  longDurationVisits?: boolean | null
  newServiceUser?: boolean | null
  pastSafeguardingIncident?: boolean | null
  previousCarerComplaints?: boolean | null
  previousSosEvent?: boolean | null
  unsafeMovingHandlingAlone?: boolean | null
  twoCarerRecommended?: boolean | null
  // Staff-Only control fields
  loneWorkerRiskIdentified?: boolean | null
  loneWorkerRiskLevel?: LoneWorkerRiskLevel
  staffSafetyInstructions?: string
}

export type LoneWorkerRiskLevel = 'Low' | 'Med' | 'High'

export type EnvironmentAssessmentLoneWorkerFactorId =
  | 'isolatedProperty'
  | 'poorLightingAccess'
  | 'unsafeArea'
  | 'noMobileSignal'
  | 'othersPresentRisk'
  | 'carerWorksAlone'
  | 'nightVisits'
  | 'longDurationVisits'
  | 'newServiceUser'
  | 'pastSafeguardingIncident'
  | 'previousCarerComplaints'
  | 'previousSosEvent'
  | 'unsafeMovingHandlingAlone'
  | 'twoCarerRecommended'

export const ENVIRONMENT_ASSESSMENT_TABLE_QUESTIONS: ReadonlyArray<{
  id: EnvironmentAssessmentQuestionId
  label: string
  staffOnly?: boolean
}> = [
  {
    id: 'homeHazards',
    label:
      'Do you have any potential hazards around your home? (e.g. loose mats/rugs, damaged flooring, obstructions, loose wires/cables)',
  },
  {
    id: 'furniturePosition',
    label:
      'Do you need to have furniture placed in a specific position to help you? (e.g. vision, access)',
  },
  {
    id: 'lightingRequirements',
    label: 'Do you have specific lighting requirements for your home?',
  },
  {
    id: 'temperatureSupport',
    label: 'Do you need support to stay warm and/or keep cool?',
  },
  {
    id: 'pets',
    label: 'Do you have any pets?',
  },
  {
    id: 'externalHazards',
    label:
      'Do you have any potential external hazards near your home? (e.g. uneven paths/driveway, lighting, security i.e. burglar alarm/safety chain)',
  },
  {
    id: 'infectionControlRisks',
    staffOnly: true,
    label:
      'Are there any infection control considerations, or risks that could result in accidents or incidents?',
  },
  {
    id: 'carePlanCompleted',
    staffOnly: true,
    label: 'Care Plan completed?',
  },
]

export const ENVIRONMENT_ASSESSMENT_GOALS_PROMPTS = [
  {
    key: 'goalsAchieve' as const,
    label:
      "Where possible, in the Service User's own words, detail what they would like to be able to achieve or continue to do.",
  },
  {
    key: 'goalsCarePriorities' as const,
    label:
      "Where possible, in the Service User's own words, detail what areas of their care are most important to them. Where it is a safety issue, detail this here too.",
  },
]

export const ENVIRONMENT_ASSESSMENT_STAFF_CHECKLIST = [
  { key: 'riskAssessmentsCompleted' as const, label: 'Risk Assessment(s) completed?' },
  { key: 'referralRequired' as const, label: 'Referral required?' },
  { key: 'equipmentAvailable' as const, label: 'Equipment is available that may be required?' },
]

/**
 * Lone worker / staff safety factors, shown as their own Yes/No table.
 * Each Yes contributes to the aggregated LONE_WORKER risk scored on the server.
 * Deliberately NOT part of ENVIRONMENT_ASSESSMENT_TABLE_QUESTIONS, so they never
 * affect isEnvironmentAssessmentComplete (they are optional risk indicators).
 */
export const ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS: ReadonlyArray<{
  id: EnvironmentAssessmentLoneWorkerFactorId
  label: string
}> = [
  { id: 'isolatedProperty', label: 'Is the property isolated / in a remote location?' },
  { id: 'poorLightingAccess', label: 'Any poor lighting or difficult access at the property?' },
  { id: 'unsafeArea', label: 'Is the property in an unsafe area / neighbourhood?' },
  { id: 'noMobileSignal', label: 'Is there no reliable mobile signal at the property?' },
  {
    id: 'othersPresentRisk',
    label: 'Is there anyone else regularly present during visits who may pose a risk to the carer?',
  },
  { id: 'carerWorksAlone', label: 'Does the carer usually work alone at this visit?' },
  { id: 'nightVisits', label: 'Are there night / early-morning / late visits?' },
  { id: 'longDurationVisits', label: 'Are visits long duration (extended time alone)?' },
  { id: 'newServiceUser', label: 'Is this a new service user / first visits?' },
  { id: 'pastSafeguardingIncident', label: 'Any past safeguarding incident involving staff?' },
  { id: 'previousCarerComplaints', label: 'Any previous carer complaints or reported concerns?' },
  { id: 'previousSosEvent', label: 'Any previous SOS / emergency event at this service user?' },
  { id: 'unsafeMovingHandlingAlone', label: 'Do care tasks require moving & handling that is unsafe alone?' },
  { id: 'twoCarerRecommended', label: 'Is a two-carer (double-up) visit recommended?' },
]

export const ENVIRONMENT_ASSESSMENT_LONE_WORKER_LEVELS: ReadonlyArray<LoneWorkerRiskLevel> = [
  'Low',
  'Med',
  'High',
]

const QUESTION_FIELD_MAP: Record<
  EnvironmentAssessmentQuestionId,
  keyof EnvironmentAssessmentMetadata
> = {
  homeHazards: 'homeHazards',
  furniturePosition: 'furniturePosition',
  lightingRequirements: 'lightingRequirements',
  temperatureSupport: 'temperatureSupport',
  pets: 'pets',
  externalHazards: 'externalHazards',
  infectionControlRisks: 'infectionControlRisks',
  carePlanCompleted: 'carePlanCompleted',
}

export function environmentAssessmentQuestionValue(
  meta: EnvironmentAssessmentMetadata,
  id: EnvironmentAssessmentQuestionId,
): boolean | null | undefined {
  return meta[QUESTION_FIELD_MAP[id]] as boolean | null | undefined
}

export function boolAnswered(value: boolean | null | undefined): boolean {
  return value === true || value === false
}

export function isEnvironmentAssessmentComplete(
  meta: EnvironmentAssessmentMetadata | undefined,
): boolean {
  if (!meta) return false
  return ENVIRONMENT_ASSESSMENT_TABLE_QUESTIONS.every((q) =>
    boolAnswered(environmentAssessmentQuestionValue(meta, q.id)),
  )
}

export function defaultEnvironmentAssessmentMetadata(): EnvironmentAssessmentMetadata {
  return {}
}

export function normalizeEnvironmentAssessmentMetadata(
  raw: unknown,
): EnvironmentAssessmentMetadata {
  if (!raw || typeof raw !== 'object') return defaultEnvironmentAssessmentMetadata()
  const row = raw as EnvironmentAssessmentMetadata
  return {
    homeHazards: row.homeHazards ?? undefined,
    furniturePosition: row.furniturePosition ?? undefined,
    lightingRequirements: row.lightingRequirements ?? undefined,
    temperatureSupport: row.temperatureSupport ?? undefined,
    pets: row.pets ?? undefined,
    externalHazards: row.externalHazards ?? undefined,
    infectionControlRisks: row.infectionControlRisks ?? undefined,
    carePlanCompleted: row.carePlanCompleted ?? undefined,
    goalsAchieve: typeof row.goalsAchieve === 'string' ? row.goalsAchieve : undefined,
    goalsCarePriorities:
      typeof row.goalsCarePriorities === 'string' ? row.goalsCarePriorities : undefined,
    riskAssessmentsCompleted: row.riskAssessmentsCompleted === true ? true : undefined,
    referralRequired: row.referralRequired === true ? true : undefined,
    equipmentAvailable: row.equipmentAvailable === true ? true : undefined,
    staffNotes: typeof row.staffNotes === 'string' ? row.staffNotes : undefined,
    // Lone worker / staff safety factors (all optional)
    isolatedProperty: row.isolatedProperty ?? undefined,
    poorLightingAccess: row.poorLightingAccess ?? undefined,
    unsafeArea: row.unsafeArea ?? undefined,
    noMobileSignal: row.noMobileSignal ?? undefined,
    othersPresentRisk: row.othersPresentRisk ?? undefined,
    carerWorksAlone: row.carerWorksAlone ?? undefined,
    nightVisits: row.nightVisits ?? undefined,
    longDurationVisits: row.longDurationVisits ?? undefined,
    newServiceUser: row.newServiceUser ?? undefined,
    pastSafeguardingIncident: row.pastSafeguardingIncident ?? undefined,
    previousCarerComplaints: row.previousCarerComplaints ?? undefined,
    previousSosEvent: row.previousSosEvent ?? undefined,
    unsafeMovingHandlingAlone: row.unsafeMovingHandlingAlone ?? undefined,
    twoCarerRecommended: row.twoCarerRecommended ?? undefined,
    loneWorkerRiskIdentified: row.loneWorkerRiskIdentified ?? undefined,
    loneWorkerRiskLevel:
      row.loneWorkerRiskLevel === 'Low' ||
      row.loneWorkerRiskLevel === 'Med' ||
      row.loneWorkerRiskLevel === 'High'
        ? row.loneWorkerRiskLevel
        : undefined,
    staffSafetyInstructions:
      typeof row.staffSafetyInstructions === 'string' ? row.staffSafetyInstructions : undefined,
  }
}
