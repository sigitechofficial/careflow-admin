import { InitialAssessmentCognitionChecklistPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentCognitionChecklistPanel'
import { InitialAssessmentMedicationSpecRefPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentMedicationSpecRefPanel'
import { InitialAssessmentMultiSelectOptionsGrid } from '@/features/service-users/initial-assessment/components/InitialAssessmentMultiSelectOptionsGrid'
import { InitialAssessmentNoConcernGatePanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentNoConcernGatePanel'
import { InitialAssessmentPanelFieldList } from '@/features/service-users/initial-assessment/components/InitialAssessmentPanelFieldList'
import { InitialAssessmentQuestionField } from '@/features/service-users/initial-assessment/components/InitialAssessmentQuestionField'
import { useBodyMapLookups } from '@/features/service-users/body-map/hooks/useBodyMapLookups'
import { InitialAssessmentAddressContactField } from '@/features/service-users/initial-assessment/components/InitialAssessmentAddressContactField'
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
import { InitialAssessmentSection1SimplePanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection1SimplePanel'
import { InitialAssessmentSection5PainPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection5PainPanel'
import { InitialAssessmentSpecRefGroupPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSpecRefGroupPanel'
import { specRefOf } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { isSection1SimpleGroup } from '@/features/service-users/initial-assessment/utils/section-1-simple-layout'
import { InitialAssessmentVitalsBanner } from '@/features/service-users/initial-assessment/components/InitialAssessmentVitalsBanner'
import { InitialAssessmentVitalsSignsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentVitalsSignsPanel'
import { InitialAssessmentPressureRiskPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentPressureRiskPanel'
import { InitialAssessmentSkinIntegrityHolisticPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSkinIntegrityHolisticPanel'
import { InitialAssessmentSkinWoundsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSkinWoundsPanel'
import { excludeSkinIntegrityTableQuestions } from '@/features/service-users/initial-assessment/utils/skin-integrity-table'
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

/** Sections using §12 panel shell + field-row layout (batch rollout). */
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
  suppressIntro,
  excludeQuestionIds,
  painAssessment,
  onPainAssessmentChange,
  sectionFooter,
  onSectionFooterChange,
  holisticTab,
  hidePainAssessmentTool,
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
  const woundTypeCatalog = bodyMapLookupsQuery.data?.woundTypes ?? []

  const isFieldDisabled = (q: InitialAssessmentQuestion) =>
    disabled || shouldLockVitalQuestion(q, allSections, draftAnswers)

  const renderField = (
    q: InitialAssessmentQuestion,
    fieldOptions?: { hideLabel?: boolean },
  ) => {
    const raw = draftAnswers[q.id]
    const merged = mergePrefill(q, raw, prefillMap)
    const hint = prefillHintForQuestion(q, prefillMap)
    const simpleLayout = isSection1SimpleGroup(specRefOf(q))
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
    if (prefillKeyForQuestion(q) === 'addressContact') {
      return (
        <InitialAssessmentAddressContactField
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

    if (section.sectionNumber === 9 && (group.specRef === '9.3' || group.specRef === '9.4')) {
      return (
        <InitialAssessmentMedicationSpecRefPanel
          key={`${group.specRef}-${groupIndex}`}
          title={group.label}
          specRef={group.specRef}
          questions={group.questions}
          allSections={allSections}
          draftAnswers={draftAnswers}
          serviceUserId={serviceUserId}
          disabled={disabled}
          onMarkVerified={onMarkMedicationVerified ?? (() => undefined)}
          renderField={renderField}
          renderMultiSelect={renderMultiSelect}
        />
      )
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

    if (group.specRef === '11.1') {
      return (
        <InitialAssessmentSkinIntegrityHolisticPanel
          key={`${group.specRef}-${groupIndex}`}
          title={group.label}
          questions={group.questions}
          allSections={allSections}
          renderField={renderField}
          renderMultiSelect={renderMultiSelect}
        />
      )
    }

    if (group.specRef === '11.2') {
      return (
        <InitialAssessmentSkinWoundsPanel
          key={`${group.specRef}-${groupIndex}`}
          title={group.label}
          questions={group.questions}
          allSections={allSections}
          draftAnswers={draftAnswers}
          renderField={renderField}
          renderMultiSelect={renderMultiSelect}
        />
      )
    }

    if (group.specRef === '11.3') {
      return (
        <InitialAssessmentPressureRiskPanel
          key={`${group.specRef}-${groupIndex}`}
          title={group.label}
          questions={excludeSkinIntegrityTableQuestions(group.questions)}
          renderField={renderField}
          renderMultiSelect={renderMultiSelect}
          onOpenWaterlowTab={onOpenWaterlowTab}
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

      const renderQuestion = (q: InitialAssessmentQuestion) =>
        isMultiSelectOptionsGridQuestion(q) && renderMultiSelect ? renderMultiSelect(q) : renderField(q)

      return (
        <InitialAssessmentSection1SimplePanel key={`${group.specRef}-${groupIndex}`} group={group}>
          {group.specRef === '1.1' ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {group.questions.map((q) => (
                <div
                  key={q.id}
                  className={
                    prefillKeyForQuestion(q) === 'addressContact' ? 'sm:col-span-2' : undefined
                  }
                >
                  {renderQuestion(q)}
                </div>
              ))}
            </div>
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

    return (
      <div className={IA_SECTION_BODY_CLASS}>
        {intro && !suppressIntro && !holisticTabFiltered ? (
          <p className={cn(IA_CALLOUT_NEUTRAL_CLASS, IA_INTRO_CLASS)}>{intro}</p>
        ) : null}

        {section.sectionNumber === 4 ? (
          <InitialAssessmentVitalsBanner sections={allSections} draftAnswers={draftAnswers} />
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
      </div>
    )
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
