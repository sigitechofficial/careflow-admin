/**
 * Shared assessment tool registry — keep in sync with
 * careflow-api/src/service-user-assessments/assessment-tool-registry.ts (IA_ASSESSMENT_TOOL_CATALOGUE).
 *
 * IA submit promotion and Care Plan capture both use the same assessmentKey + snapshot shape.
 */
export type AssessmentToolPanelId =
  | 'waterlow'
  | 'must'
  | 'falls-screening'
  | 'skin-integrity'
  | 'mca-screening'
  | 'moving-handling'
  | 'pain-tool'
  | 'therapy-memoire'
  | 'environment-assessment'
  | 'advance-care-planning'
  | 'end-of-life-assessment'
  | 'mental-capacity-checklist'
  | 'photography-consent'
  | 'peep'
  | 'equipment-selection'
  | 'pathway-form'
  | 'generic'

export type AssessmentToolDefinition = {
  assessmentKey: string
  title: string
  holisticTabId: number
  /** Property name inside completion.snapshot (matches IA promotion). */
  snapshotKey: string
  panelId: AssessmentToolPanelId
}

/** IA holistic tools promoted on submit and available for Care Plan capture. */
export const IA_ASSESSMENT_TOOL_REGISTRY: AssessmentToolDefinition[] = [
  {
    assessmentKey: 'mca-screening',
    title: 'MCA screening',
    holisticTabId: 3,
    snapshotKey: 'mcaScreening',
    panelId: 'mca-screening',
  },
  {
    assessmentKey: 'skin-integrity',
    title: 'Skin integrity',
    holisticTabId: 4,
    snapshotKey: 'skinIntegrityCheck',
    panelId: 'skin-integrity',
  },
  {
    assessmentKey: 'waterlow',
    title: 'Waterlow',
    holisticTabId: 5,
    snapshotKey: 'waterlow',
    panelId: 'waterlow',
  },
  {
    assessmentKey: 'equipment-selection',
    title: 'Equipment selection',
    holisticTabId: 6,
    snapshotKey: 'equipmentSelection',
    panelId: 'equipment-selection',
  },
  {
    assessmentKey: 'must',
    title: 'MUST',
    holisticTabId: 7,
    snapshotKey: 'must',
    panelId: 'must',
  },
  {
    assessmentKey: 'falls-screening',
    title: 'Falls screening',
    holisticTabId: 8,
    snapshotKey: 'fallsScreening',
    panelId: 'falls-screening',
  },
  {
    assessmentKey: 'moving-handling',
    title: 'Moving and handling',
    holisticTabId: 9,
    snapshotKey: 'movingHandlingOperations',
    panelId: 'moving-handling',
  },
  {
    assessmentKey: 'pain-tool',
    title: 'Pain assessment',
    holisticTabId: 10,
    snapshotKey: 'painAssessment',
    panelId: 'pain-tool',
  },
  {
    assessmentKey: 'therapy-memoire',
    title: 'Therapy aide memoire',
    holisticTabId: 11,
    snapshotKey: 'therapyAideMemoire',
    panelId: 'therapy-memoire',
  },
  {
    assessmentKey: 'environment-assessment',
    title: 'Environment assessment',
    holisticTabId: 12,
    snapshotKey: 'environmentAssessment',
    panelId: 'environment-assessment',
  },
  {
    assessmentKey: 'advance-care-planning',
    title: 'Advance care planning',
    holisticTabId: 13,
    snapshotKey: 'advanceCarePlanning',
    panelId: 'advance-care-planning',
  },
  {
    assessmentKey: 'end-of-life-assessment',
    title: 'End of life assessment',
    holisticTabId: 14,
    snapshotKey: 'endOfLifeAssessment',
    panelId: 'end-of-life-assessment',
  },
  {
    assessmentKey: 'mental-capacity-checklist',
    title: 'Mental capacity checklist',
    holisticTabId: 17,
    snapshotKey: 'mentalCapacityChecklist',
    panelId: 'mental-capacity-checklist',
  },
  {
    assessmentKey: 'photography-consent',
    title: 'Photography consent',
    holisticTabId: 18,
    snapshotKey: 'photographyConsent',
    panelId: 'photography-consent',
  },
  {
    assessmentKey: 'peep',
    title: 'Personal Emergency Evacuation Plan',
    holisticTabId: 19,
    snapshotKey: 'peep',
    panelId: 'peep',
  },
]

const REGISTRY_BY_KEY = new Map(
  IA_ASSESSMENT_TOOL_REGISTRY.map((tool) => [tool.assessmentKey, tool]),
)

export function getAssessmentToolDefinition(
  assessmentKey: string,
): AssessmentToolDefinition | undefined {
  return REGISTRY_BY_KEY.get(assessmentKey)
}

export function resolveAssessmentPanelId(
  assessmentKey: string,
  carePathwayFormId?: string | null,
): AssessmentToolPanelId {
  if (carePathwayFormId) return 'pathway-form'
  return getAssessmentToolDefinition(assessmentKey)?.panelId ?? 'generic'
}

export function hasStructuredAssessmentPanel(
  assessmentKey: string,
  carePathwayFormId?: string | null,
): boolean {
  const panelId = resolveAssessmentPanelId(assessmentKey, carePathwayFormId)
  return panelId !== 'generic'
}

