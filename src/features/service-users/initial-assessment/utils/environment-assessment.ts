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
  // Behaviour & condition
  aggression?: boolean | null
  verbalAbuse?: boolean | null
  physicalViolence?: boolean | null
  unpredictable?: boolean | null
  dementiaBehaviour?: boolean | null
  mentalHealthRisk?: boolean | null
  substanceMisuse?: boolean | null
  refusedCare?: boolean | null
  // Environment / visit / incidents / care
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
  // Per-factor "Risk Details / Notes" — mandatory when the matching factor is Yes.
  aggressionDetails?: string
  verbalAbuseDetails?: string
  physicalViolenceDetails?: string
  unpredictableDetails?: string
  dementiaBehaviourDetails?: string
  mentalHealthRiskDetails?: string
  substanceMisuseDetails?: string
  refusedCareDetails?: string
  isolatedPropertyDetails?: string
  poorLightingAccessDetails?: string
  unsafeAreaDetails?: string
  noMobileSignalDetails?: string
  othersPresentRiskDetails?: string
  carerWorksAloneDetails?: string
  nightVisitsDetails?: string
  longDurationVisitsDetails?: string
  newServiceUserDetails?: string
  pastSafeguardingIncidentDetails?: string
  previousCarerComplaintsDetails?: string
  previousSosEventDetails?: string
  unsafeMovingHandlingAloneDetails?: string
  twoCarerRecommendedDetails?: string
  // Staff-Only control fields
  loneWorkerRiskIdentified?: boolean | null
  loneWorkerRiskLevel?: LoneWorkerRiskLevel
  staffSafetyInstructions?: string
}

export type LoneWorkerRiskLevel = 'Low' | 'Med' | 'High'

export type EnvironmentAssessmentLoneWorkerFactorId =
  | 'aggression'
  | 'verbalAbuse'
  | 'physicalViolence'
  | 'unpredictable'
  | 'dementiaBehaviour'
  | 'mentalHealthRisk'
  | 'substanceMisuse'
  | 'refusedCare'
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
  /** Companion "Risk Details / Notes" field, mandatory when the factor is Yes. */
  detailsKey: keyof EnvironmentAssessmentMetadata
}> = [
  { id: 'aggression', label: 'Has the service user or anyone in the household shown aggression towards carers?', detailsKey: 'aggressionDetails' },
  { id: 'verbalAbuse', label: 'Any history of verbal abuse or threats towards staff?', detailsKey: 'verbalAbuseDetails' },
  { id: 'physicalViolence', label: 'Any history of physical violence?', detailsKey: 'physicalViolenceDetails' },
  { id: 'unpredictable', label: 'Does the service user show unpredictable or challenging behaviour?', detailsKey: 'unpredictableDetails' },
  { id: 'dementiaBehaviour', label: 'Does the service user have dementia / cognitive impairment affecting behaviour?', detailsKey: 'dementiaBehaviourDetails' },
  { id: 'mentalHealthRisk', label: 'Any mental health condition that may pose a risk to staff?', detailsKey: 'mentalHealthRiskDetails' },
  { id: 'substanceMisuse', label: 'Any substance / alcohol misuse in the household?', detailsKey: 'substanceMisuseDetails' },
  { id: 'refusedCare', label: 'Has the service user previously refused care or prevented carers from leaving?', detailsKey: 'refusedCareDetails' },
  { id: 'isolatedProperty', label: 'Is the property isolated / in a remote location?', detailsKey: 'isolatedPropertyDetails' },
  { id: 'poorLightingAccess', label: 'Any poor lighting or difficult access at the property?', detailsKey: 'poorLightingAccessDetails' },
  { id: 'unsafeArea', label: 'Is the property in an unsafe area / neighbourhood?', detailsKey: 'unsafeAreaDetails' },
  { id: 'noMobileSignal', label: 'Is there no reliable mobile signal at the property?', detailsKey: 'noMobileSignalDetails' },
  {
    id: 'othersPresentRisk',
    label: 'Is there anyone else regularly present during visits who may pose a risk to the carer?',
    detailsKey: 'othersPresentRiskDetails',
  },
  { id: 'carerWorksAlone', label: 'Does the carer usually work alone at this visit?', detailsKey: 'carerWorksAloneDetails' },
  { id: 'nightVisits', label: 'Are there night / early-morning / late visits?', detailsKey: 'nightVisitsDetails' },
  { id: 'longDurationVisits', label: 'Are visits long duration (extended time alone)?', detailsKey: 'longDurationVisitsDetails' },
  { id: 'newServiceUser', label: 'Is this a new service user / first visits?', detailsKey: 'newServiceUserDetails' },
  { id: 'pastSafeguardingIncident', label: 'Any past safeguarding incident involving staff?', detailsKey: 'pastSafeguardingIncidentDetails' },
  { id: 'previousCarerComplaints', label: 'Any previous carer complaints or reported concerns?', detailsKey: 'previousCarerComplaintsDetails' },
  { id: 'previousSosEvent', label: 'Any previous SOS / emergency event at this service user?', detailsKey: 'previousSosEventDetails' },
  {
    id: 'unsafeMovingHandlingAlone',
    label: 'Does the service user require moving & handling support that needs two carers?',
    detailsKey: 'unsafeMovingHandlingAloneDetails',
  },
  {
    id: 'twoCarerRecommended',
    label: 'Is a two-carer (double-up) visit required?',
    detailsKey: 'twoCarerRecommendedDetails',
  },
]

export const ENVIRONMENT_ASSESSMENT_LONE_WORKER_LEVELS: ReadonlyArray<LoneWorkerRiskLevel> = [
  'Low',
  'Med',
  'High',
]

export type AxisWeight = 'high' | 'medium' | 'low'

/**
 * Likelihood × Severity matrix (§13.7) — mirror of the server tables in
 * careflow-api/src/initial-assessments/initial-assessment-lone-worker-risk.util.ts.
 * Server is the source of truth; this mirror only drives the live preview.
 * Each axis is rated by its worst present factor, then level = calculateMatrixLevel.
 */
export const LONE_WORKER_LIKELIHOOD_WEIGHT: Partial<
  Record<EnvironmentAssessmentLoneWorkerFactorId, AxisWeight>
> = {
  aggression: 'high',
  physicalViolence: 'high',
  refusedCare: 'high',
  previousSosEvent: 'high',
  pastSafeguardingIncident: 'high',
  verbalAbuse: 'medium',
  unpredictable: 'medium',
  mentalHealthRisk: 'medium',
  substanceMisuse: 'medium',
  othersPresentRisk: 'medium',
  previousCarerComplaints: 'medium',
  unsafeArea: 'medium',
  dementiaBehaviour: 'low',
  newServiceUser: 'low',
}

export const LONE_WORKER_SEVERITY_WEIGHT: Partial<
  Record<EnvironmentAssessmentLoneWorkerFactorId, AxisWeight>
> = {
  physicalViolence: 'high',
  pastSafeguardingIncident: 'high',
  previousSosEvent: 'high',
  noMobileSignal: 'high',
  aggression: 'medium',
  refusedCare: 'medium',
  mentalHealthRisk: 'medium',
  substanceMisuse: 'medium',
  othersPresentRisk: 'medium',
  isolatedProperty: 'medium',
  unsafeArea: 'medium',
  carerWorksAlone: 'medium',
  nightVisits: 'medium',
  unsafeMovingHandlingAlone: 'medium',
  twoCarerRecommended: 'medium',
  poorLightingAccess: 'low',
  longDurationVisits: 'low',
  newServiceUser: 'low',
  verbalAbuse: 'low',
  unpredictable: 'low',
  dementiaBehaviour: 'low',
}

const LEVEL_SCORE: Record<LoneWorkerRiskLevel, number> = { Low: 1, Med: 2, High: 3 }

/** Level from a Likelihood × Severity product: >=6 High, 3-5 Med, <3 Low. */
export function calculateMatrixLevel(
  likelihood: LoneWorkerRiskLevel,
  severity: LoneWorkerRiskLevel,
): LoneWorkerRiskLevel {
  const score = LEVEL_SCORE[likelihood] * LEVEL_SCORE[severity]
  if (score >= 6) return 'High'
  if (score >= 3) return 'Med'
  return 'Low'
}

function axisLevel(
  meta: EnvironmentAssessmentMetadata,
  weights: Partial<Record<EnvironmentAssessmentLoneWorkerFactorId, AxisWeight>>,
): LoneWorkerRiskLevel {
  let hasMedium = false
  for (const f of ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS) {
    if (meta[f.id] !== true) continue
    const w = weights[f.id]
    if (w === 'high') return 'High'
    if (w === 'medium') hasMedium = true
  }
  return hasMedium ? 'Med' : 'Low'
}

/**
 * Live preview of the auto-calculated lone-worker risk on the Likelihood ×
 * Severity matrix. Returns null when no factor is answered Yes. Mirrors the
 * server (which recomputes authoritatively on submit; a manual level overrides).
 */
export function computeLoneWorkerAxes(
  meta: EnvironmentAssessmentMetadata | undefined,
): { likelihood: LoneWorkerRiskLevel; severity: LoneWorkerRiskLevel; level: LoneWorkerRiskLevel } | null {
  if (!meta) return null
  const anyFactor = ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS.some((f) => meta[f.id] === true)
  if (!anyFactor) return null
  const likelihood = axisLevel(meta, LONE_WORKER_LIKELIHOOD_WEIGHT)
  let severity = axisLevel(meta, LONE_WORKER_SEVERITY_WEIGHT)
  // Working alone + out-of-hours makes help harder to reach → escalate severity.
  if (meta.carerWorksAlone === true && meta.nightVisits === true) severity = 'High'
  return { likelihood, severity, level: calculateMatrixLevel(likelihood, severity) }
}

export function computeLoneWorkerRiskLevel(
  meta: EnvironmentAssessmentMetadata | undefined,
): LoneWorkerRiskLevel | null {
  return computeLoneWorkerAxes(meta)?.level ?? null
}

/**
 * Rule-based suggested control measures per lone-worker factor. These are
 * SUGGESTIONS only — the assessor inserts and edits them into the free-text
 * "Control Measures / Safety Actions" field; nothing is written automatically.
 */
export const LONE_WORKER_SUGGESTED_MEASURES: Partial<
  Record<EnvironmentAssessmentLoneWorkerFactorId, string>
> = {
  physicalViolence: 'Two-carer (double-up) visits are mandatory — never attend alone.',
  aggression:
    'Approach calmly and avoid cornering; withdraw and call the office if the service user becomes aggressive.',
  verbalAbuse: 'Set clear boundaries and report/log any abusive incidents to the office.',
  unpredictable: 'Visit at consistent times; watch for early warning signs and de-escalate.',
  dementiaBehaviour: 'Use a calm, familiar routine; allow extra time and avoid sudden changes.',
  mentalHealthRisk:
    'Check the current mental-health status before entering and agree a de-escalation plan with the office.',
  substanceMisuse:
    'Do not enter if the household appears intoxicated or unsafe — call the office.',
  refusedCare: 'Agree an exit plan and keep a clear path to the door; do not force care.',
  isolatedProperty: 'Share live location with the office and confirm safe arrival and departure.',
  poorLightingAccess: 'Carry a torch and report lighting/access hazards to the office.',
  unsafeArea: 'Park in a safe, well-lit spot; avoid lone visits after dark where possible.',
  noMobileSignal:
    'Carry a charged phone, agree a check-in time, and note the nearest signal location.',
  othersPresentRisk:
    'Confirm who is present on arrival; leave and call the office if you feel unsafe.',
  carerWorksAlone: 'Enable lone-worker check-in and SOS; office to confirm arrival and departure.',
  nightVisits:
    'Avoid lone evening/night visits where possible; use a safety check-in or buddy call.',
  longDurationVisits: 'Agree periodic check-ins with the office during long visits.',
  newServiceUser: 'Introductory visit with a second carer; review after the first few visits.',
  pastSafeguardingIncident:
    'Manager to review before visits; document every visit and any concerns.',
  previousCarerComplaints:
    'Brief all carers on the reported concerns and escalate repeat issues to the manager.',
  previousSosEvent: 'Treat as high alert; confirm the SOS / on-call process before each visit.',
  unsafeMovingHandlingAlone:
    'Two carers required for all transfers; follow the moving & handling plan.',
  twoCarerRecommended: 'Schedule double-up visits for all personal care and transfers.',
}

/** Suggested control measures for the factors currently answered Yes (deduped, in display order). */
export function suggestLoneWorkerControlMeasures(
  meta: EnvironmentAssessmentMetadata | undefined,
): string[] {
  if (!meta) return []
  const out: string[] = []
  for (const f of ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS) {
    if (meta[f.id] !== true) continue
    const measure = LONE_WORKER_SUGGESTED_MEASURES[f.id]
    if (measure && !out.includes(measure)) out.push(measure)
  }
  return out
}

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

/**
 * A lone-worker factor answered "Yes" must have its Risk Details / Notes filled.
 * A factor left blank or answered "No" imposes no requirement (legacy-safe).
 */
export function loneWorkerFactorDetailsMissing(
  meta: EnvironmentAssessmentMetadata | undefined,
): boolean {
  if (!meta) return false
  return ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS.some((f) => {
    if (meta[f.id] !== true) return false
    const details = meta[f.detailsKey]
    return typeof details !== 'string' || details.trim().length === 0
  })
}

export function isEnvironmentAssessmentComplete(
  meta: EnvironmentAssessmentMetadata | undefined,
): boolean {
  if (!meta) return false
  const tableComplete = ENVIRONMENT_ASSESSMENT_TABLE_QUESTIONS.every((q) =>
    boolAnswered(environmentAssessmentQuestionValue(meta, q.id)),
  )
  return tableComplete && !loneWorkerFactorDetailsMissing(meta)
}

export function defaultEnvironmentAssessmentMetadata(): EnvironmentAssessmentMetadata {
  return {}
}

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

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
    aggression: row.aggression ?? undefined,
    verbalAbuse: row.verbalAbuse ?? undefined,
    physicalViolence: row.physicalViolence ?? undefined,
    unpredictable: row.unpredictable ?? undefined,
    dementiaBehaviour: row.dementiaBehaviour ?? undefined,
    mentalHealthRisk: row.mentalHealthRisk ?? undefined,
    substanceMisuse: row.substanceMisuse ?? undefined,
    refusedCare: row.refusedCare ?? undefined,
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
    // Per-factor risk details (all optional strings)
    aggressionDetails: str(row.aggressionDetails),
    verbalAbuseDetails: str(row.verbalAbuseDetails),
    physicalViolenceDetails: str(row.physicalViolenceDetails),
    unpredictableDetails: str(row.unpredictableDetails),
    dementiaBehaviourDetails: str(row.dementiaBehaviourDetails),
    mentalHealthRiskDetails: str(row.mentalHealthRiskDetails),
    substanceMisuseDetails: str(row.substanceMisuseDetails),
    refusedCareDetails: str(row.refusedCareDetails),
    isolatedPropertyDetails: str(row.isolatedPropertyDetails),
    poorLightingAccessDetails: str(row.poorLightingAccessDetails),
    unsafeAreaDetails: str(row.unsafeAreaDetails),
    noMobileSignalDetails: str(row.noMobileSignalDetails),
    othersPresentRiskDetails: str(row.othersPresentRiskDetails),
    carerWorksAloneDetails: str(row.carerWorksAloneDetails),
    nightVisitsDetails: str(row.nightVisitsDetails),
    longDurationVisitsDetails: str(row.longDurationVisitsDetails),
    newServiceUserDetails: str(row.newServiceUserDetails),
    pastSafeguardingIncidentDetails: str(row.pastSafeguardingIncidentDetails),
    previousCarerComplaintsDetails: str(row.previousCarerComplaintsDetails),
    previousSosEventDetails: str(row.previousSosEventDetails),
    unsafeMovingHandlingAloneDetails: str(row.unsafeMovingHandlingAloneDetails),
    twoCarerRecommendedDetails: str(row.twoCarerRecommendedDetails),
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
