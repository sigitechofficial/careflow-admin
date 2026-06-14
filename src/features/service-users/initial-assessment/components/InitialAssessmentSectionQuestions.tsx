import { InitialAssessmentCognitionChecklistPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentCognitionChecklistPanel'
import { InitialAssessmentMultiSelectOptionsGrid } from '@/features/service-users/initial-assessment/components/InitialAssessmentMultiSelectOptionsGrid'
import { InitialAssessmentNoConcernGatePanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentNoConcernGatePanel'
import { InitialAssessmentPanelFieldList } from '@/features/service-users/initial-assessment/components/InitialAssessmentPanelFieldList'
import { InitialAssessmentQuestionField } from '@/features/service-users/initial-assessment/components/InitialAssessmentQuestionField'
import { useBodyMapLookups } from '@/features/service-users/body-map/hooks/useBodyMapLookups'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { mapLookupRowsToQuestionOptions } from '@/features/service-users/initial-assessment/utils/question-options'
import { InitialAssessmentAddressContactField } from '@/features/service-users/initial-assessment/components/InitialAssessmentAddressContactField'
import { InitialAssessmentGpContactField } from '@/features/service-users/initial-assessment/components/InitialAssessmentGpContactField'
import {
  InitialAssessmentPersonCentredCards,
  isPersonCentredCardGroup,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentPersonCentredCards'
import { InitialAssessmentPreferredVisitTimesPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentPreferredVisitTimesPanel'
import { InitialAssessmentPreferredVisitTimesField } from '@/features/service-users/initial-assessment/components/InitialAssessmentPreferredVisitTimesField'
import { InitialAssessmentCarParkingPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentCarParkingPanel'
import {
  isPreferredVisitTimesQuestion,
  questionsWithoutPreferredVisitTimes,
} from '@/features/service-users/initial-assessment/utils/preferred-visit-times'
import { InitialAssessmentSectionFooterNotesPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSectionFooterNotesPanel'
import { HolisticFooterFields } from '@/features/service-users/initial-assessment/components/holistic/HolisticFooterFields'
import {
  InitialAssessmentSection1SimplePanel,
  shouldHidePaperSectionFieldLabel,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection1SimplePanel'
import { InitialAssessmentSection1PersonalDetailsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection1PersonalDetailsPanel'
import { InitialAssessmentSection3SocialHistoryPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection3SocialHistoryPanel'
import { InitialAssessmentSection5BreathingPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection5BreathingPanel'
import { InitialAssessmentSection5PainPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection5PainPanel'
import { InitialAssessmentSection5SwallowingPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection5SwallowingPanel'
import {
  InitialAssessmentPaperSection5AdditionalCommentsPanel,
  InitialAssessmentPaperSection5IntroPanel,
  InitialAssessmentPaperSection5SubsectionPanel,
  isPaperSection5AdditionalCommentsGroup,
  isPaperSection5IntroGroup,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentPaperSection5Panels'
import {
  collectPaperSection5CognitiveQuestions,
  isPaperSection5HiddenCognitiveSpecRef,
} from '@/features/service-users/initial-assessment/utils/section-10-paper-section-5-form'
import { InitialAssessmentSpecRefGroupPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSpecRefGroupPanel'
import { fieldKeyOf, findQuestionByFieldKey, specRefOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { isSection1SimpleGroup } from '@/features/service-users/initial-assessment/utils/section-1-simple-layout'
import { isSection4FullWidthSpecRef } from '@/features/service-users/initial-assessment/utils/section-4-physical-assessment-display-order'
import { InitialAssessmentSection4GlucosePanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection4GlucosePanel'
import { InitialAssessmentHeightBuildWeightPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentHeightBuildWeightPanel'
import { InitialAssessmentVitalsSignsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentVitalsSignsPanel'
import { InitialAssessmentSkinIntegrityHolisticPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSkinIntegrityHolisticPanel'
import { isMultiSelectOptionsGridQuestion } from '@/features/service-users/initial-assessment/utils/multi-select-options-grid'
import { isNoConcernGateGroup } from '@/features/service-users/initial-assessment/utils/no-concern-gate'
import {
  questionsExcludingSectionFooterNotes,
  sectionFooterNotesQuestion,
} from '@/features/service-users/initial-assessment/utils/section-notes'
import { groupQuestionsBySpecRef, sectionIntroCopy } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import {
  hasAssessmentAnswer,
  mergePrefillAnswer,
  prefillKeyForQuestion,
  prefillHintForQuestion,
} from '@/features/service-users/initial-assessment/utils/question-prefill'
import { isSecureQuestion } from '@/features/service-users/initial-assessment/utils/secure-field'
import { getVisibleSectionQuestions } from '@/features/service-users/initial-assessment/utils/visible-section-questions'
import {
  isClinicalMeasurementField,
  shouldLockVitalQuestion,
} from '@/features/service-users/initial-assessment/utils/vitals-validation'
import { cn } from '@/shared/lib/utils'
import {
  IA_ACT_DIVIDER_TITLE_CLASS,
  IA_CALLOUT_NEUTRAL_CLASS,
  IA_FIELD_DIVIDER_CLASS,
  IA_GROUP_TITLE_CLASS,
  IA_INTRO_CLASS,
  IA_SECTION_BODY_CLASS,
  IA_SPEC_GROUP_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import {
  InitialAssessmentConsentCapacitySection,
  isConsentCapacitySection,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentConsentCapacitySection'
import {
  InitialAssessmentSafeguardingSection,
  isSafeguardingSection,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSafeguardingSection'
import { InitialAssessmentSignOffWorkflowPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSignOffWorkflowPanel'
import type { ServiceUserDetail } from '@/features/service-users/api'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import type { PainAssessmentMetadata } from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'
import {
  filterQuestionsForHolisticTab,
  type HolisticAssessmentTab,
} from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'

/** Sections using ┬º12 panel shell + field-row layout (batch rollout). */
const PANEL_LAYOUT_SECTIONS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14])

const SIGN_OFF_WORKFLOW_SPEC_REFS = new Set(['14.3', '14.4', '14.7'])

type Props = {
  section: InitialAssessmentSection
  allSections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  prefillMap: Map<string, string>
  questionErrors?: Map<string, string>
  disabled: boolean
  serviceUserId: string
  submissionId: string | null
  serviceUserDetail?: ServiceUserDetail | null
  onSyncEmergencyContact?: () => void
  onMarkMedicationVerified?: () => void
  onOpenWaterlowTab?: () => void
  onOpenEnvironmentAssessmentTab?: () => void
  onOpenSkinIntegrityCheckTab?: () => void
  onSyncBodyMap?: () => void
  syncBodyMapLoading?: boolean
  suppressIntro?: boolean
  excludeQuestionIds?: Set<string>
  painAssessment?: PainAssessmentMetadata
  onPainAssessmentChange?: (next: PainAssessmentMetadata) => void
  sectionFooter?: { dateCompleted?: string; assessorNameDesignation?: string }
  onSectionFooterChange?: (patch: {
    dateCompleted?: string
    assessorNameDesignation?: string
  }) => void
  holisticTab?: HolisticAssessmentTab
  hidePainAssessmentTool?: boolean
  /** When true, content renders inside {@link InitialAssessmentPaperSection4Block} (no duplicate header). */
  underPaperSection4?: boolean
  /** When true, content renders inside {@link InitialAssessmentPaperSection5EmotionalBlock}. */
  underPaperSection5Emotional?: boolean
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void
  visibleQuestionsOptions?: Parameters<typeof getVisibleSectionQuestions>[3]
}

function mergePrefill(
  q: InitialAssessmentQuestion,
  value: InitialAssessmentAnswerInput | undefined,
  prefillMap: Map<string, string>,
): InitialAssessmentAnswerInput | undefined {
  return mergePrefillAnswer(q, value, prefillMap)
}

export function InitialAssessmentSectionQuestions({
  section,
  allSections,
  draftAnswers,
  prefillMap,
  questionErrors,
  disabled,
  serviceUserId,
  submissionId,
  serviceUserDetail,
  onSyncEmergencyContact,
  onMarkMedicationVerified,
  onOpenWaterlowTab,
  onOpenEnvironmentAssessmentTab,
  onOpenSkinIntegrityCheckTab,
  onSyncBodyMap,
  syncBodyMapLoading,
  suppressIntro,
  excludeQuestionIds,
  painAssessment,
  onPainAssessmentChange,
  sectionFooter,
  onSectionFooterChange,
  holisticTab,
  hidePainAssessmentTool,
  underPaperSection4,
  underPaperSection5Emotional,
  visibleQuestionsOptions,
  onChange,
}: Props) {
  const visibleQuestions = filterQuestionsForHolisticTab(
    getVisibleSectionQuestions(section, allSections, draftAnswers, visibleQuestionsOptions).filter(
      (q) => !excludeQuestionIds?.has(q.id),
    ),
    holisticTab ?? {
      id: section.sectionNumber,
      title: section.title,
      kind: 'form-section' as const,
      enterpriseSection: section.sectionNumber,
    },
  )

  const footerNotes = sectionFooterNotesQuestion(section.sectionNumber, visibleQuestions)
  const questionsForGroups = questionsExcludingSectionFooterNotes(section.sectionNumber, visibleQuestions)
  const groups = groupQuestionsBySpecRef(questionsForGroups, section.sectionNumber)
  const panelLayout = PANEL_LAYOUT_SECTIONS.has(section.sectionNumber)
  const intro = sectionIntroCopy(section.sectionNumber)
  const holisticTabFiltered =
    holisticTab &&
    (Boolean(holisticTab.specRefs?.length) ||
      Boolean(holisticTab.questionTextsOnly?.length) ||
      Boolean(holisticTab.includeQuestionTexts?.length))
  const bodyMapLookupsQuery = useBodyMapLookups()
  const suLookupsQuery = useServiceUserLookups()
  const woundTypeCatalog = bodyMapLookupsQuery.data?.woundTypes ?? []
  const fundingTypeCatalog = mapLookupRowsToQuestionOptions(suLookupsQuery.data?.fundingTypes ?? [])
  const ethnicityCatalog = mapLookupRowsToQuestionOptions(suLookupsQuery.data?.ethnicities ?? [])
  const languageCatalog = mapLookupRowsToQuestionOptions(suLookupsQuery.data?.languages ?? [])

  const isFieldDisabled = (q: InitialAssessmentQuestion) =>
    disabled || shouldLockVitalQuestion(q, allSections, draftAnswers)

  const renderField = (
    q: InitialAssessmentQuestion,
    fieldOptions?: { hideLabel?: boolean },
  ) => {
    const raw = draftAnswers[q.id]
    const merged = mergePrefill(q, raw, prefillMap)
    const hint = prefillHintForQuestion(q, prefillMap)
    const simpleLayout =
      isSection1SimpleGroup(specRefOf(q)) || isSection4FullWidthSpecRef(specRefOf(q))
    if (
      fieldKeyOf(q) === 'poNumber' &&
      allSections.some((sec) => sec.questions.some((x) => prefillKeyForQuestion(x) === 'addressContact'))
    ) {
      return null
    }
    if (isPreferredVisitTimesQuestion(q)) {
      return (
        <InitialAssessmentPreferredVisitTimesField
          question={q}
          value={merged}
          errorMessage={questionErrors?.get(q.id)}
          disabled={isFieldDisabled(q)}
          onChange={(patch) => onChange(q.id, patch)}
        />
      )
    }
    if (fieldKeyOf(q) === 'gpContactDetails') {
      return (
        <InitialAssessmentGpContactField
          question={q}
          value={merged}
          serviceUserId={serviceUserId}
          serviceUserDetail={serviceUserDetail}
          errorMessage={questionErrors?.get(q.id)}
          disabled={isFieldDisabled(q)}
          variant={simpleLayout ? 'simple' : 'default'}
          onChange={(patch) => onChange(q.id, patch)}
        />
      )
    }
    if (prefillKeyForQuestion(q) === 'addressContact') {
      const poQuestion = findQuestionByFieldKey(allSections, 'poNumber')
      const poAnswer = poQuestion ? draftAnswers[poQuestion.id] : undefined
      return (
        <InitialAssessmentAddressContactField
          question={q}
          value={merged}
          serviceUserId={serviceUserId}
          serviceUserDetail={serviceUserDetail}
          poNumber={
            poQuestion
              ? {
                  questionId: poQuestion.id,
                  value: poAnswer,
                  errorMessage: questionErrors?.get(poQuestion.id),
                  onChange: (patch) => onChange(poQuestion.id, patch),
                }
              : undefined
          }
          errorMessage={questionErrors?.get(q.id)}
          disabled={isFieldDisabled(q)}
          variant={simpleLayout ? 'simple' : 'default'}
          onChange={(patch) => onChange(q.id, patch)}
        />
      )
    }
    return (
      <InitialAssessmentQuestionField
        question={q}
        value={merged}
        prefillHint={hasAssessmentAnswer(raw, q) ? null : hint}
        errorMessage={questionErrors?.get(q.id)}
        disabled={isFieldDisabled(q)}
        hideLabel={fieldOptions?.hideLabel}
        serviceUserId={serviceUserId}
        submissionId={submissionId}
        layout={
          simpleLayout
            ? 'simple'
            : panelLayout
              ? isClinicalMeasurementField(q)
                ? 'clinicalMeasurement'
                : 'section12'
              : 'default'
        }
        woundTypeCatalog={woundTypeCatalog}
        fundingTypeCatalog={fundingTypeCatalog}
        ethnicityCatalog={ethnicityCatalog}
        languageCatalog={languageCatalog}
        lookupCatalogLoading={suLookupsQuery.isLoading}
        onChange={(patch) => onChange(q.id, patch)}
      />
    )
  }

  const renderMultiSelect = (q: InitialAssessmentQuestion) => {
    const raw = draftAnswers[q.id]
    const merged = mergePrefill(q, raw, prefillMap)
    return (
      <InitialAssessmentMultiSelectOptionsGrid
        question={q}
        value={merged}
        errorMessage={questionErrors?.get(q.id)}
        disabled={isFieldDisabled(q)}
        onChange={(patch) => onChange(q.id, patch)}
      />
    )
  }

  const renderPanelGroup = (group: (typeof groups)[number], groupIndex: number) => {
    if (underPaperSection5Emotional && isPaperSection5IntroGroup(group)) {
      return (
        <InitialAssessmentPaperSection5IntroPanel
          key={`${group.specRef}-${groupIndex}`}
          group={group}
          renderField={renderField}
        />
      )
    }

    if (underPaperSection5Emotional && isPaperSection5AdditionalCommentsGroup(group)) {
      return (
        <InitialAssessmentPaperSection5AdditionalCommentsPanel
          key={`${group.specRef}-${groupIndex}-comments`}
          question={group.questions[0]!}
          renderField={renderField}
        />
      )
    }

    if (underPaperSection5Emotional && isPaperSection5HiddenCognitiveSpecRef(group.specRef)) {
      return null
    }

    if (underPaperSection5Emotional && group.specRef === '10.6') {
      return (
        <InitialAssessmentPaperSection5SubsectionPanel
          key={`${group.specRef}-${groupIndex}`}
          group={{ ...group, questions: collectPaperSection5CognitiveQuestions(groups) }}
          renderField={renderField}
          valueFor={(q) => mergePrefill(q, draftAnswers[q.id], prefillMap)}
          onChangeFor={(q, patch) => onChange(q.id, patch)}
          questionErrors={questionErrors}
          disabled={disabled}
        />
      )
    }

    if (underPaperSection5Emotional && (group.specRef === '10.2' || group.specRef === '10.4')) {
      return (
        <InitialAssessmentPaperSection5SubsectionPanel
          key={`${group.specRef}-${groupIndex}`}
          group={group}
          renderField={renderField}
          valueFor={(q) => mergePrefill(q, draftAnswers[q.id], prefillMap)}
          onChangeFor={(q, patch) => onChange(q.id, patch)}
          questionErrors={questionErrors}
          disabled={disabled}
        />
      )
    }

    if (group.specRef === '4.2') {
      return (
        <InitialAssessmentVitalsSignsPanel
          key={`${group.specRef}-${groupIndex}`}
          title={group.label}
          questions={group.questions}
          renderField={renderField}
        />
      )
    }

    if (group.specRef === '4.4') {
      return (
        <InitialAssessmentSection4GlucosePanel
          key={`${group.specRef}-${groupIndex}`}
          title={group.label}
          questions={group.questions}
          renderField={renderField}
        />
      )
    }

    if (group.specRef === '4.10') {
      return (
        <InitialAssessmentHeightBuildWeightPanel
          key={`${group.specRef}-${groupIndex}`}
          title={group.label}
          questions={group.questions}
          renderField={renderField}
        />
      )
    }

    if (group.specRef === '7.0' || group.specRef === '8.0' || group.specRef === '10.0') {
      return null
    }

    if (isNoConcernGateGroup(group.specRef)) {
      return (
        <InitialAssessmentNoConcernGatePanel
          key={`${group.specRef}-${groupIndex}`}
          title={group.label}
          sectionNumber={section.sectionNumber}
          questions={group.questions}
          renderField={renderField}
        />
      )
    }

    if (
      group.specRef === '9.2' ||
      group.specRef === '9.3' ||
      group.specRef === '9.4' ||
      group.specRef === '9.5' ||
      group.specRef === '9.6'
    ) {
      return null
    }

    if (group.specRef === '10.6a') {
      return (
        <InitialAssessmentCognitionChecklistPanel
          key={`${group.specRef}-${groupIndex}`}
          title={group.label}
          questions={group.questions}
          renderField={renderField}
          renderMultiSelect={renderMultiSelect}
        />
      )
    }

    if (group.specRef === '11.1' || group.specRef === '11.1a' || group.specRef === '11.2' || group.specRef === '11.3') {
      if (group.specRef !== '11.1') return null
      return (
        <InitialAssessmentSkinIntegrityHolisticPanel
          key={`${group.specRef}-${groupIndex}`}
          title={group.label}
          allSections={allSections}
          draftAnswers={draftAnswers}
          serviceUserId={serviceUserId}
          submissionId={submissionId}
          disabled={disabled}
          onSyncBodyMap={onSyncBodyMap}
          syncBodyMapLoading={syncBodyMapLoading}
          onOpenSkinIntegrityCheckTab={onOpenSkinIntegrityCheckTab}
          onOpenWaterlowTab={onOpenWaterlowTab}
          renderField={renderField}
        />
      )
    }

    if (group.specRef === '5.1') {
      const actionPlanGroup = groups.find((g) => g.specRef === '5.2')
      const breathingGroup = actionPlanGroup
        ? { ...group, questions: [...group.questions, ...actionPlanGroup.questions] }
        : group
      return (
        <InitialAssessmentSection5BreathingPanel
          key={`${group.specRef}-${groupIndex}`}
          group={breathingGroup}
          draftAnswers={draftAnswers}
          disabled={disabled}
          questionErrors={questionErrors}
          renderField={renderField}
          onChange={onChange}
        />
      )
    }

    // Paper ┬º4b: action plan follows breathing options ΓÇö standalone ┬º5.2 panel hidden.
    // if (group.specRef === '5.2') {
    //   return (
    //     <InitialAssessmentSpecRefGroupPanel key={`${group.specRef}-${groupIndex}`} group={group} renderField={renderField}>
    //       <InitialAssessmentPanelFieldList
    //         questions={group.questions}
    //         renderField={renderField}
    //         renderMultiSelect={renderMultiSelect}
    //       />
    //     </InitialAssessmentSpecRefGroupPanel>
    //   )
    // }
    if (group.specRef === '5.2') {
      return null
    }

    // Paper ┬º4: no standalone ΓÇ£no concernsΓÇ¥ gate ΓÇö options live on each subsection checklist.
    // if (group.specRef === '5.0') {
    //   return (
    //     <InitialAssessmentSpecRefGroupPanel key={`${group.specRef}-${groupIndex}`} group={group} renderField={renderField}>
    //       <InitialAssessmentPanelFieldList questions={group.questions} renderField={renderField} />
    //     </InitialAssessmentSpecRefGroupPanel>
    //   )
    // }
    if (group.specRef === '5.0') {
      return null
    }

    if (group.specRef === '6.5' || group.specRef === '6.6') {
      return null
    }

    if (group.specRef === '7.1') {
      const denturesGroup = groups.find((g) => g.specRef === '7.2')
      const oralGroup = denturesGroup
        ? { ...group, questions: [...group.questions, ...denturesGroup.questions] }
        : group
      return (
        <InitialAssessmentSpecRefGroupPanel
          key={`${group.specRef}-${groupIndex}`}
          group={oralGroup}
          renderField={renderField}
        >
          <InitialAssessmentPanelFieldList
            questions={oralGroup.questions}
            renderField={renderField}
            renderMultiSelect={renderMultiSelect}
          />
        </InitialAssessmentSpecRefGroupPanel>
      )
    }

    if (group.specRef === '7.2') {
      return null
    }

    if (group.specRef === '7.3' || group.specRef === '7.5' || group.specRef === '8.1' || group.specRef === '8.5') {
      const followRef =
        group.specRef === '7.3'
          ? '7.4'
          : group.specRef === '7.5'
            ? '7.6'
            : group.specRef === '8.1'
              ? '8.2'
              : '8.6'
      const followGroup = groups.find((g) => g.specRef === followRef)
      const mergedGroup = followGroup
        ? { ...group, questions: [...group.questions, ...followGroup.questions] }
        : group
      return (
        <InitialAssessmentSpecRefGroupPanel
          key={`${group.specRef}-${groupIndex}`}
          group={mergedGroup}
          renderField={renderField}
        >
          <InitialAssessmentPanelFieldList
            questions={mergedGroup.questions}
            renderField={renderField}
            renderMultiSelect={renderMultiSelect}
          />
        </InitialAssessmentSpecRefGroupPanel>
      )
    }

    if (group.specRef === '7.4' || group.specRef === '7.6' || group.specRef === '8.2' || group.specRef === '8.6') {
      return null
    }

    if (group.specRef === '5.4') {
      return (
        <InitialAssessmentSection5SwallowingPanel
          key={`${group.specRef}-${groupIndex}`}
          group={group}
          draftAnswers={draftAnswers}
          disabled={disabled}
          questionErrors={questionErrors}
          renderField={renderField}
          onChange={onChange}
        />
      )
    }

    if (group.specRef === '5.3' && painAssessment && onPainAssessmentChange) {
      return (
        <InitialAssessmentSection5PainPanel
          key={`${group.specRef}-${groupIndex}`}
          group={group}
          painAssessment={painAssessment}
          disabled={disabled}
          serviceUserDetail={serviceUserDetail}
          onPainAssessmentChange={onPainAssessmentChange}
          showPainAssessmentTool={!hidePainAssessmentTool}
          renderField={renderField}
          renderMultiSelect={renderMultiSelect}
        />
      )
    }

    if (group.specRef === '3.12') {
      return (
        <InitialAssessmentCarParkingPanel
          key={`${group.specRef}-${groupIndex}`}
          title={group.label}
          questions={group.questions}
          draftAnswers={draftAnswers}
          renderField={renderField}
        />
      )
    }

    if (group.specRef === '1.2') {
      return (
        <InitialAssessmentSection3SocialHistoryPanel
          key={`${group.specRef}-${groupIndex}`}
          group={group}
          allSections={allSections}
          draftAnswers={draftAnswers}
          renderField={renderField}
          renderMultiSelect={renderMultiSelect}
          onOpenEnvironmentAssessmentTab={onOpenEnvironmentAssessmentTab}
        />
      )
    }

    if (isSection1SimpleGroup(group.specRef)) {
      if (isPersonCentredCardGroup(group.specRef)) {
        const cardQuestions = questionsWithoutPreferredVisitTimes(group.questions)
        return (
          <InitialAssessmentSection1SimplePanel key={`${group.specRef}-${groupIndex}`} group={group}>
            <InitialAssessmentPersonCentredCards
              questions={cardQuestions}
              renderField={renderField}
              variant="simple"
            />
            <InitialAssessmentPreferredVisitTimesPanel
              questions={group.questions}
              renderField={renderField}
              variant="simple"
            />
          </InitialAssessmentSection1SimplePanel>
        )
      }

      const renderQuestion = (q: InitialAssessmentQuestion) => {
        const hideLabel = group.specRef === '1.0' && shouldHidePaperSectionFieldLabel(q.questionText)
        const fieldOptions = hideLabel ? { hideLabel: true } : undefined
        if (isMultiSelectOptionsGridQuestion(q) && renderMultiSelect) return renderMultiSelect(q)
        return renderField(q, fieldOptions)
      }

      return (
        <InitialAssessmentSection1SimplePanel key={`${group.specRef}-${groupIndex}`} group={group}>
          {group.specRef === '1.1' ? (
            <InitialAssessmentSection1PersonalDetailsPanel
              group={group}
              renderField={(q, fieldOptions) => renderField(q, fieldOptions)}
              renderMultiSelect={renderMultiSelect}
            />
          ) : (
            group.questions.map((q) => <div key={q.id}>{renderQuestion(q)}</div>)
          )}
        </InitialAssessmentSection1SimplePanel>
      )
    }

    if (isPersonCentredCardGroup(group.specRef)) {
      const cardQuestions = questionsWithoutPreferredVisitTimes(group.questions)
      return (
        <InitialAssessmentSpecRefGroupPanel key={`${group.specRef}-${groupIndex}`} group={group} renderField={renderField}>
          <div className="space-y-4">
            <InitialAssessmentPersonCentredCards questions={cardQuestions} renderField={renderField} />
            <InitialAssessmentPreferredVisitTimesPanel questions={group.questions} renderField={renderField} />
          </div>
        </InitialAssessmentSpecRefGroupPanel>
      )
    }

    return (
      <InitialAssessmentSpecRefGroupPanel key={`${group.specRef}-${groupIndex}`} group={group} renderField={renderField}>
        <InitialAssessmentPanelFieldList
          questions={group.questions}
          renderField={renderField}
          renderMultiSelect={renderMultiSelect}
        />
      </InitialAssessmentSpecRefGroupPanel>
    )
  }

  if (isConsentCapacitySection(section.sectionNumber)) {
    return (
      <InitialAssessmentConsentCapacitySection
        section={section}
        allSections={allSections}
        visibleQuestions={visibleQuestions}
        draftAnswers={draftAnswers}
        disabled={disabled}
        serviceUserId={serviceUserId}
        submissionId={submissionId}
        renderField={renderField}
      />
    )
  }

  if (isSafeguardingSection(section.sectionNumber)) {
    return (
      <div className={IA_SECTION_BODY_CLASS}>
        {intro && !suppressIntro ? <p className={cn(IA_CALLOUT_NEUTRAL_CLASS, IA_INTRO_CLASS)}>{intro}</p> : null}
        <InitialAssessmentSafeguardingSection
          serviceUserId={serviceUserId}
          sections={allSections}
          draftAnswers={draftAnswers}
          serviceUserDetail={serviceUserDetail}
          disabled={disabled}
          onSyncEmergencyContact={onSyncEmergencyContact ?? (() => undefined)}
          renderField={renderField}
          renderMultiSelect={renderMultiSelect}
          visibleQuestions={questionsForGroups}
          onChange={onChange}
        />
        {footerNotes ? (
          <InitialAssessmentSectionFooterNotesPanel renderField={() => renderField(footerNotes)} />
        ) : null}
      </div>
    )
  }

  if (panelLayout) {
    const renderCatalogGroups = () =>
      groups.map((group, groupIndex) => {
        if (section.sectionNumber === 14 && SIGN_OFF_WORKFLOW_SPEC_REFS.has(group.specRef)) {
          if (group.specRef !== '14.3') return null
          return (
            <InitialAssessmentSignOffWorkflowPanel
              key="ia-14-workflow"
              carePlanGroup={groups.find((g) => g.specRef === '14.3')}
              actionsGroup={groups.find((g) => g.specRef === '14.4')}
              managerGroup={groups.find((g) => g.specRef === '14.7')}
              renderField={renderField}
              renderMultiSelect={renderMultiSelect}
            />
          )
        }
        return renderPanelGroup(group, groupIndex)
      })

    const body = (
      <>
        {intro && !suppressIntro && !holisticTabFiltered && !underPaperSection4 && !underPaperSection5Emotional ? (
          <p className={cn(IA_CALLOUT_NEUTRAL_CLASS, IA_INTRO_CLASS)}>{intro}</p>
        ) : null}

        {renderCatalogGroups()}

        {footerNotes ? (
          <InitialAssessmentSectionFooterNotesPanel renderField={() => renderField(footerNotes)} />
        ) : null}
        {onSectionFooterChange ? (
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
        ) : null}
      </>
    )

    if (underPaperSection4 || underPaperSection5Emotional) {
      return body
    }

    return <div className={IA_SECTION_BODY_CLASS}>{body}</div>
  }

  return (
    <div className={IA_SECTION_BODY_CLASS}>
      {intro ? <p className={cn(IA_CALLOUT_NEUTRAL_CLASS, IA_INTRO_CLASS)}>{intro}</p> : null}

      {groups.map((group, groupIndex) => (
        <div key={`${group.specRef}-${groupIndex}`} className={IA_SPEC_GROUP_CLASS}>
          {group.actDivider ? (
            <div className="border-l-4 border-teal-600 bg-teal-50/60 px-4 py-3 dark:border-teal-500 dark:bg-teal-950/30">
              <div className={IA_ACT_DIVIDER_TITLE_CLASS}>{group.actDivider.title}</div>
              {group.actDivider.hint ? (
                <p className={cn('mt-1', IA_INTRO_CLASS)}>{group.actDivider.hint}</p>
              ) : null}
            </div>
          ) : null}

          {group.specRef !== '_other' && !group.actDivider && !isPersonCentredCardGroup(group.specRef) ? (
            <h3 className={IA_GROUP_TITLE_CLASS}>{group.label}</h3>
          ) : null}

          {isPersonCentredCardGroup(group.specRef) ? (
            <div className="space-y-4">
              <InitialAssessmentPersonCentredCards
                questions={questionsWithoutPreferredVisitTimes(group.questions)}
                renderField={renderField}
              />
              <InitialAssessmentPreferredVisitTimesPanel questions={group.questions} renderField={renderField} />
            </div>
          ) : (
            group.questions.map((q) => (
              <div key={q.id} className={IA_FIELD_DIVIDER_CLASS}>
                {renderField(q)}
              </div>
            ))
          )}
        </div>
      ))}

      {footerNotes ? (
        <InitialAssessmentSectionFooterNotesPanel renderField={() => renderField(footerNotes)} />
      ) : null}
    </div>
  )
}
