import type { ReactNode } from 'react'
import { HolisticFooterFields } from '@/features/service-users/initial-assessment/components/holistic/HolisticFooterFields'
import { InitialAssessmentDocumentPlaceholder } from '@/features/service-users/initial-assessment/components/InitialAssessmentDocumentPlaceholder'
import { InitialAssessmentMcaLinkBanner } from '@/features/service-users/initial-assessment/components/InitialAssessmentMcaLinkBanner'
import { InitialAssessmentTabLinkBanner } from '@/features/service-users/initial-assessment/components/InitialAssessmentTabLinkBanner'
import { InitialAssessmentMcaScreeningPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMcaScreeningPanel'
import { InitialAssessmentPainAssessmentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentPainAssessmentPanel'
import { InitialAssessmentTherapyAideMemoirePanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentTherapyAideMemoirePanel'
import { InitialAssessmentEnvironmentAssessmentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentEnvironmentAssessmentPanel'
import { InitialAssessmentAdvanceCarePlanningPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentAdvanceCarePlanningPanel'
import { InitialAssessmentEndOfLifeAssessmentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentEndOfLifeAssessmentPanel'
import { InitialAssessmentClinicalOutcomeSummaryPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentClinicalOutcomeSummaryPanel'
import { InitialAssessmentAgreedGoalsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentAgreedGoalsPanel'
import type { AgreedGoalsMetadata } from '@/features/service-users/initial-assessment/utils/agreed-goals'
import { InitialAssessmentCarePlanObjectivesPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentCarePlanObjectivesPanel'
import { InitialAssessmentMentalCapacityChecklistPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMentalCapacityChecklistPanel'
import { InitialAssessmentConsentPhotographyPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentConsentPhotographyPanel'
import { consentGiver } from '@/features/service-users/initial-assessment/utils/consent-capacity'
import {
  completedDecisionFor,
  consentToCareCapacityState,
  type CapacityDecisionNeed,
  type CapacityDecisionRecord,
} from '@/features/service-users/initial-assessment/utils/capacity-decisions'
import { IA_CALLOUT_AMBER_CLASS, IA_CALLOUT_NEUTRAL_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import { cn } from '@/shared/lib/utils'
import { formatDisplayDate } from '@/shared/lib/display-format.util'
import type { LegalAuthorityRow } from '@/features/service-users/initial-assessment/utils/legal-authority-coverage'
import { InitialAssessmentSpecialistTriggerNote } from '@/features/service-users/initial-assessment/components/InitialAssessmentSpecialistTriggerNote'
import { InitialAssessmentAssessmentSummaryPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentAssessmentSummaryPanel'
import type { AssessmentSummary } from '@/features/service-users/initial-assessment/utils/assessment-summary'
import {
  carePlanVisitIdsFromSections,
  detectCarePlanEquipmentInUse,
} from '@/features/service-users/initial-assessment/utils/care-plan-objectives'
import { InitialAssessmentConditionsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentConditionsPanel'
import type { ConditionProposal } from '@/features/service-users/initial-assessment/utils/condition-proposals'
import { InitialAssessmentCapacityDecisionsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentCapacityDecisionsPanel'
import { findQuestionByFieldKey, isYesAnswer } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { InitialAssessmentQuestionField } from '@/features/service-users/initial-assessment/components/InitialAssessmentQuestionField'
import { InitialAssessmentSection12Content } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12Content'
import { InitialAssessmentPaperSection4Block } from '@/features/service-users/initial-assessment/components/InitialAssessmentPaperSection4Block'
import { InitialAssessmentPaperSection5EmotionalBlock } from '@/features/service-users/initial-assessment/components/InitialAssessmentPaperSection5EmotionalBlock'
import { InitialAssessmentPaperSection7AdlBlock } from '@/features/service-users/initial-assessment/components/InitialAssessmentPaperSection7AdlBlock'
import { InitialAssessmentAboutMeSection } from '@/features/service-users/initial-assessment/components/InitialAssessmentAboutMeSection'
import { InitialAssessmentSectionQuestions } from '@/features/service-users/initial-assessment/components/InitialAssessmentSectionQuestions'
import { InitialAssessmentSignOffPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSignOffPanel'
import { InitialAssessmentTotalSkinIntegrityCheckPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentTotalSkinIntegrityCheckPanel'
import { InitialAssessmentEquipmentSelectionPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentEquipmentSelectionPanel'
import { InitialAssessmentEquipmentChecklistPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentEquipmentChecklistPanel'
import { InitialAssessmentFallsScreeningPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentFallsScreeningPanel'
import { shouldShowQuestion } from '@/features/service-users/initial-assessment/utils/conditional-visibility'
import { InitialAssessmentFallsHistoryPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentFallsHistoryPanel'
import { fallsCaseFindingFromAnswers } from '@/features/service-users/initial-assessment/utils/falls-case-finding'
import {
  filterSection12Questions,
  section12FallsHistoryQuestions,
} from '@/features/service-users/initial-assessment/utils/section-12-mobility'
import { InitialAssessmentMovingHandlingOperationsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMovingHandlingOperationsPanel'
import { InitialAssessmentMustPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMustPanel'
import { InitialAssessmentWaterlowPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentWaterlowPanel'
import type { ServiceUserDetail } from '@/features/service-users/api'
import {
  FINAL_TAB_CONSENT_TO_CARE_SPEC_REFS,
  FINAL_TAB_REVIEW_SPEC_REFS,
  filterQuestionsForHolisticTab,
  holisticMultiSectionSliceKey,
  holisticTabRef,
  type HolisticAssessmentTab,
  type SectionQuestionFilter,
} from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import { getVisibleSectionQuestions } from '@/features/service-users/initial-assessment/utils/visible-section-questions'
import {
  isPaperSection4MainSlice,
  isPaperSection4TailSlice,
} from '@/features/service-users/initial-assessment/utils/section-4-physical-assessment-display-order'
import { isPaperSection7AdlSlice } from '@/features/service-users/initial-assessment/utils/section-7-adl-display-order'
import type { PainAssessmentMetadata } from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'
import { recommendedPainScale } from '@/features/service-users/initial-assessment/utils/pain-questions'
import type { AdlWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import type {
  DailyLivingAidsMetadata,
  EquipmentChecklistMetadata,
  FinanceSupportMetadata,
  PracticalCareTasksMetadata,
  TransferMatrixMetadata,
} from '@/features/service-users/initial-assessment/utils/mobility-metadata'
import type { SkinIntegrityCheckMetadata } from '@/features/service-users/initial-assessment/utils/skin-integrity-check'
import type { FallsScreeningMetadata } from '@/features/service-users/initial-assessment/utils/falls-screening'
import type { MovingHandlingOperationsMetadata } from '@/features/service-users/initial-assessment/utils/moving-handling-operations'
import type { EnvironmentAssessmentMetadata } from '@/features/service-users/initial-assessment/utils/environment-assessment'
import type { AdvanceCarePlanningMetadata } from '@/features/service-users/initial-assessment/utils/advance-care-planning'
import type { EndOfLifeAssessmentMetadata } from '@/features/service-users/initial-assessment/utils/end-of-life-assessment'
import type { ClinicalAssessmentOutcomeSummaryMetadata } from '@/features/service-users/initial-assessment/utils/clinical-assessment-outcome-summary'
import type { CarePlanObjectivesMetadata } from '@/features/service-users/initial-assessment/utils/care-plan-objectives'
import {
  MENTAL_CAPACITY_SCREENING_SYNCED_IDS,
  type MentalCapacityChecklistMetadata,
} from '@/features/service-users/initial-assessment/utils/mental-capacity-checklist'
import type { PhotographyConsentMetadata } from '@/features/service-users/initial-assessment/utils/photography-consent'
import type { EquipmentSelectionMetadata } from '@/features/service-users/initial-assessment/utils/equipment-selection'
import type { MustMetadata } from '@/features/service-users/initial-assessment/utils/must-scoring'
import {
  type WaterlowMetadata,
} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'
import {
  findMcaCompletedQuestion,
  findMcaRequiredQuestion,
  isMcaRequiredYes,
} from '@/features/service-users/initial-assessment/utils/mca-required'
import {
  mergePrefillAnswer,
  prefillHintForQuestion,
  prefillKeyForQuestion,
} from '@/features/service-users/initial-assessment/utils/question-prefill'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import { movingHandlingUsesHoist } from '@/features/service-users/initial-assessment/utils/sync-hoist-from-moving-handling'
import type { EnvironmentAssessmentLoneWorkerFactorId } from '@/features/service-users/initial-assessment/utils/environment-assessment'

type Section12Bundle = {
  adl: AdlWorksheetMetadata
  transfers: TransferMatrixMetadata
  equipmentChecklist: EquipmentChecklistMetadata
  equipmentChecklistVisible: boolean
  dailyLivingAids: DailyLivingAidsMetadata
  practicalCare: PracticalCareTasksMetadata
  financeSupport: FinanceSupportMetadata
  financeSupportVisible: boolean
  financeConsentQuestion?: InitialAssessmentQuestion
  renderFinanceConsentField?: () => ReactNode
  onAdlChange: (next: AdlWorksheetMetadata) => void
  onTransfersChange: (next: TransferMatrixMetadata) => void
  onEquipmentChecklistChange: (next: EquipmentChecklistMetadata) => void
  onDailyLivingAidsChange: (next: DailyLivingAidsMetadata) => void
  onPracticalCareChange: (next: PracticalCareTasksMetadata) => void
  onFinanceSupportChange: (next: FinanceSupportMetadata) => void
}

type Props = {
  tab: HolisticAssessmentTab
  sections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  prefillMap: Map<string, string>
  questionErrors?: Map<string, string>
  disabled: boolean
  serviceUserId: string
  submissionId: string | null
  serviceUserDetail?: ServiceUserDetail | null
  excludeQuestionIds?: Set<string>
  painAssessment: PainAssessmentMetadata
  waterlow: WaterlowMetadata
  mustAssessment: MustMetadata
  fallsScreening: FallsScreeningMetadata
  movingHandlingOperations: MovingHandlingOperationsMetadata
  environmentAssessment: EnvironmentAssessmentMetadata
  advanceCarePlanning: AdvanceCarePlanningMetadata
  endOfLifeAssessment: EndOfLifeAssessmentMetadata
  clinicalOutcomeSummary: ClinicalAssessmentOutcomeSummaryMetadata
  carePlanObjectives: CarePlanObjectivesMetadata
  agreedGoals: AgreedGoalsMetadata
  mentalCapacityChecklist: MentalCapacityChecklistMetadata
  photographyConsent: PhotographyConsentMetadata
  equipmentSelection: EquipmentSelectionMetadata
  skinIntegrityCheck: SkinIntegrityCheckMetadata
  sectionFooter?: { dateCompleted?: string; assessorNameDesignation?: string }
  showBodyMapCta?: boolean
  onSyncEmergencyContact?: () => void
  onMarkMedicationVerified?: () => void
  onSyncBodyMap?: () => void
  syncBodyMapLoading?: boolean
  onOpenWaterlowTab?: () => void
  onOpenEnvironmentAssessmentTab?: () => void
  onOpenFallsScreeningTab?: () => void
  onOpenSkinIntegrityCheckTab?: () => void
  onOpenMcaScreeningTab?: () => void
  onOpenMustTab?: () => void
  onOpenPersonalDetailsTab?: () => void
  onOpenEndOfLifeTab?: () => void
  onOpenAdvanceCarePlanningTab?: () => void
  onOpenInfectionControlTab?: () => void
  onPainAssessmentChange: (next: PainAssessmentMetadata) => void
  onWaterlowChange: (next: WaterlowMetadata) => void
  /** Decision-specific capacity records (`metadata.capacityDecisions`). */
  capacityDecisions?: CapacityDecisionRecord[]
  capacityDecisionNeeds?: CapacityDecisionNeed[]
  /** Old IA that only has the global §2.mca screening. */
  legacyCapacityScreening?: boolean
  legacyCapacityScreeningAnswered?: boolean
  capacityAssessorName?: string
  /** Read-only overview shown on the outcome summary tab. */
  assessmentSummary?: AssessmentSummary
  /** Current conditions staged in the IA (`metadata.conditionProposals`). */
  conditionProposals?: ConditionProposal[]
  onConditionProposalsChange?: (next: ConditionProposal[]) => void
  /** Legal authority register rows (for "who decides" coverage on capacity records). */
  legalAuthorities?: LegalAuthorityRow[]
  onCapacityDecisionsChange?: (next: CapacityDecisionRecord[]) => void
  onMustAssessmentChange: (next: MustMetadata) => void
  onFallsScreeningChange: (next: FallsScreeningMetadata) => void
  onMovingHandlingOperationsChange: (next: MovingHandlingOperationsMetadata) => void
  onEnvironmentAssessmentChange: (next: EnvironmentAssessmentMetadata) => void
  onAdvanceCarePlanningChange: (next: AdvanceCarePlanningMetadata) => void
  onEndOfLifeAssessmentChange: (next: EndOfLifeAssessmentMetadata) => void
  onClinicalOutcomeSummaryChange: (next: ClinicalAssessmentOutcomeSummaryMetadata) => void
  onCarePlanObjectivesChange: (next: CarePlanObjectivesMetadata) => void
  onAgreedGoalsChange: (next: AgreedGoalsMetadata) => void
  onMentalCapacityChecklistChange: (
    updater:
      | MentalCapacityChecklistMetadata
      | ((prev: MentalCapacityChecklistMetadata) => MentalCapacityChecklistMetadata),
    options?: { immediate?: boolean },
  ) => void
  onPhotographyConsentChange: (next: PhotographyConsentMetadata) => void
  onEquipmentSelectionChange: (next: EquipmentSelectionMetadata) => void
  onSkinIntegrityRowSideChange: (rowId: string, side: 'right' | 'left', text: string) => void
  onSectionFooterChange?: (patch: {
    dateCompleted?: string
    assessorNameDesignation?: string
  }) => void
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void
  section12: Section12Bundle
  /** Lone-worker factor context (system facts, other tabs) shown on the Environment tab. */
  loneWorkerFactorHints?: Partial<Record<EnvironmentAssessmentLoneWorkerFactorId, string>>
}

/** §12.5 answers derived from the Moving & Handling tasks — never asked directly. */
const MOBILITY_DERIVED_FIELD_KEYS = new Set(['usesHoistOrSling', 'transferSupportRequired'])

/** Hoist recorded in the M&H tasks, or (older IAs) the §12.5a "Uses hoist or sling?" answer. */
function hoistRecordedInUse(
  sections: InitialAssessmentSection[],
  answers: Record<string, InitialAssessmentAnswerInput>,
  movingHandling: MovingHandlingOperationsMetadata,
): boolean {
  const fromTasks = movingHandlingUsesHoist(movingHandling)
  if (fromTasks !== undefined) return fromTasks
  const q = findQuestionByFieldKey(sections, 'usesHoistOrSling')
  return Boolean(q && isYesAnswer(answers[q.id]))
}

const FINAL_TAB_PANEL_CLASS =
  'mt-6 space-y-4 rounded-sm border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-card'

function toHolisticTabSlice(
  tab: HolisticAssessmentTab,
  sectionNumber: number,
  filter?: SectionQuestionFilter,
): HolisticAssessmentTab {
  return {
    id: tab.id,
    displayNumber: tab.displayNumber,
    title: tab.title,
    kind: 'form-section',
    enterpriseSection: sectionNumber,
    ...filter,
  }
}

export function InitialAssessmentDocumentTabContent({
  tab,
  sections,
  draftAnswers,
  prefillMap,
  questionErrors,
  disabled,
  serviceUserId,
  submissionId,
  serviceUserDetail,
  excludeQuestionIds,
  painAssessment,
  waterlow,
  mustAssessment,
  fallsScreening,
  movingHandlingOperations,
  environmentAssessment,
  advanceCarePlanning,
  endOfLifeAssessment,
  clinicalOutcomeSummary,
  carePlanObjectives,
  agreedGoals,
  mentalCapacityChecklist,
  photographyConsent,
  equipmentSelection,
  skinIntegrityCheck,
  sectionFooter,
  showBodyMapCta,
  onSyncEmergencyContact,
  onMarkMedicationVerified,
  onSyncBodyMap,
  syncBodyMapLoading,
  onOpenWaterlowTab,
  onOpenEnvironmentAssessmentTab,
  onOpenFallsScreeningTab,
  onOpenSkinIntegrityCheckTab,
  onOpenMcaScreeningTab,
  onOpenMustTab,
  onOpenPersonalDetailsTab,
  onOpenEndOfLifeTab,
  onOpenAdvanceCarePlanningTab,
  onOpenInfectionControlTab,
  onPainAssessmentChange,
  onWaterlowChange,
  capacityDecisions = [],
  capacityDecisionNeeds = [],
  legacyCapacityScreening = false,
  legacyCapacityScreeningAnswered = false,
  capacityAssessorName,
  assessmentSummary,
  conditionProposals = [],
  onConditionProposalsChange,
  legalAuthorities = [],
  onCapacityDecisionsChange,
  onMustAssessmentChange,
  onFallsScreeningChange,
  onMovingHandlingOperationsChange,
  onEnvironmentAssessmentChange,
  onAdvanceCarePlanningChange,
  onEndOfLifeAssessmentChange,
  onClinicalOutcomeSummaryChange,
  onCarePlanObjectivesChange,
  onAgreedGoalsChange,
  onMentalCapacityChecklistChange,
  onPhotographyConsentChange,
  onEquipmentSelectionChange,
  onSkinIntegrityRowSideChange,
  onSectionFooterChange,
  onChange,
  section12,
  loneWorkerFactorHints,
}: Props) {
  const footer = onSectionFooterChange ? (
    <HolisticFooterFields
      serviceUserDetail={serviceUserDetail}
      dateCompleted={sectionFooter?.dateCompleted}
      assessorNameDesignation={sectionFooter?.assessorNameDesignation}
      disabled={disabled}
      onDateChange={(dateCompleted) => onSectionFooterChange({ dateCompleted })}
      onAssessorChange={(assessorNameDesignation) =>
        onSectionFooterChange({ assessorNameDesignation })
      }
    />
  ) : null

  if (tab.kind === 'placeholder') {
    return (
      <>
        <InitialAssessmentDocumentPlaceholder title={tab.title} hint={tab.placeholderHint} />
        {footer}
      </>
    )
  }

  const renderMcaField = (q: InitialAssessmentQuestion, fieldOptions?: { hideLabel?: boolean }) => (
    <>
    <InitialAssessmentQuestionField
      question={q}
      value={mergePrefillAnswer(q, draftAnswers[q.id], prefillMap)}
      errorMessage={questionErrors?.get(q.id)}
      disabled={disabled}
      serviceUserId={serviceUserId}
      submissionId={submissionId}
      layout="simple"
      hideLabel={fieldOptions?.hideLabel}
      prefillHint={prefillHintForQuestion(q, prefillMap)}
      onChange={(patch) => onChange(q.id, patch)}
    />
    <InitialAssessmentSpecialistTriggerNote questionId={q.id} />
    </>
  )

  const renderAppendedSection = (appended: NonNullable<HolisticAssessmentTab['appendedSection']>) => {
    const { sectionNumber, ...filter } = appended
    const section = sections.find((s) => s.sectionNumber === sectionNumber)
    if (!section) return null
    return (
      <div className="mt-6">
        <InitialAssessmentSectionQuestions
          key={`${tab.id}-appended-${sectionNumber}`}
          section={section}
          allSections={sections}
          draftAnswers={draftAnswers}
          prefillMap={prefillMap}
          questionErrors={questionErrors}
          disabled={disabled}
          serviceUserId={serviceUserId}
          submissionId={submissionId}
          serviceUserDetail={serviceUserDetail}
          onSyncEmergencyContact={onSyncEmergencyContact}
          onOpenEnvironmentAssessmentTab={onOpenEnvironmentAssessmentTab}
          excludeQuestionIds={excludeQuestionIds}
          holisticTab={toHolisticTabSlice(tab, sectionNumber, filter)}
          onChange={onChange}
        />
      </div>
    )
  }

  if (tab.kind === 'mca-screening') {
    const section2 = sections.find((s) => s.sectionNumber === 2)
    const mcaRequiredQ = findMcaRequiredQuestion(sections)
    const mcaCompletedQ = findMcaCompletedQuestion(sections)
    const gateQuestions = [mcaRequiredQ, mcaCompletedQ].filter(
      (q): q is NonNullable<typeof q> => Boolean(q),
    )
    return (
      <>
        {gateQuestions.length > 0 ? (
          <div
            className="space-y-4 rounded-sm border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-card"
            data-testid="ia-mca-required-gate"
          >
            <p className="text-sm font-semibold text-foreground">MCA requirement</p>
            <p className="text-sm text-muted-foreground">
              Answer here once. Screening questions appear when MCA is required; the full checklist
              ({holisticTabRef(17)}) is only needed when this is Yes.
            </p>
            {gateQuestions.map((q) => renderMcaField(q))}
          </div>
        ) : null}
        <InitialAssessmentCapacityDecisionsPanel
          records={capacityDecisions}
          needs={capacityDecisionNeeds}
          disabled={disabled || !onCapacityDecisionsChange}
          assessorName={capacityAssessorName}
          legalAuthorities={legalAuthorities}
          onChange={(next) => onCapacityDecisionsChange?.(next)}
        />
        {/* Old IAs recorded one global screening — kept readable; editable only while still in use. */}
        {legacyCapacityScreening || legacyCapacityScreeningAnswered ? (
          <>
            <p className={cn(IA_CALLOUT_NEUTRAL_CLASS, 'text-sm')} data-testid="ia-mca-legacy-note">
              Earlier capacity screening (one screening for the whole assessment). New assessments record each
              decision above.
            </p>
            <InitialAssessmentMcaScreeningPanel
              allSections={sections}
              renderField={renderMcaField}
              disabled={disabled || !legacyCapacityScreening}
            />
          </>
        ) : null}
        {section2 ? (
          <InitialAssessmentSectionQuestions
            section={section2}
            allSections={sections}
            draftAnswers={draftAnswers}
            prefillMap={prefillMap}
            questionErrors={questionErrors}
            disabled={disabled}
            serviceUserId={serviceUserId}
            submissionId={submissionId}
            serviceUserDetail={serviceUserDetail}
            onChange={onChange}
            holisticTab={{
              id: tab.id,
              displayNumber: tab.displayNumber,
              title: tab.title,
              kind: 'form-section',
              enterpriseSection: 2,
              specRefs: ['2.6', '2.9'],
            }}
            suppressIntro
          />
        ) : null}
        {footer}
      </>
    )
  }

  if (tab.kind === 'waterlow') {
    return (
      <>
        <InitialAssessmentTabLinkBanner
          title="Measurements & MUST"
          body={`Use ${holisticTabRef(1)} for height/weight/appetite narrative. Waterlow scores pressure risk here; MUST (${holisticTabRef(7)}) scores malnutrition. Score also syncs to Equipment Selection.`}
          actionLabel={`Open MUST (${holisticTabRef(7)})`}
          onAction={onOpenMustTab}
          testId="ia-waterlow-link-banner"
        />
        <InitialAssessmentWaterlowPanel
          value={waterlow}
          disabled={disabled}
          onChange={onWaterlowChange}
        />
      </>
    )
  }

  if (tab.kind === 'equipment-selection') {
    return (
      <>
        <InitialAssessmentTabLinkBanner
          title="Waterlow score"
          body={`Pressure ulcer risk score comes from ${holisticTabRef(5)} (Waterlow) and syncs into this form when available.`}
          actionLabel={`Open Waterlow (${holisticTabRef(5)})`}
          onAction={onOpenWaterlowTab}
          testId="ia-equipment-waterlow-link-banner"
        />
        <InitialAssessmentEquipmentSelectionPanel
          value={equipmentSelection}
          waterlow={waterlow}
          disabled={disabled}
          onChange={onEquipmentSelectionChange}
        />
        {section12 ? (
          <div className="mt-6">
            <InitialAssessmentEquipmentChecklistPanel
              visible
              embedded={false}
              hoistInUse={hoistRecordedInUse(sections, draftAnswers, movingHandlingOperations)}
              value={section12.equipmentChecklist}
              disabled={disabled}
              onChange={section12.onEquipmentChecklistChange}
            />
          </div>
        ) : null}
      </>
    )
  }

  if (tab.kind === 'must-tool') {
    return (
      <>
        <InitialAssessmentTabLinkBanner
          title="Weight & nutrition measurements"
          body={`Height, weight and appetite live on ${holisticTabRef(1)}. This MUST tool scores malnutrition risk — don’t re-enter kg/BMI here as free text.`}
          actionLabel={`Open Personal Details (${holisticTabRef(1)})`}
          onAction={onOpenPersonalDetailsTab}
          testId="ia-must-link-banner"
        />
        <InitialAssessmentMustPanel
          value={mustAssessment}
          disabled={disabled}
          onChange={onMustAssessmentChange}
        />
      </>
    )
  }

  if (tab.kind === 'falls-screening') {
    const section12 = sections.find((s) => s.sectionNumber === 12)
    const historyQuestions = section12
      ? section12FallsHistoryQuestions(section12.questions).filter((q) =>
          shouldShowQuestion(q, sections, draftAnswers),
        )
      : []
    return (
      <>
        <InitialAssessmentFallsHistoryPanel
          questions={historyQuestions}
          caseFinding={fallsCaseFindingFromAnswers(sections, draftAnswers)}
          renderField={(q) => renderMcaField(q)}
        />
        <InitialAssessmentFallsScreeningPanel
          value={fallsScreening}
          disabled={disabled}
          onChange={onFallsScreeningChange}
        />
      </>
    )
  }

  // §12.5 mobility facts (bed-bound, amputation, transfers, care locations) are read by care plans
  // and risk generation; hoist use and transfer support stay hidden and derived from the tasks.
  const mobilityFactQuestions =
    tab.kind === 'moving-handling'
      ? filterSection12Questions(
          sections.find((s) => s.sectionNumber === 12)?.questions ?? [],
        )
          .filter((q) => typeof q.metadata?.specRef === 'string' && q.metadata.specRef.startsWith('12.5'))
          .filter((q) => !MOBILITY_DERIVED_FIELD_KEYS.has(String(q.metadata?.fieldKey ?? '')))
          .filter((q) => shouldShowQuestion(q, sections, draftAnswers))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      : []

  if (tab.kind === 'moving-handling') {
    return (
      <>
        <InitialAssessmentTabLinkBanner
          title="Fall history"
          body={`Recent falls and medicines-related fall risk are recorded on ${holisticTabRef(8)} (Falls Screening). Answers sync into this risk filter when empty.`}
          actionLabel={`Open Falls Screening (${holisticTabRef(8)})`}
          onAction={onOpenFallsScreeningTab}
          testId="ia-mh-falls-link-banner"
        />
        <InitialAssessmentMovingHandlingOperationsPanel
          value={movingHandlingOperations}
          disabled={disabled}
          onChange={onMovingHandlingOperationsChange}
        />
        {mobilityFactQuestions.length > 0 ? (
          <div
            className="mt-6 space-y-4 rounded-sm border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-card"
            data-testid="ia-mh-mobility-facts"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">Mobility details</p>
              <p className="text-sm text-muted-foreground">
                Hoist use and transfer support are worked out from the tasks above.
              </p>
            </div>
            {mobilityFactQuestions.map((q) => (
              <div key={q.id}>{renderMcaField(q)}</div>
            ))}
          </div>
        ) : null}
      </>
    )
  }

  if (tab.kind === 'pain-tool') {
    return (
      <InitialAssessmentPainAssessmentPanel
        value={painAssessment}
        disabled={disabled}
        recommendedScale={recommendedPainScale(sections, draftAnswers)}
        onChange={onPainAssessmentChange}
      />
    )
  }

  if (tab.kind === 'therapy-memoire') {
    return (
      <>
        <InitialAssessmentTabLinkBanner
          title="Swallow, mobility & care package"
          body={`Full swallow/SALT detail is on ${holisticTabRef(1)} (§5/§8). Fall history on ${holisticTabRef(8)}. Care package existence on ${holisticTabRef(1)} Social history; practical tasks on ${holisticTabRef(2)}. Use this aide-memoire for therapy referral flags only.`}
          actionLabel={`Open Falls Screening (${holisticTabRef(8)})`}
          onAction={onOpenFallsScreeningTab}
          testId="ia-therapy-link-banner"
        />
        <InitialAssessmentTherapyAideMemoirePanel
          value={painAssessment.therapyAideMemoire ?? {}}
          disabled={disabled}
          onChange={(therapyAideMemoire) =>
            onPainAssessmentChange({ ...painAssessment, therapyAideMemoire })
          }
        />
      </>
    )
  }

  if (tab.kind === 'environment-assessment') {
    return (
      <>
        <InitialAssessmentTabLinkBanner
          title="Pets & home hazards"
          body={`This worksheet is the master for pets/hazards; the §3 home-safety questions are below it. Infection detail → ${holisticTabRef(21)}; fire → ${holisticTabRef(22)}.`}
          actionLabel={`Open Infection Control (${holisticTabRef(21)})`}
          onAction={onOpenInfectionControlTab}
          testId="ia-env-link-banner"
        />
        <InitialAssessmentEnvironmentAssessmentPanel
          value={environmentAssessment}
          factorHints={loneWorkerFactorHints}
          disabled={disabled}
          onChange={onEnvironmentAssessmentChange}
        />
        {tab.appendedSection ? renderAppendedSection(tab.appendedSection) : null}
      </>
    )
  }

  if (tab.kind === 'advance-care-planning') {
    return (
      <>
        <InitialAssessmentTabLinkBanner
          title="Identity, GP & LPA"
          body={`Name, DOB, NHS number, GP and LPA prefill from ${holisticTabRef(1)} when empty. Resuscitation / DNACPR Yes-No is mastered on ${holisticTabRef(14)} (EOL) and syncs to DNACPR template fields.`}
          actionLabel={`Open End of Life (${holisticTabRef(14)})`}
          onAction={onOpenEndOfLifeTab}
          testId="ia-acp-link-banner"
        />
        <InitialAssessmentAdvanceCarePlanningPanel
          value={advanceCarePlanning}
          disabled={disabled}
          onChange={onAdvanceCarePlanningChange}
        />
      </>
    )
  }

  if (tab.kind === 'end-of-life-assessment') {
    return (
      <>
        <InitialAssessmentMcaLinkBanner
          variant="eol"
          onOpenMcaScreeningTab={onOpenMcaScreeningTab}
        />
        <InitialAssessmentTabLinkBanner
          title="DNACPR / resuscitation"
          body={`Record DNR status here. Advance wishes / ADRT stay on ${holisticTabRef(13)} (ACP). DNACPR template fields sync from this answer.`}
          actionLabel={`Open Advance Care Planning (${holisticTabRef(13)})`}
          onAction={onOpenAdvanceCarePlanningTab}
          testId="ia-eol-dnacpr-link-banner"
        />
        <InitialAssessmentEndOfLifeAssessmentPanel
          value={endOfLifeAssessment}
          disabled={disabled}
          onChange={onEndOfLifeAssessmentChange}
        />
      </>
    )
  }

  if (tab.kind === 'clinical-outcome-summary') {
    // Review columns belong to reviews / reassessments — hidden on an initial IA unless already used.
    const reasonQ = findQuestionByFieldKey(sections, 'assessmentReason')
    const reasonRaw = reasonQ ? draftAnswers[reasonQ.id]?.selectedOptions : undefined
    const reason = Array.isArray(reasonRaw) ? reasonRaw[0] : reasonRaw
    const reviewUsed =
      (clinicalOutcomeSummary.reviews ?? []).some((c) => c.assessmentDate?.trim() || c.practitioner?.trim()) ||
      Object.values(clinicalOutcomeSummary.rows ?? {}).some((r) => (r?.reviews ?? []).some((v) => v?.trim()))
    const showReviewColumns = reviewUsed || (typeof reason === 'string' && reason !== '' && reason !== 'initial')
    return (
      <div className="space-y-6">
        {assessmentSummary ? <InitialAssessmentAssessmentSummaryPanel summary={assessmentSummary} /> : null}
        <InitialAssessmentClinicalOutcomeSummaryPanel
          value={clinicalOutcomeSummary}
          disabled={disabled}
          onChange={onClinicalOutcomeSummaryChange}
          showReviewColumns={showReviewColumns}
        />
      </div>
    )
  }

  if (tab.kind === 'care-plan-objectives') {
    const signOffSection = sections.find((s) => s.sectionNumber === 14)
    const visibleIn = (sectionNumber: number, specRefs: readonly string[]) => {
      const section = sections.find((s) => s.sectionNumber === sectionNumber)
      if (!section) return []
      return filterQuestionsForHolisticTab(getVisibleSectionQuestions(section, sections, draftAnswers), {
        specRefs: [...specRefs],
      })
    }
    const reviewQuestions = visibleIn(14, FINAL_TAB_REVIEW_SPEC_REFS)
    const careConsentQuestions = visibleIn(2, FINAL_TAB_CONSENT_TO_CARE_SPEC_REFS)
    const detectedEquipment = detectCarePlanEquipmentInUse({
      hoistInUse: hoistRecordedInUse(sections, draftAnswers, movingHandlingOperations),
      movingHandlingMethods: Object.values(movingHandlingOperations?.tasks ?? {}).flatMap((t) => t?.methods ?? []),
      mobilityAidsText: section12.adl.mobilityAidsRequired === false ? undefined : section12.adl.mobilityAidsList,
      dailyLivingAidsText:
        section12.dailyLivingAids.aidsInUseOrRequired === false ? undefined : section12.dailyLivingAids.aidsList,
    })
    // Consent to care depends on capacity: a best-interests route replaces the person's own consent.
    const capacityDoubtQ = findQuestionByFieldKey(sections, 'capacityDoubt')
    const careCapacity = consentToCareCapacityState(
      capacityDecisions,
      Boolean(capacityDoubtQ && isYesAnswer(draftAnswers[capacityDoubtQ.id])),
      legacyCapacityScreening,
    )
    return (
      <>
        <InitialAssessmentAgreedGoalsPanel value={agreedGoals} disabled={disabled} onChange={onAgreedGoalsChange} />
        <InitialAssessmentCarePlanObjectivesPanel
          value={carePlanObjectives}
          disabled={disabled}
          onChange={onCarePlanObjectivesChange}
          visitIds={carePlanVisitIdsFromSections(sections, draftAnswers, carePlanObjectives)}
          detectedEquipment={detectedEquipment}
          servicing={section12.equipmentChecklist}
          goals={(agreedGoals.goals ?? []).flatMap((g, i) =>
            g.id && g.goal?.trim() ? [{ id: g.id, label: `Goal ${i + 1}: ${g.goal.trim()}` }] : [],
          )}
        />
        {reviewQuestions.length > 0 ? (
          <div className={FINAL_TAB_PANEL_CLASS} data-testid="ia-final-review-schedule">
            <p className="text-sm font-semibold text-foreground">Assessment &amp; review schedule</p>
            {reviewQuestions.map((q) => (
              <div key={q.id}>{renderMcaField(q)}</div>
            ))}
          </div>
        ) : null}
        {careConsentQuestions.length > 0 ? (
          <div className={FINAL_TAB_PANEL_CLASS} data-testid="ia-final-consent-to-care">
            <p className="text-sm font-semibold text-foreground">Consent to care</p>
            <p className="text-sm text-muted-foreground">
              Ask once the person has heard the proposed care and support plan.
            </p>
            {careCapacity?.state === 'lacks_capacity' ? (
              <p className={cn(IA_CALLOUT_AMBER_CLASS, 'text-sm')} data-testid="ia-final-consent-lacks-capacity">
                {careCapacity.assessedOn ? `On ${formatDisplayDate(careCapacity.assessedOn)} the` : 'The'} person was
                assessed as lacking capacity to consent to this care. Consent is through the
                best-interests decision / legal authority recorded in the Mental Capacity screening
                ({holisticTabRef(3)}). Still record the person&apos;s own views and any objection.
              </p>
            ) : careCapacity?.state === 'assessment_pending' ? (
              <p className={cn(IA_CALLOUT_AMBER_CLASS, 'text-sm')} data-testid="ia-final-consent-capacity-pending">
                There is reason to doubt capacity. Complete the capacity assessment for &ldquo;Consent to the
                proposed care&rdquo; ({holisticTabRef(3)}) before recording consent.
              </p>
            ) : null}
            {careConsentQuestions.map((q) => (
              <div key={q.id}>{renderMcaField(q)}</div>
            ))}
          </div>
        ) : null}
        {signOffSection ? (
          <InitialAssessmentSignOffPanel
            section={signOffSection}
            allSections={sections}
            draftAnswers={draftAnswers}
            questionErrors={questionErrors}
            disabled={disabled}
            serviceUserId={serviceUserId}
            submissionId={submissionId}
            onChange={onChange}
          />
        ) : null}
      </>
    )
  }

  if (tab.kind === 'mental-capacity-checklist') {
    const mcaRequiredYes = isMcaRequiredYes(sections, draftAnswers)
    return (
      <>
        {!mcaRequiredYes ? (
          <InitialAssessmentMcaLinkBanner
            variant="not-required"
            onOpenMcaScreeningTab={onOpenMcaScreeningTab}
          />
        ) : null}
        <InitialAssessmentMentalCapacityChecklistPanel
          value={mentalCapacityChecklist}
          disabled={disabled || !mcaRequiredYes}
          screeningSyncedIds={MENTAL_CAPACITY_SCREENING_SYNCED_IDS}
          screeningTabLabel={holisticTabRef(3)}
          onChange={onMentalCapacityChecklistChange}
        />
      </>
    )
  }

  if (tab.kind === 'consent') {
    const consentSection = sections.find((s) => s.sectionNumber === 2)
    return (
      <>
        {consentSection ? (
          <InitialAssessmentSectionQuestions
            key={`${tab.id}-sec-2`}
            section={consentSection}
            allSections={sections}
            draftAnswers={draftAnswers}
            prefillMap={prefillMap}
            questionErrors={questionErrors}
            disabled={disabled}
            serviceUserId={serviceUserId}
            submissionId={submissionId}
            serviceUserDetail={serviceUserDetail}
            excludeQuestionIds={excludeQuestionIds}
            holisticTab={tab}
            onChange={onChange}
          />
        ) : null}
        <InitialAssessmentConsentPhotographyPanel
          bare
          value={photographyConsent}
          consentGiver={consentGiver(
            sections,
            draftAnswers,
            legacyCapacityScreening ? undefined : completedDecisionFor(capacityDecisions, 'photography'),
          )}
          decisionMakerName={(() => {
            const q = findQuestionByFieldKey(sections, 'legalAuthorityName')
            return q ? draftAnswers[q.id]?.textValue?.trim() || undefined : undefined
          })()}
          serviceUserDetail={serviceUserDetail}
          disabled={disabled}
          onChange={onPhotographyConsentChange}
        />
      </>
    )
  }

  if (tab.kind === 'skin-integrity-check') {
    return (
      <InitialAssessmentTotalSkinIntegrityCheckPanel
        value={skinIntegrityCheck}
        disabled={disabled}
        serviceUserId={serviceUserId}
        submissionId={submissionId}
        onSyncBodyMap={onSyncBodyMap}
        syncBodyMapLoading={syncBodyMapLoading}
        onOpenWaterlowTab={onOpenWaterlowTab}
        onRowSideChange={onSkinIntegrityRowSideChange}
      />
    )
  }

  if (tab.kind === 'section12-blocks') {
    const section = sections.find((s) => s.sectionNumber === 12)
    if (!section) return null
    return (
      <>
        <InitialAssessmentSection12Content
          section={section}
          allSections={sections}
          draftAnswers={draftAnswers}
          prefillMap={prefillMap}
          questionErrors={questionErrors}
          disabled={disabled}
          serviceUserId={serviceUserId}
          submissionId={submissionId}
          excludeQuestionIds={excludeQuestionIds}
          displayBlocks={tab.section12Blocks}
          adl={section12.adl}
          transfers={section12.transfers}
          equipmentChecklist={section12.equipmentChecklist}
          equipmentChecklistVisible={section12.equipmentChecklistVisible}
          dailyLivingAids={section12.dailyLivingAids}
          practicalCare={section12.practicalCare}
          financeSupport={section12.financeSupport}
          financeSupportVisible={section12.financeSupportVisible}
          financeConsentQuestion={section12.financeConsentQuestion}
          renderFinanceConsentField={section12.renderFinanceConsentField}
          onAdlChange={section12.onAdlChange}
          onTransfersChange={section12.onTransfersChange}
          onEquipmentChecklistChange={section12.onEquipmentChecklistChange}
          onDailyLivingAidsChange={section12.onDailyLivingAidsChange}
          onPracticalCareChange={section12.onPracticalCareChange}
          onFinanceSupportChange={section12.onFinanceSupportChange}
          onChange={onChange}
        />
        {footer}
      </>
    )
  }

  if (tab.kind === 'multi-section' && tab.multiSections?.length) {
    const renderMultiSectionSlice = (
      slice: { sectionNumber: number } & SectionQuestionFilter,
      sliceIndex: number,
      underPaperSection4: boolean,
      underPaperSection5Emotional: boolean,
    ) => {
      const section = sections.find((s) => s.sectionNumber === slice.sectionNumber)
      if (!section) return null
      const hidePainTool = tab.id === 1 && slice.sectionNumber === 5
      return (
        <InitialAssessmentSectionQuestions
          key={holisticMultiSectionSliceKey(tab.id, slice, sliceIndex)}
          section={section}
          allSections={sections}
          draftAnswers={draftAnswers}
          prefillMap={prefillMap}
          questionErrors={questionErrors}
          disabled={disabled}
          serviceUserId={serviceUserId}
          submissionId={submissionId}
          serviceUserDetail={serviceUserDetail}
          onSyncEmergencyContact={onSyncEmergencyContact}
          onMarkMedicationVerified={onMarkMedicationVerified}
          onOpenWaterlowTab={onOpenWaterlowTab}
          onOpenEnvironmentAssessmentTab={onOpenEnvironmentAssessmentTab}
          onOpenSkinIntegrityCheckTab={onOpenSkinIntegrityCheckTab}
          onSyncBodyMap={onSyncBodyMap}
          syncBodyMapLoading={syncBodyMapLoading}
          excludeQuestionIds={excludeQuestionIds}
          painAssessment={painAssessment}
          onPainAssessmentChange={onPainAssessmentChange}
          holisticTab={toHolisticTabSlice(tab, slice.sectionNumber, slice)}
          hidePainAssessmentTool={hidePainTool}
          underPaperSection4={underPaperSection4}
          underPaperSection5Emotional={underPaperSection5Emotional}
          suppressIntro
          onChange={onChange}
        />
      )
    }

    const sliceNodes: ReactNode[] = []
    const slices = tab.multiSections
    let sliceIndex = 0

    while (sliceIndex < slices.length) {
      const slice = slices[sliceIndex]!

      if (tab.id === 1 && slice.groupHeading) {
        sliceNodes.push(
          <h2
            key={`tab-${tab.id}-group-${sliceIndex}`}
            className="border-b border-border pb-1 pt-4 text-base font-semibold text-foreground first:pt-0"
            data-testid="ia-tab-group-heading"
          >
            {slice.groupHeading}
          </h2>,
        )
      }

      if (tab.id === 1 && isPaperSection4MainSlice(slice.sectionNumber)) {
        const blockStart = sliceIndex
        while (
          sliceIndex < slices.length &&
          isPaperSection4MainSlice(slices[sliceIndex]!.sectionNumber)
        ) {
          sliceIndex += 1
        }
        const blockSlices = slices.slice(blockStart, sliceIndex)
        sliceNodes.push(
          <InitialAssessmentPaperSection4Block key={`tab-${tab.id}-paper-section-4-${blockStart}`}>
            {blockSlices.map((blockSlice, blockOffset) =>
              renderMultiSectionSlice(blockSlice, blockStart + blockOffset, true, false),
            )}
          </InitialAssessmentPaperSection4Block>,
        )
        continue
      }

      if (tab.id === 1 && slice.sectionNumber === 10) {
        const blockStart = sliceIndex
        while (sliceIndex < slices.length && slices[sliceIndex]!.sectionNumber === 10) {
          sliceIndex += 1
        }
        const blockSlices = slices.slice(blockStart, sliceIndex)
        sliceNodes.push(
          <InitialAssessmentPaperSection5EmotionalBlock key={`tab-${tab.id}-paper-section-5-emotional`}>
            {blockSlices.map((blockSlice, blockOffset) =>
              renderMultiSectionSlice(blockSlice, blockStart + blockOffset, false, true),
            )}
            <InitialAssessmentMcaLinkBanner onOpenMcaScreeningTab={onOpenMcaScreeningTab} />
          </InitialAssessmentPaperSection5EmotionalBlock>,
        )
        continue
      }

      if (tab.id === 1 && slice.conditionsRegisterEmbed) {
        if (serviceUserId) {
          sliceNodes.push(
            <InitialAssessmentConditionsPanel
              key={`tab-${tab.id}-conditions-register`}
              serviceUserId={serviceUserId}
              proposals={conditionProposals}
              disabled={disabled || !onConditionProposalsChange}
              onChange={(next) => onConditionProposalsChange?.(next)}
            />,
          )
        }
        sliceIndex += 1
        continue
      }

      if (tab.id === 1 && slice.aboutMeEmbed) {
        sliceNodes.push(
          <InitialAssessmentAboutMeSection
            key={`tab-${tab.id}-about-me`}
            sections={sections}
            draftAnswers={draftAnswers}
            prefillMap={prefillMap}
            questionErrors={questionErrors}
            disabled={disabled}
            serviceUserId={serviceUserId}
            submissionId={submissionId}
            onChange={onChange}
          />,
        )
        sliceIndex += 1
        continue
      }

      if (tab.id === 1 && isPaperSection7AdlSlice(slice)) {
        sliceNodes.push(
          <InitialAssessmentPaperSection7AdlBlock
            key={`tab-${tab.id}-paper-section-7-adl`}
            sections={sections}
            draftAnswers={draftAnswers}
            disabled={disabled}
            adl={section12.adl}
            dailyLivingAids={section12.dailyLivingAids}
            onAdlChange={section12.onAdlChange}
            onDailyLivingAidsChange={section12.onDailyLivingAidsChange}
            onOpenFallsScreeningTab={onOpenFallsScreeningTab}
          />,
        )
        sliceIndex += 1
        continue
      }

      if (tab.id === 1 && isPaperSection4TailSlice(slice)) {
        const tailStart = sliceIndex
        while (sliceIndex < slices.length && isPaperSection4TailSlice(slices[sliceIndex]!)) {
          sliceIndex += 1
        }
        const tailSlices = slices.slice(tailStart, sliceIndex)
        sliceNodes.push(
          <div
            key={`tab-${tab.id}-paper-section-4-tail-${tailStart}`}
            className="space-y-5"
            data-testid="ia-paper-section-4-tail"
          >
            {tailSlices.map((tailSlice, tailOffset) =>
              renderMultiSectionSlice(tailSlice, tailStart + tailOffset, true, false),
            )}
          </div>,
        )
        continue
      }

      sliceNodes.push(renderMultiSectionSlice(slice, sliceIndex, false, false))
      sliceIndex += 1
    }

    return (
      <>
        {sliceNodes}
        {footer}
      </>
    )
  }

  const section = sections.find((s) => s.sectionNumber === tab.enterpriseSection)
  if (!section) return null

  return (
    <>
      <InitialAssessmentSectionQuestions
        key={`${tab.id}-sec-${section.sectionNumber}`}
        section={section}
        allSections={sections}
        draftAnswers={draftAnswers}
        prefillMap={prefillMap}
        questionErrors={questionErrors}
        disabled={disabled}
        serviceUserId={serviceUserId}
        submissionId={submissionId}
        serviceUserDetail={serviceUserDetail}
        onSyncEmergencyContact={onSyncEmergencyContact}
        onMarkMedicationVerified={onMarkMedicationVerified}
        onOpenWaterlowTab={onOpenWaterlowTab}
        onOpenEnvironmentAssessmentTab={onOpenEnvironmentAssessmentTab}
        excludeQuestionIds={excludeQuestionIds}
        painAssessment={painAssessment}
        onPainAssessmentChange={onPainAssessmentChange}
        sectionFooter={sectionFooter}
        onSectionFooterChange={onSectionFooterChange}
        holisticTab={tab}
        onChange={onChange}
      />
    </>
  )
}
