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
}

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
  }
}
