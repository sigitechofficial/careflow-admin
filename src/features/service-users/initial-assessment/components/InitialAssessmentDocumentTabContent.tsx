import type { ReactNode } from 'react'
import { HolisticFooterFields } from '@/features/service-users/initial-assessment/components/holistic/HolisticFooterFields'
import { InitialAssessmentDocumentPlaceholder } from '@/features/service-users/initial-assessment/components/InitialAssessmentDocumentPlaceholder'
import { InitialAssessmentMcaScreeningPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMcaScreeningPanel'
import { InitialAssessmentPainAssessmentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentPainAssessmentPanel'
import { InitialAssessmentTherapyAideMemoirePanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentTherapyAideMemoirePanel'
import { InitialAssessmentEnvironmentAssessmentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentEnvironmentAssessmentPanel'
import { InitialAssessmentAdvanceCarePlanningPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentAdvanceCarePlanningPanel'
import { InitialAssessmentEndOfLifeAssessmentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentEndOfLifeAssessmentPanel'
import { InitialAssessmentClinicalOutcomeSummaryPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentClinicalOutcomeSummaryPanel'
import { InitialAssessmentCarePlanObjectivesPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentCarePlanObjectivesPanel'
import { InitialAssessmentMentalCapacityChecklistPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMentalCapacityChecklistPanel'
import { InitialAssessmentPhotographyConsentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentPhotographyConsentPanel'
import { InitialAssessmentQuestionField } from '@/features/service-users/initial-assessment/components/InitialAssessmentQuestionField'
import { InitialAssessmentSection12Content } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12Content'
import { InitialAssessmentSectionQuestions } from '@/features/service-users/initial-assessment/components/InitialAssessmentSectionQuestions'
import { InitialAssessmentSignOffPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSignOffPanel'
import { InitialAssessmentTotalSkinIntegrityCheckPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentTotalSkinIntegrityCheckPanel'
import { InitialAssessmentEquipmentSelectionPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentEquipmentSelectionPanel'
import { InitialAssessmentFallsScreeningPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentFallsScreeningPanel'
import { InitialAssessmentMovingHandlingOperationsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMovingHandlingOperationsPanel'
import { InitialAssessmentMustPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMustPanel'
import { InitialAssessmentWaterlowPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentWaterlowPanel'
import type { ServiceUserDetail } from '@/features/service-users/api'
import type {
  HolisticAssessmentTab,
  SectionQuestionFilter,
} from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import type { PainAssessmentMetadata } from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'
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
import type { MentalCapacityChecklistMetadata } from '@/features/service-users/initial-assessment/utils/mental-capacity-checklist'
import type { PhotographyConsentMetadata } from '@/features/service-users/initial-assessment/utils/photography-consent'
import type { EquipmentSelectionMetadata } from '@/features/service-users/initial-assessment/utils/equipment-selection'
import type { MustMetadata } from '@/features/service-users/initial-assessment/utils/must-scoring'
import type { WaterlowMetadata } from '@/features/service-users/initial-assessment/utils/waterlow-scoring'
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
  mentalCapacityChecklist: MentalCapacityChecklistMetadata
  photographyConsent: PhotographyConsentMetadata
  equipmentSelection: EquipmentSelectionMetadata
  skinIntegrityCheck: SkinIntegrityCheckMetadata
  sectionFooter?: { dateCompleted?: string; assessorNameDesignation?: string }
  showBodyMapCta?: boolean
  onSyncEmergencyContact?: () => void
  onMarkMedicationVerified?: () => void
  onOpenBodyMap?: () => void
  onOpenWaterlowTab?: () => void
  onPainAssessmentChange: (next: PainAssessmentMetadata) => void
  onWaterlowChange: (next: WaterlowMetadata) => void
  onMustAssessmentChange: (next: MustMetadata) => void
  onFallsScreeningChange: (next: FallsScreeningMetadata) => void
  onMovingHandlingOperationsChange: (next: MovingHandlingOperationsMetadata) => void
  onEnvironmentAssessmentChange: (next: EnvironmentAssessmentMetadata) => void
  onAdvanceCarePlanningChange: (next: AdvanceCarePlanningMetadata) => void
  onEndOfLifeAssessmentChange: (next: EndOfLifeAssessmentMetadata) => void
  onClinicalOutcomeSummaryChange: (next: ClinicalAssessmentOutcomeSummaryMetadata) => void
  onCarePlanObjectivesChange: (next: CarePlanObjectivesMetadata) => void
  onMentalCapacityChecklistChange: (next: MentalCapacityChecklistMetadata) => void
  onPhotographyConsentChange: (next: PhotographyConsentMetadata) => void
  onEquipmentSelectionChange: (next: EquipmentSelectionMetadata) => void
  onSkinIntegrityRowSideChange: (rowId: string, side: 'right' | 'left', text: string) => void
  onSectionFooterChange?: (patch: {
    dateCompleted?: string
    assessorNameDesignation?: string
  }) => void
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void
  section12: Section12Bundle
}

function toHolisticTabSlice(
  tab: HolisticAssessmentTab,
  sectionNumber: number,
  filter?: SectionQuestionFilter,
): HolisticAssessmentTab {
  return {
    id: tab.id,
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
  mentalCapacityChecklist,
  photographyConsent,
  equipmentSelection,
  skinIntegrityCheck,
  sectionFooter,
  showBodyMapCta,
  onSyncEmergencyContact,
  onMarkMedicationVerified,
  onOpenBodyMap,
  onOpenWaterlowTab,
  onPainAssessmentChange,
  onWaterlowChange,
  onMustAssessmentChange,
  onFallsScreeningChange,
  onMovingHandlingOperationsChange,
  onEnvironmentAssessmentChange,
  onAdvanceCarePlanningChange,
  onEndOfLifeAssessmentChange,
  onClinicalOutcomeSummaryChange,
  onCarePlanObjectivesChange,
  onMentalCapacityChecklistChange,
  onPhotographyConsentChange,
  onEquipmentSelectionChange,
  onSkinIntegrityRowSideChange,
  onSectionFooterChange,
  onChange,
  section12,
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
  )

  if (tab.kind === 'mca-screening') {
    return (
      <>
        <InitialAssessmentMcaScreeningPanel
          allSections={sections}
          renderField={renderMcaField}
          disabled={disabled}
        />
        {footer}
      </>
    )
  }

  if (tab.kind === 'waterlow') {
    return (
      <InitialAssessmentWaterlowPanel
        value={waterlow}
        disabled={disabled}
        onChange={onWaterlowChange}
      />
    )
  }

  if (tab.kind === 'equipment-selection') {
    return (
      <InitialAssessmentEquipmentSelectionPanel
        value={equipmentSelection}
        disabled={disabled}
        onChange={onEquipmentSelectionChange}
      />
    )
  }

  if (tab.kind === 'must-tool') {
    return (
      <InitialAssessmentMustPanel
        value={mustAssessment}
        disabled={disabled}
        onChange={onMustAssessmentChange}
      />
    )
  }

  if (tab.kind === 'falls-screening') {
    return (
      <InitialAssessmentFallsScreeningPanel
        value={fallsScreening}
        disabled={disabled}
        onChange={onFallsScreeningChange}
      />
    )
  }

  if (tab.kind === 'moving-handling') {
    return (
      <InitialAssessmentMovingHandlingOperationsPanel
        value={movingHandlingOperations}
        disabled={disabled}
        onChange={onMovingHandlingOperationsChange}
      />
    )
  }

  if (tab.kind === 'pain-tool') {
    return (
      <InitialAssessmentPainAssessmentPanel
        value={painAssessment}
        disabled={disabled}
        onChange={onPainAssessmentChange}
      />
    )
  }

  if (tab.kind === 'therapy-memoire') {
    return (
      <InitialAssessmentTherapyAideMemoirePanel
        value={painAssessment.therapyAideMemoire ?? {}}
        disabled={disabled}
        onChange={(therapyAideMemoire) =>
          onPainAssessmentChange({ ...painAssessment, therapyAideMemoire })
        }
      />
    )
  }

  if (tab.kind === 'environment-assessment') {
    return (
      <InitialAssessmentEnvironmentAssessmentPanel
        value={environmentAssessment}
        disabled={disabled}
        onChange={onEnvironmentAssessmentChange}
      />
    )
  }

  if (tab.kind === 'advance-care-planning') {
    return (
      <InitialAssessmentAdvanceCarePlanningPanel
        value={advanceCarePlanning}
        disabled={disabled}
        onChange={onAdvanceCarePlanningChange}
      />
    )
  }

  if (tab.kind === 'end-of-life-assessment') {
    return (
      <InitialAssessmentEndOfLifeAssessmentPanel
        value={endOfLifeAssessment}
        disabled={disabled}
        onChange={onEndOfLifeAssessmentChange}
      />
    )
  }

  if (tab.kind === 'clinical-outcome-summary') {
    return (
      <InitialAssessmentClinicalOutcomeSummaryPanel
        value={clinicalOutcomeSummary}
        disabled={disabled}
        onChange={onClinicalOutcomeSummaryChange}
      />
    )
  }

  if (tab.kind === 'care-plan-objectives') {
    const signOffSection = sections.find((s) => s.sectionNumber === 14)
    return (
      <>
        <InitialAssessmentCarePlanObjectivesPanel
          value={carePlanObjectives}
          disabled={disabled}
          onChange={onCarePlanObjectivesChange}
        />
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
    return (
      <InitialAssessmentMentalCapacityChecklistPanel
        value={mentalCapacityChecklist}
        disabled={disabled}
        onChange={onMentalCapacityChecklistChange}
      />
    )
  }

  if (tab.kind === 'photography-consent') {
    return (
      <InitialAssessmentPhotographyConsentPanel
        value={photographyConsent}
        disabled={disabled}
        onChange={onPhotographyConsentChange}
      />
    )
  }

  if (tab.kind === 'skin-integrity-check') {
    return (
      <InitialAssessmentTotalSkinIntegrityCheckPanel
        value={skinIntegrityCheck}
        disabled={disabled}
        showBodyMapCta={showBodyMapCta}
        onOpenBodyMap={onOpenBodyMap}
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
    return (
      <>
        {tab.multiSections.map((slice) => {
          const section = sections.find((s) => s.sectionNumber === slice.sectionNumber)
          if (!section) return null
          const hidePainTool = tab.id === 1 && slice.sectionNumber === 5
          return (
            <InitialAssessmentSectionQuestions
              key={`${tab.id}-sec-${slice.sectionNumber}`}
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
              excludeQuestionIds={excludeQuestionIds}
              painAssessment={painAssessment}
              onPainAssessmentChange={onPainAssessmentChange}
              holisticTab={toHolisticTabSlice(tab, slice.sectionNumber, slice)}
              hidePainAssessmentTool={hidePainTool}
              suppressIntro
              onChange={onChange}
            />
          )
        })}
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
