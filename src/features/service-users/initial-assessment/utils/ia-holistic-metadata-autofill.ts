import { defaultAdlWorksheetRows } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import { enrichMustMetadata } from '@/features/service-users/initial-assessment/utils/must-scoring'
import { defaultTransferMatrixRows } from '@/features/service-users/initial-assessment/utils/mobility-metadata'
import { defaultSkinIntegrityCheckRows } from '@/features/service-users/initial-assessment/utils/skin-integrity-check'
import { enrichWaterlowMetadata } from '@/features/service-users/initial-assessment/utils/waterlow-scoring'
import {
  CARE_PLAN_VISIT_SECTIONS,
  type CarePlanObjectivesMetadata,
} from '@/features/service-users/initial-assessment/utils/care-plan-objectives'
import {
  CLINICAL_OUTCOME_SUMMARY_ROWS,
  type ClinicalAssessmentOutcomeSummaryMetadata,
} from '@/features/service-users/initial-assessment/utils/clinical-assessment-outcome-summary'
import {
  END_OF_LIFE_ASSESSMENT_QUESTIONS,
  type EndOfLifeAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/end-of-life-assessment'
import {
  ENVIRONMENT_ASSESSMENT_TABLE_QUESTIONS,
  type EnvironmentAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/environment-assessment'
import {
  MOVING_HANDLING_RISK_FILTER_QUESTIONS,
  MOVING_HANDLING_TASK_DEFINITIONS,
  type MovingHandlingOperationsMetadata,
} from '@/features/service-users/initial-assessment/utils/moving-handling-operations'
import {
  MENTAL_CAPACITY_GATE_QUESTION_IDS,
  mentalCapacityAnswerKey,
  type MentalCapacityChecklistMetadata,
} from '@/features/service-users/initial-assessment/utils/mental-capacity-checklist'
import type { PhotographyConsentMetadata } from '@/features/service-users/initial-assessment/utils/photography-consent'
import type { EquipmentSelectionMetadata } from '@/features/service-users/initial-assessment/utils/equipment-selection'
import type { AdvanceCarePlanningMetadata } from '@/features/service-users/initial-assessment/utils/advance-care-planning'
import type { FallsScreeningMetadata } from '@/features/service-users/initial-assessment/utils/falls-screening'
import {
  enrichAbbeyMetadata,
  type PainAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'
import { HOLISTIC_REGISTERED_TAB_IDS } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'

export type IaHolisticAutofillLevel = 'low' | 'normal' | 'critical'

/** Worksheet metadata keys persisted for holistic document tabs (excludes legacy mobility keys filled separately). */
export const HOLISTIC_WORKSHEET_METADATA_KEYS = [
  'skinIntegrityCheck',
  'mustAssessment',
  'fallsScreening',
  'movingHandlingOperations',
  'painAssessment',
  'environmentAssessment',
  'advanceCarePlanning',
  'endOfLifeAssessment',
  'clinicalOutcomeSummary',
  'carePlanObjectives',
  'mentalCapacityChecklist',
  'photographyConsent',
  'equipmentSelection',
] as const

export const HOLISTIC_MOBILITY_METADATA_KEYS = [
  'adl',
  'waterlow',
  'transfers',
  'equipmentChecklist',
  'dailyLivingAids',
  'practicalCare',
  'financeSupport',
  'sectionComments',
  'sectionFooters',
] as const

function isoDate(offsetMonths = 0): string {
  const d = new Date()
  if (offsetMonths) d.setMonth(d.getMonth() + offsetMonths)
  return `${d.toISOString().slice(0, 10)}T00:00:00.000Z`
}

function conditionPrefix(level: IaHolisticAutofillLevel): string {
  if (level === 'critical') return 'Very critical condition'
  if (level === 'normal') return 'Moderate condition'
  return 'Stable condition — out of danger'
}

function buildFallsScreening(level: IaHolisticAutofillLevel): FallsScreeningMetadata {
  const prefix = conditionPrefix(level)
  return {
    fallOrConcern: level === 'critical',
    firstScreenSinceLastFall: level === 'critical' ? 'yes' : 'na',
    consentToSixQuestions: level !== 'low',
    additionalComments: `${prefix} — falls screening (E2E)`,
    ...(level === 'low'
      ? {}
      : {
          q1FallsNeedInvestigating: level === 'critical',
          q2DizzyOrBlackouts: false,
          q3WalkingBalanceUnassessed: level === 'critical',
          q4FourPlusMedsNoReview: false,
          q5TrippingMore: level === 'critical',
          q6FearOfFalling: false,
        }),
  }
}

function buildMustAssessment(level: IaHolisticAutofillLevel) {
  return enrichMustMetadata({
    bmiOptionId: level === 'critical' ? 'lt18_5' : 'gt20',
    weightLossOptionId: level === 'critical' ? 'gt10' : 'lt5',
    acuteDiseaseOptionId: level === 'critical' ? 'yes' : 'no',
    foodFortificationAdviceName: level === 'critical' ? 'E2E Client' : undefined,
  })
}

function abbeyDomainScoresForLevel(level: IaHolisticAutofillLevel) {
  if (level === 'critical') {
    return {
      vocalisation: 3 as const,
      facialExpression: 3 as const,
      bodyLanguage: 2 as const,
      behaviouralChange: 3 as const,
      physiologicalChange: 2 as const,
      physicalChanges: 2 as const,
    }
  }
  if (level === 'normal') {
    return {
      vocalisation: 2 as const,
      facialExpression: 2 as const,
      bodyLanguage: 2 as const,
      behaviouralChange: 2 as const,
      physiologicalChange: 2 as const,
      physicalChanges: 1 as const,
    }
  }
  return {
    vocalisation: 0 as const,
    facialExpression: 0 as const,
    bodyLanguage: 0 as const,
    behaviouralChange: 0 as const,
    physiologicalChange: 0 as const,
    physicalChanges: 0 as const,
  }
}

function buildPainAssessment(level: IaHolisticAutofillLevel): PainAssessmentMetadata {
  const prefix = conditionPrefix(level)
  const abbey = enrichAbbeyMetadata({
    ...abbeyDomainScoresForLevel(level),
    painType: level === 'critical' ? 'acute_on_chronic' : level === 'normal' ? 'chronic' : undefined,
    dateCompleted: isoDate(),
    assessorNameDesignation: 'E2E Assessor — RM',
  })
  return {
    nrsScore: level === 'critical' ? 7 : level === 'normal' ? 4 : 0,
    scaleUsed: 'both',
    abbey,
    therapyAideMemoire: {
      choking: { checked: false },
      chestInfections: { checked: false },
      speechConcern: { checked: false },
      mobilityChange: {
        checked: level === 'critical',
        details: level === 'critical' ? 'Walking and transfers have become slower (E2E).' : undefined,
      },
      selfCareChange: {
        checked: level === 'critical',
        details: level === 'critical' ? 'I need more help to wash and dress (E2E).' : undefined,
      },
      carePackageConcern: { checked: false },
      furtherReferralRequired: false,
      additionalComments: `${prefix} — therapy aide memoire (E2E)`,
    },
  }
}

function buildMovingHandling(level: IaHolisticAutofillLevel): MovingHandlingOperationsMetadata {
  const riskFilter = MOVING_HANDLING_RISK_FILTER_QUESTIONS.reduce<
    NonNullable<MovingHandlingOperationsMetadata['riskFilter']>
  >((acc, q) => {
    acc[q.id as keyof NonNullable<MovingHandlingOperationsMetadata['riskFilter']>] =
      level === 'critical'
    return acc
  }, { totallyIndependentLowRisk: level === 'low' })

  const tasks = MOVING_HANDLING_TASK_DEFINITIONS.reduce<
    NonNullable<MovingHandlingOperationsMetadata['tasks']>
  >((acc, task) => {
    acc[task.id] = {
      capability: level === 'low' ? 'independent' : 'assistance',
      staffCount: level === 'low' ? null : 2,
      methods: level === 'critical' ? ['hoist'] : [],
    }
    return acc
  }, {})

  return { riskFilter, tasks }
}

function buildEnvironment(level: IaHolisticAutofillLevel): EnvironmentAssessmentMetadata {
  const out: EnvironmentAssessmentMetadata = {}
  for (const q of ENVIRONMENT_ASSESSMENT_TABLE_QUESTIONS) {
    out[q.id] = level === 'critical'
  }
  out.goalsAchieve = `${conditionPrefix(level)} — goals (E2E)`
  out.goalsCarePriorities = `${conditionPrefix(level)} — care priorities (E2E)`
  out.riskAssessmentsCompleted = true
  out.referralRequired = level === 'critical'
  out.equipmentAvailable = true
  out.staffNotes = 'E2E environment assessment'
  return out
}

function buildAdvanceCarePlanning(level: IaHolisticAutofillLevel): AdvanceCarePlanningMetadata {
  const prefix = conditionPrefix(level)
  return {
    patientName: 'E2E Client',
    dateCompleted: isoDate(),
    legalAdvanceDecision: false,
    personalValues: `${prefix} — personal values (E2E)`,
    carePreferences: `${prefix} — care preferences (E2E)`,
    concernsAndFears: `${prefix} — concerns (E2E)`,
  }
}

function buildEndOfLife(level: IaHolisticAutofillLevel): EndOfLifeAssessmentMetadata {
  const out: EndOfLifeAssessmentMetadata = {}
  for (const q of END_OF_LIFE_ASSESSMENT_QUESTIONS) {
    if (q.kind === 'notesOnly') continue
    if (q.id === 'dnrInPlace') {
      out.dnrInPlaceAnswer = false
      continue
    }
    if (q.kind === 'yesNoUnknown') {
      out[`${q.id}TriAnswer`] = level === 'critical' ? 'yes' : 'no'
    } else {
      out[`${q.id}Answer`] = level === 'critical'
    }
  }
  return out
}

function buildClinicalOutcomeSummary(level: IaHolisticAutofillLevel): ClinicalAssessmentOutcomeSummaryMetadata {
  const prefix = conditionPrefix(level)
  const rows = CLINICAL_OUTCOME_SUMMARY_ROWS.reduce<
    NonNullable<ClinicalAssessmentOutcomeSummaryMetadata['rows']>
  >((acc, row) => {
    acc[row.id] = {
      initial: `${prefix} — ${row.label} (E2E)`,
      reviews: Array(6).fill(''),
    }
    return acc
  }, {})
  return {
    initial: { assessmentDate: isoDate(), practitioner: 'E2E Assessor' },
    reviews: Array(6).fill({}),
    rows,
  }
}

function buildCarePlanObjectives(level: IaHolisticAutofillLevel): CarePlanObjectivesMetadata {
  const prefix = conditionPrefix(level)
  const visits = CARE_PLAN_VISIT_SECTIONS.reduce<
    NonNullable<CarePlanObjectivesMetadata['visits']>
  >((acc, section) => {
    acc[section.id] = {
      agreedTask: `${prefix} — ${section.title} task (E2E)`,
      objectives: `${prefix} — objectives`,
    }
    return acc
  }, {})
  return {
    visits,
    professionalInterventionOutcome: {
      agreedTask: 'E2E professional intervention',
      objectives: 'E2E objectives',
      outcomes: 'E2E outcomes',
    },
    professionalVisit: {
      whichProfessionalVisit: 'District nurse',
      agreedTask: 'E2E visit task',
      objectives: 'E2E visit objectives',
    },
    otherEquipmentRequired: level === 'critical' ? 'Profiling bed (E2E)' : '',
  }
}

function buildMentalCapacityChecklist(): MentalCapacityChecklistMetadata {
  const out: MentalCapacityChecklistMetadata = { assessmentType: 'preliminary' }
  for (const id of MENTAL_CAPACITY_GATE_QUESTION_IDS) {
    out[mentalCapacityAnswerKey(id)] = false
  }
  out.assessorName = 'E2E Assessor'
  out.assessorPosition = 'Registered Manager'
  out.assessorDate = isoDate()
  return out
}

function buildPhotographyConsent(): PhotographyConsentMetadata {
  return {
    photographyNeeded: 'yes',
    statementsAgreed: true,
    surname: 'E2E',
    firstNames: 'Client',
    dateOfBirth: isoDate(-900),
    nhsNumber: 'E2E-123456',
    gender: 'female',
    professionalName: 'E2E Assessor',
    professionalJobTitle: 'Care Coordinator',
    consentSubjectName: 'E2E Client',
    consentSignature: 'E2E Signature',
    consentDate: isoDate(),
    consentPrintName: 'E2E Client',
  }
}

function buildEquipmentSelection(level: IaHolisticAutofillLevel): EquipmentSelectionMetadata {
  return {
    waterlowScore: level === 'critical' ? '18' : level === 'normal' ? '12' : '8',
    selectedRiskLevel: level === 'critical' ? 'High risk' : level === 'normal' ? 'At risk' : 'Low risk',
    selectedEquipment:
      level === 'critical'
        ? 'Full replacement mattress'
        : level === 'normal'
          ? 'High risk foam mattress / alternating overlay'
          : 'Standard foam mattress — no additional pressure equipment',
    equipmentInPlace: level === 'low',
    otReferralRequired: level === 'critical',
    notes: `${conditionPrefix(level)} — equipment selection (E2E)`,
  }
}

function buildMobilityMetadata(level: IaHolisticAutofillLevel): Record<string, unknown> {
  const adlRows = defaultAdlWorksheetRows().map((r) => ({
    ...r,
    score: level === 'critical' ? 3 : 0,
    notes: level === 'critical' ? 'Very critical — high support needs (E2E)' : '',
  }))

  const transferRows = defaultTransferMatrixRows().map((r) => ({
    ...r,
    level: level === 'critical' ? 1 : null,
  }))

  const waterlow = enrichWaterlowMetadata(
    level === 'critical'
      ? {
          gender: 1,
          age: 3,
          build: 2,
          appetite: 2,
          mobility: 3,
          continence: 2,
          neurological: 2,
          surgery: 1,
          medication: 1,
          weightLoss: 2,
          skinTypes: ['broken', 'discoloured'],
          tissueMalnutrition: ['cachexia'],
          comments: 'Very critical — elevated Waterlow (E2E)',
        }
      : level === 'low'
        ? {
            gender: 1,
            age: 0,
            build: 0,
            appetite: 0,
            mobility: 0,
            continence: 0,
            neurological: 0,
            surgery: 0,
            medication: 0,
            weightLoss: 0,
            skinTypes: ['healthy'],
            tissueMalnutrition: [],
            comments: 'Stable — low pressure risk (E2E)',
          }
        : { gender: 1, age: 1, score: 2 },
  )

  const sectionComments: Record<string, { text: string }> = {}
  for (const n of HOLISTIC_REGISTERED_TAB_IDS) {
    sectionComments[String(n)] = {
      text: `${conditionPrefix(level)} — holistic tab ${n} (E2E)`,
    }
  }

  const sectionFooters: Record<string, { dateCompleted?: string; assessorNameDesignation?: string }> =
    {}
  for (const n of HOLISTIC_REGISTERED_TAB_IDS) {
    sectionFooters[String(n)] = {
      dateCompleted: isoDate(),
      assessorNameDesignation: 'E2E Assessor — RM',
    }
  }

  return {
    adl: {
      rows: adlRows,
      mobilityAidsRequired: level === 'critical',
      mobilityAidsList: level === 'critical' ? 'Hoist, profiling bed' : '',
      fallsAssessmentCompleted: level === 'critical',
      additionalComments: level === 'critical' ? 'Very critical — ADL / falls (E2E)' : '',
    },
    waterlow,
    transfers: {
      rows: transferRows,
      independentWithAll: false,
      comments: level === 'critical' ? 'E2E transfer matrix' : '',
    },
    equipmentChecklist: {
      hoistServiced: level === 'critical',
      profilingBedServiced: level === 'critical',
      staffTrainingCoversHoist: level === 'critical',
      otGuidanceRequired: false,
      comments:
        level === 'critical'
          ? 'Hoist and profiling bed are in use (E2E).'
          : 'No hoist or profiling bed is in use (E2E).',
    },
    dailyLivingAids: {
      aidsInUseOrRequired: false,
      aidsList: '',
      furtherEquipmentRequired: false,
      additionalComments: 'E2E daily living aids',
    },
    practicalCare: {
      laundry: 'Minimal support',
      cleaning: 'Minimal support',
      shopping: 'Carer support',
      financeAssistance: 'Not required',
      otherComment: 'E2E practical care tasks',
    },
    financeSupport: {
      required: level === 'critical',
      supportTypes: level === 'critical' ? ['benefits'] : [],
      staffHandleCash: false,
      familyInvolved: level === 'critical',
      consentRecorded: level === 'critical',
      details: level === 'critical' ? 'Very critical — finance support (E2E)' : '',
    },
    sectionComments,
    sectionFooters,
  }
}

/** Full holistic worksheet metadata patch for API autofill / Playwright. */
export function buildHolisticWorksheetMetadata(
  level: IaHolisticAutofillLevel,
): Record<string, unknown> {
  const prefix = conditionPrefix(level)
  const skinRows = defaultSkinIntegrityCheckRows().map((row, index) => ({
    ...row,
    right: index === 0 ? `${prefix} — clear (E2E)` : row.right,
    left: index === 0 ? `${prefix} — clear (E2E)` : row.left,
  }))

  return {
    ...buildMobilityMetadata(level),
    skinIntegrityCheck: { rows: skinRows },
    mustAssessment: buildMustAssessment(level),
    fallsScreening: buildFallsScreening(level),
    movingHandlingOperations: buildMovingHandling(level),
    painAssessment: buildPainAssessment(level),
    environmentAssessment: buildEnvironment(level),
    advanceCarePlanning: buildAdvanceCarePlanning(level),
    endOfLifeAssessment: buildEndOfLife(level),
    clinicalOutcomeSummary: buildClinicalOutcomeSummary(level),
    carePlanObjectives: buildCarePlanObjectives(level),
    mentalCapacityChecklist: buildMentalCapacityChecklist(),
    photographyConsent: buildPhotographyConsent(),
    equipmentSelection: buildEquipmentSelection(level),
  }
}

export function assertHolisticMetadataSaved(metadata: Record<string, unknown> | null | undefined): string[] {
  const missing: string[] = []
  const meta = metadata && typeof metadata === 'object' ? metadata : {}
  for (const key of [...HOLISTIC_WORKSHEET_METADATA_KEYS, ...HOLISTIC_MOBILITY_METADATA_KEYS]) {
    const value = meta[key]
    if (value == null || (typeof value === 'object' && Object.keys(value as object).length === 0)) {
      missing.push(key)
    }
  }
  return missing
}
