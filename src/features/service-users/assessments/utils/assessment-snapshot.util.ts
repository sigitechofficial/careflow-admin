import type { CarePlanDraftValues } from '@/features/service-users/care-plan/care-plan-draft-storage'
import type { AssessmentConsentMetadata } from '@/features/service-users/assessments/utils/assessment-consent'

import {

  computeMustScore,

  enrichMustMetadata,

  isMustScoringComplete,

  mustRiskLabel,

  mustRiskLevel,

  defaultMustMetadata,

  type MustMetadata,

} from '@/features/service-users/initial-assessment/utils/must-scoring'

import {

  computeWaterlowScore,

  enrichWaterlowMetadata,

  waterlowBand,

  type WaterlowMetadata,

} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'

import { isWaterlowScoringComplete } from '@/features/service-users/initial-assessment/utils/waterlow-questions'

import {

  defaultFallsScreeningMetadata,

  isFallsScreeningComplete,

  normalizeFallsScreeningMetadata,

  type FallsScreeningMetadata,

} from '@/features/service-users/initial-assessment/utils/falls-screening'

import {

  defaultSkinIntegrityCheckMetadata,

  normalizeSkinIntegrityCheckMetadata,

  skinIntegrityCheckHasEntries,

  type SkinIntegrityCheckMetadata,

} from '@/features/service-users/initial-assessment/utils/skin-integrity-check'

import {

  buildMcaSnapshotFromMetadata,

  defaultMcaScreeningStandaloneMetadata,

  isMcaScreeningStandaloneComplete,

  metadataFromMcaSnapshotRows,

  normalizeMcaScreeningStandaloneMetadata,

  type McaScreeningStandaloneMetadata,

} from '@/features/service-users/initial-assessment/utils/mca-screening-standalone'

import {

  defaultMovingHandlingOperationsMetadata,

  isMovingHandlingOperationsComplete,

  normalizeMovingHandlingOperationsMetadata,

  type MovingHandlingOperationsMetadata,

} from '@/features/service-users/initial-assessment/utils/moving-handling-operations'

import {

  defaultPainAssessmentMetadata,
  formatPainAssessmentHistorySummary,
  type PainAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'

import { isPainAssessmentComplete } from '@/features/service-users/initial-assessment/utils/pain-questions'

import {

  defaultTherapyAideMemoireMetadata,

  isTherapyAideMemoireComplete,

  normalizeTherapyAideMemoireMetadata,
} from '@/features/service-users/initial-assessment/utils/therapy-aide-memoire'
import type { TherapyAideMemoireMetadata } from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'

import {

  defaultEnvironmentAssessmentMetadata,

  isEnvironmentAssessmentComplete,

  normalizeEnvironmentAssessmentMetadata,

  type EnvironmentAssessmentMetadata,

} from '@/features/service-users/initial-assessment/utils/environment-assessment'

import {

  defaultAdvanceCarePlanningMetadata,

  isAdvanceCarePlanningComplete,

  normalizeAdvanceCarePlanningMetadata,

  type AdvanceCarePlanningMetadata,

} from '@/features/service-users/initial-assessment/utils/advance-care-planning'

import {

  defaultEndOfLifeAssessmentMetadata,

  isEndOfLifeAssessmentComplete,

  normalizeEndOfLifeAssessmentMetadata,

  type EndOfLifeAssessmentMetadata,

} from '@/features/service-users/initial-assessment/utils/end-of-life-assessment'

import {

  defaultMentalCapacityChecklistMetadata,

  isMentalCapacityChecklistComplete,

  normalizeMentalCapacityChecklistMetadata,

  type MentalCapacityChecklistMetadata,

} from '@/features/service-users/initial-assessment/utils/mental-capacity-checklist'

import {

  defaultPhotographyConsentMetadata,

  isPhotographyConsentComplete,

  normalizePhotographyConsentMetadata,

  type PhotographyConsentMetadata,

} from '@/features/service-users/initial-assessment/utils/photography-consent'

import {

  defaultEquipmentSelectionMetadata,

  formatEquipmentSelectionHistorySummary,

  isEquipmentSelectionComplete,

  normalizeEquipmentSelectionMetadata,

  type EquipmentSelectionMetadata,

} from '@/features/service-users/initial-assessment/utils/equipment-selection'

import type { EquipmentChecklistMetadata } from '@/features/service-users/initial-assessment/utils/mobility-metadata'

import {

  defaultPeepSnapshot,

  formatPeepHistorySummary,

  isPeepSnapshotComplete,

  normalizePeepSnapshot,

  type PeepSnapshot,

} from '@/features/service-users/initial-assessment/utils/peep-snapshot'

import {

  getAssessmentToolDefinition,

  resolveAssessmentPanelId,

} from '@/features/service-users/assessments/assessment-tool-registry'

export type AssessmentCaptureKind = 'waterlow' | 'must' | 'pathway-form'

export type AssessmentToolCaptureState = {

  waterlow: WaterlowMetadata

  must: MustMetadata

  fallsScreening: FallsScreeningMetadata

  skinIntegrityCheck: SkinIntegrityCheckMetadata

  mcaScreening: McaScreeningStandaloneMetadata

  movingHandlingOperations: MovingHandlingOperationsMetadata

  painAssessment: PainAssessmentMetadata

  therapyAideMemoire: TherapyAideMemoireMetadata

  environmentAssessment: EnvironmentAssessmentMetadata

  advanceCarePlanning: AdvanceCarePlanningMetadata

  endOfLifeAssessment: EndOfLifeAssessmentMetadata

  mentalCapacityChecklist: MentalCapacityChecklistMetadata

  photographyConsent: PhotographyConsentMetadata

  peep: PeepSnapshot

  equipmentSelection: EquipmentSelectionMetadata

  equipmentChecklist: EquipmentChecklistMetadata

  formValues: CarePlanDraftValues

}



function extractSnapshotField(

  snapshot: Record<string, unknown> | null | undefined,

  key: string,

): unknown {

  if (!snapshot || typeof snapshot !== 'object') return undefined

  return snapshot[key]

}



function extractObjectField<T>(snapshot: Record<string, unknown> | null | undefined, key: string): T | undefined {

  const raw = extractSnapshotField(snapshot, key)

  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as T) : undefined

}



export function emptyToolCaptureState(

  initialSnapshot?: Record<string, unknown> | null,

): AssessmentToolCaptureState {

  return {

    waterlow: enrichWaterlowMetadata(extractWaterlowFromSnapshot(initialSnapshot)),

    must: enrichMustMetadata(extractMustFromSnapshot(initialSnapshot) || defaultMustMetadata()),

    fallsScreening: normalizeFallsScreeningMetadata(

      extractSnapshotField(initialSnapshot, 'fallsScreening') ?? defaultFallsScreeningMetadata(),

    ),

    skinIntegrityCheck: normalizeSkinIntegrityCheckMetadata(

      extractSnapshotField(initialSnapshot, 'skinIntegrityCheck') ??

        defaultSkinIntegrityCheckMetadata(),

    ),

    mcaScreening: extractMcaScreeningFromSnapshot(initialSnapshot),

    movingHandlingOperations: normalizeMovingHandlingOperationsMetadata(

      extractSnapshotField(initialSnapshot, 'movingHandlingOperations'),

    ),

    painAssessment: extractObjectField<PainAssessmentMetadata>(initialSnapshot, 'painAssessment') ??

      defaultPainAssessmentMetadata(),

    therapyAideMemoire: normalizeTherapyAideMemoireMetadata(

      extractSnapshotField(initialSnapshot, 'therapyAideMemoire') ??

        extractObjectField<{ therapyAideMemoire?: unknown }>(initialSnapshot, 'painAssessment')

          ?.therapyAideMemoire,

    ),

    environmentAssessment: normalizeEnvironmentAssessmentMetadata(

      extractSnapshotField(initialSnapshot, 'environmentAssessment'),

    ),

    advanceCarePlanning: normalizeAdvanceCarePlanningMetadata(

      extractSnapshotField(initialSnapshot, 'advanceCarePlanning'),

    ),

    endOfLifeAssessment: normalizeEndOfLifeAssessmentMetadata(

      extractSnapshotField(initialSnapshot, 'endOfLifeAssessment'),

    ),

    mentalCapacityChecklist: normalizeMentalCapacityChecklistMetadata(

      extractSnapshotField(initialSnapshot, 'mentalCapacityChecklist'),

    ),

    photographyConsent: normalizePhotographyConsentMetadata(

      extractSnapshotField(initialSnapshot, 'photographyConsent'),

    ),

    peep: normalizePeepSnapshot(extractSnapshotField(initialSnapshot, 'peep') ?? defaultPeepSnapshot()),

    equipmentSelection: normalizeEquipmentSelectionMetadata(

      extractSnapshotField(initialSnapshot, 'equipmentSelection') ?? defaultEquipmentSelectionMetadata(),

    ),

    equipmentChecklist:

      (extractObjectField<EquipmentChecklistMetadata>(initialSnapshot, 'equipmentChecklist') ??

        {}),

    formValues: extractPathwayFormValues(initialSnapshot),

  }

}



export function extractWaterlowFromSnapshot(

  snapshot?: Record<string, unknown> | null,

): WaterlowMetadata {

  return extractObjectField<WaterlowMetadata>(snapshot, 'waterlow') ?? {}

}



export function extractMustFromSnapshot(snapshot?: Record<string, unknown> | null): MustMetadata {

  return extractObjectField<MustMetadata>(snapshot, 'must') ?? {}

}



export function extractFallsScreeningFromSnapshot(

  snapshot?: Record<string, unknown> | null,

): FallsScreeningMetadata {

  return normalizeFallsScreeningMetadata(extractSnapshotField(snapshot, 'fallsScreening'))

}



export function extractSkinIntegrityFromSnapshot(

  snapshot?: Record<string, unknown> | null,

): SkinIntegrityCheckMetadata {

  return normalizeSkinIntegrityCheckMetadata(extractSnapshotField(snapshot, 'skinIntegrityCheck'))

}



export function extractMcaScreeningFromSnapshot(

  snapshot?: Record<string, unknown> | null,

): McaScreeningStandaloneMetadata {

  const raw = extractSnapshotField(snapshot, 'mcaScreening')

  if (Array.isArray(raw)) return metadataFromMcaSnapshotRows(raw)

  return normalizeMcaScreeningStandaloneMetadata(raw ?? defaultMcaScreeningStandaloneMetadata())

}



export function extractPathwayFormValues(

  snapshot?: Record<string, unknown> | null,

): CarePlanDraftValues {

  const raw = snapshot?.formValues

  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as CarePlanDraftValues) : {}

}



const PANEL_SUMMARY_LABELS: Partial<Record<string, string>> = {

  'moving-handling': 'Moving and handling assessment completed',

  'pain-tool': 'Pain assessment completed',

  'therapy-memoire': 'Therapy aide memoire completed',

  'environment-assessment': 'Environment assessment completed',

  'advance-care-planning': 'Advance care planning completed',

  'end-of-life-assessment': 'End of life assessment completed',

  'mental-capacity-checklist': 'Mental capacity checklist completed',

  'photography-consent': 'Photography consent completed',

  peep: 'PEEP completed',

  'equipment-selection': 'Equipment selection recorded',

}



export function buildToolSnapshot(

  assessmentKey: string,

  carePathwayFormId: string | null | undefined,

  state: AssessmentToolCaptureState & {

    formName?: string

    notes?: string

  },

): Record<string, unknown> {

  const notes = state.notes?.trim()

  const panelId = resolveAssessmentPanelId(assessmentKey, carePathwayFormId)

  const tool = getAssessmentToolDefinition(assessmentKey)



  let core: Record<string, unknown> = {}

  if (panelId === 'waterlow') {

    core = { waterlow: enrichWaterlowMetadata(state.waterlow) }

  } else if (panelId === 'must') {

    core = { must: enrichMustMetadata(state.must) }

  } else if (panelId === 'falls-screening') {

    core = { fallsScreening: normalizeFallsScreeningMetadata(state.fallsScreening) }

  } else if (panelId === 'skin-integrity') {

    core = { skinIntegrityCheck: state.skinIntegrityCheck }

  } else if (panelId === 'mca-screening') {

    core = { mcaScreening: buildMcaSnapshotFromMetadata(state.mcaScreening) }

  } else if (panelId === 'moving-handling') {

    core = { movingHandlingOperations: state.movingHandlingOperations }

  } else if (panelId === 'pain-tool') {

    core = { painAssessment: state.painAssessment }

  } else if (panelId === 'therapy-memoire') {

    core = { therapyAideMemoire: state.therapyAideMemoire }

  } else if (panelId === 'environment-assessment') {

    core = { environmentAssessment: state.environmentAssessment }

  } else if (panelId === 'advance-care-planning') {

    core = { advanceCarePlanning: state.advanceCarePlanning }

  } else if (panelId === 'end-of-life-assessment') {

    core = { endOfLifeAssessment: state.endOfLifeAssessment }

  } else if (panelId === 'mental-capacity-checklist') {

    core = { mentalCapacityChecklist: state.mentalCapacityChecklist }

  } else if (panelId === 'photography-consent') {

    core = { photographyConsent: state.photographyConsent }

  } else if (panelId === 'peep') {

    core = { peep: normalizePeepSnapshot(state.peep) }

  } else if (panelId === 'equipment-selection') {

    core = {

      equipmentSelection: normalizeEquipmentSelectionMetadata(state.equipmentSelection),

      equipmentChecklist: state.equipmentChecklist ?? {},

    }

  } else if (panelId === 'pathway-form' && carePathwayFormId) {

    core = {

      carePathwayFormId,

      formName: state.formName ?? tool?.title ?? 'Care pathway assessment',

      formValues: state.formValues ?? {},

    }

  } else if (notes) {

    core = { notes }

  }



  if (notes && Object.keys(core).length > 0 && !('notes' in core)) {

    core.notes = notes

  }

  return core

}



export function buildAssessmentSummary(

  assessmentKey: string,

  snapshot: Record<string, unknown>,

): string | null {

  const panelId = resolveAssessmentPanelId(

    assessmentKey,

    typeof snapshot.carePathwayFormId === 'string' ? snapshot.carePathwayFormId : null,

  )



  if (panelId === 'waterlow') {

    const waterlow = enrichWaterlowMetadata(extractWaterlowFromSnapshot(snapshot))

    if (!isWaterlowScoringComplete(waterlow)) return null

    const score = waterlow.score ?? computeWaterlowScore(waterlow)

    return `Waterlow completed (score ${score}, ${waterlowBand(score).label})`

  }

  if (panelId === 'must') {

    const must = enrichMustMetadata(extractMustFromSnapshot(snapshot))

    if (!isMustScoringComplete(must)) return null

    const score = must.score ?? computeMustScore(must)

    const level = must.riskLevel ?? mustRiskLevel(score)

    return `MUST completed (score ${score}, ${mustRiskLabel(level)})`

  }

  if (panelId === 'falls-screening') {

    const falls = extractFallsScreeningFromSnapshot(snapshot)

    if (!isFallsScreeningComplete(falls)) return null

    return 'Falls screening completed'

  }

  if (panelId === 'skin-integrity') {

    const skin = extractSkinIntegrityFromSnapshot(snapshot)

    if (!skinIntegrityCheckHasEntries(skin)) return null

    return 'Skin integrity check recorded'

  }

  if (panelId === 'mca-screening') {

    const mca = extractMcaScreeningFromSnapshot(snapshot)

    if (!isMcaScreeningStandaloneComplete(mca)) return null

    return 'MCA screening completed'

  }

  if (panelId === 'pain-tool') {

    const pain = extractObjectField<PainAssessmentMetadata>(snapshot, 'painAssessment')

    const summary = formatPainAssessmentHistorySummary(pain)

    if (!summary) return null

    return summary

  }

  if (panelId === 'peep') {

    return formatPeepHistorySummary(normalizePeepSnapshot(extractSnapshotField(snapshot, 'peep')))

  }

  if (panelId === 'equipment-selection') {

    return formatEquipmentSelectionHistorySummary(

      normalizeEquipmentSelectionMetadata(extractSnapshotField(snapshot, 'equipmentSelection')),

    )

  }

  if (PANEL_SUMMARY_LABELS[panelId]) {

    const validationError = validateToolCapture(assessmentKey, null, snapshotToState(snapshot))

    if (validationError) return null

    return PANEL_SUMMARY_LABELS[panelId] ?? null

  }

  const formName = snapshot.formName

  if (typeof formName === 'string' && formName.trim()) {

    return `${formName.trim()} — manual completion`

  }

  return null

}



function snapshotToState(snapshot: Record<string, unknown>): AssessmentToolCaptureState {

  return emptyToolCaptureState(snapshot)

}



export function validateToolCapture(

  assessmentKey: string,

  carePathwayFormId: string | null | undefined,

  state: AssessmentToolCaptureState,

  options?: { assessmentConsent?: AssessmentConsentMetadata },

): string | null {

  if (options?.assessmentConsent?.consentObtained === false) {
    return null
  }

  const externalFallsConsent = options?.assessmentConsent?.consentObtained === true

  const panelId = resolveAssessmentPanelId(assessmentKey, carePathwayFormId)

  if (panelId === 'waterlow' && !isWaterlowScoringComplete(state.waterlow)) {

    return 'Complete all Waterlow scoring sections before saving.'

  }

  if (panelId === 'must' && !isMustScoringComplete(state.must)) {

    return 'Complete all MUST steps before saving.'

  }

  if (panelId === 'falls-screening' && !isFallsScreeningComplete(state.fallsScreening, { externalConsent: externalFallsConsent })) {

    return 'Complete all falls screening questions before saving.'

  }

  if (panelId === 'skin-integrity' && !skinIntegrityCheckHasEntries(state.skinIntegrityCheck)) {

    return 'Record at least one skin integrity finding before saving.'

  }

  if (panelId === 'mca-screening' && !isMcaScreeningStandaloneComplete(state.mcaScreening)) {

    return 'Complete all required MCA screening questions before saving.'

  }

  if (panelId === 'moving-handling' && !isMovingHandlingOperationsComplete(state.movingHandlingOperations)) {

    return 'Complete the moving and handling risk filter and task rows before saving.'

  }

  if (panelId === 'pain-tool' && !isPainAssessmentComplete(state.painAssessment)) {

    return 'Complete the pain assessment before saving.'

  }

  if (panelId === 'therapy-memoire' && !isTherapyAideMemoireComplete(state.therapyAideMemoire)) {

    return 'Complete the six therapy aide memoire items and the referral questions before saving.'

  }

  if (panelId === 'environment-assessment' && !isEnvironmentAssessmentComplete(state.environmentAssessment)) {

    return 'Complete all environment assessment questions before saving.'

  }

  if (panelId === 'advance-care-planning' && !isAdvanceCarePlanningComplete(state.advanceCarePlanning)) {

    return 'Complete all required advance care planning fields before saving.'

  }

  if (panelId === 'end-of-life-assessment' && !isEndOfLifeAssessmentComplete(state.endOfLifeAssessment)) {

    return 'Complete all end of life assessment questions before saving.'

  }

  if (

    panelId === 'mental-capacity-checklist' &&

    !isMentalCapacityChecklistComplete(state.mentalCapacityChecklist)

  ) {

    return 'Complete the mental capacity checklist before saving.'

  }

  if (panelId === 'photography-consent' && !isPhotographyConsentComplete(state.photographyConsent)) {

    return 'Complete all photography consent fields before saving.'

  }

  if (panelId === 'peep' && !isPeepSnapshotComplete(state.peep)) {

    return 'Complete the personal emergency evacuation plan before saving.'

  }

  if (panelId === 'equipment-selection' && !isEquipmentSelectionComplete(state.equipmentSelection)) {

    return 'Record the selected risk level and equipment before saving.'

  }

  return null

}



export {

  defaultAdvanceCarePlanningMetadata,

  defaultEndOfLifeAssessmentMetadata,

  defaultEnvironmentAssessmentMetadata,

  defaultMentalCapacityChecklistMetadata,

  defaultMovingHandlingOperationsMetadata,

  defaultPhotographyConsentMetadata,

  defaultTherapyAideMemoireMetadata,

}


