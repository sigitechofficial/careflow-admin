import * as React from 'react'
import type { ReactNode } from 'react'
import { InitialAssessmentDailyLivingAidsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentDailyLivingAidsPanel'
import { InitialAssessmentFallsMobilityPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentFallsMobilityPanel'
import { InitialAssessmentPracticalCarePanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentPracticalCarePanel'
import { InitialAssessmentSection12EquipmentPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12EquipmentPanel'
import { InitialAssessmentAdlWorksheetPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentAdlWorksheetPanel'
import { InitialAssessmentFinanceSupportPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentFinanceSupportPanel'
import { InitialAssessmentQuestionField } from '@/features/service-users/initial-assessment/components/InitialAssessmentQuestionField'
import { InitialAssessmentSection12QuestionPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12QuestionPanel'
import { InitialAssessmentTransferMatrixPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentTransferMatrixPanel'
import {
  answerIsPrefillValue,
  hasAssessmentAnswer,
  mergePrefillAnswer,
  prefillHintForQuestion,
} from '@/features/service-users/initial-assessment/utils/question-prefill'
import { isSecureQuestion } from '@/features/service-users/initial-assessment/utils/secure-field'
import { shouldShowQuestion } from '@/features/service-users/initial-assessment/utils/conditional-visibility'
import { InitialAssessmentMultiSelectOptionsGrid } from '@/features/service-users/initial-assessment/components/InitialAssessmentMultiSelectOptionsGrid'
import {
  SECTION_12_DISPLAY_BLOCKS,
  type Section12PanelBlock,
} from '@/features/service-users/initial-assessment/utils/section-12-display-order'
import { IA_CALLOUT_NEUTRAL_CLASS, IA_INTRO_CLASS, IA_SECTION_BODY_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import { sectionIntroCopy } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import { cn } from '@/shared/lib/utils'
import { enrichAdlWorksheetFromAnswers } from '@/features/service-users/initial-assessment/utils/section-12-adl-footer'
import {
  filterSection12Questions,
  section12EquipmentTemplateQuestions,
  section12FallsHistoryQuestions,
} from '@/features/service-users/initial-assessment/utils/section-12-mobility'
import { groupQuestionsBySpecRef } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import { shouldLockVitalQuestion } from '@/features/service-users/initial-assessment/utils/vitals-validation'
import type { ServiceUserDetail } from '@/features/service-users/api'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import type { AdlWorksheetMetadata } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import type {
  DailyLivingAidsMetadata,
  EquipmentChecklistMetadata,
  FinanceSupportMetadata,
  PracticalCareTasksMetadata,
  TransferMatrixMetadata,
} from '@/features/service-users/initial-assessment/utils/mobility-metadata'

type Props = {
  section: InitialAssessmentSection
  allSections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  prefillMap: Map<string, string>
  questionErrors?: Map<string, string>
  disabled: boolean
  serviceUserId: string
  submissionId: string | null
  excludeQuestionIds?: Set<string>
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
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void
  /** Document TOC tabs — render only selected §12 blocks (Practical Task, Equipment, Falls, etc.). */
  displayBlocks?: Section12PanelBlock[]
}

function mergePrefill(
  q: InitialAssessmentQuestion,
  value: InitialAssessmentAnswerInput | undefined,
  prefillMap: Map<string, string>,
): InitialAssessmentAnswerInput | undefined {
  return mergePrefillAnswer(q, value, prefillMap)
}

export function InitialAssessmentSection12Content({
  section,
  allSections,
  draftAnswers,
  prefillMap,
  questionErrors,
  disabled,
  serviceUserId,
  submissionId,
  excludeQuestionIds,
  adl,
  transfers,
  equipmentChecklist,
  equipmentChecklistVisible,
  dailyLivingAids,
  practicalCare,
  financeSupport,
  financeSupportVisible,
  financeConsentQuestion,
  renderFinanceConsentField,
  onAdlChange,
  onTransfersChange,
  onEquipmentChecklistChange,
  onDailyLivingAidsChange,
  onPracticalCareChange,
  onFinanceSupportChange,
  onChange,
  displayBlocks,
}: Props) {
  const blocks = displayBlocks ?? SECTION_12_DISPLAY_BLOCKS
  const practicalCareOnly =
    blocks.length === 1 && blocks[0]?.kind === 'practical-care'
  const visibleQuestions = filterSection12Questions(
    section.questions.filter((q) =>
      shouldShowQuestion(q, allSections, draftAnswers),
    ),
  ).filter((q) => !excludeQuestionIds?.has(q.id))

  const fallsHistoryQuestions = React.useMemo(
    () =>
      section12FallsHistoryQuestions(section.questions).filter((q) =>
        shouldShowQuestion(q, allSections, draftAnswers),
      ),
    [section.questions, allSections, draftAnswers],
  )

  const equipmentTemplateQuestions = React.useMemo(
    () =>
      section12EquipmentTemplateQuestions(section.questions).filter((q) =>
        shouldShowQuestion(q, allSections, draftAnswers),
      ),
    [section.questions, allSections, draftAnswers],
  )

  const adlDisplay = React.useMemo(
    () => enrichAdlWorksheetFromAnswers(adl, section.questions, draftAnswers),
    [adl, section.questions, draftAnswers],
  )

  const groupsByRef = React.useMemo(() => {
    const groups = groupQuestionsBySpecRef(visibleQuestions, 12)
    return new Map(groups.map((g) => [g.specRef, g]))
  }, [visibleQuestions])

  const isFieldDisabled = (q: InitialAssessmentQuestion) =>
    disabled || shouldLockVitalQuestion(q, allSections, draftAnswers)

  const renderField = (q: InitialAssessmentQuestion) => {
    const raw = draftAnswers[q.id]
    const merged = mergePrefill(q, raw, prefillMap)
    const hint = prefillHintForQuestion(q, prefillMap)
    return (
      <InitialAssessmentQuestionField
        question={q}
        value={merged}
        prefillHint={
          !hasAssessmentAnswer(raw, q) || answerIsPrefillValue(q, raw, prefillMap) ? hint : null
        }
        errorMessage={questionErrors?.get(q.id)}
        disabled={isFieldDisabled(q)}
        serviceUserId={serviceUserId}
        submissionId={submissionId}
        layout="section12"
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

  const sectionIntro = practicalCareOnly ? null : sectionIntroCopy(12)

  return (
    <div className={IA_SECTION_BODY_CLASS} data-testid="ia-section-12-content">
      {sectionIntro ? (
        <p className={cn(IA_CALLOUT_NEUTRAL_CLASS, IA_INTRO_CLASS)}>{sectionIntro}</p>
      ) : null}
      {blocks.map((block, i) => {
        if (block.kind === 'adl-worksheet-scores') {
          return (
            <InitialAssessmentAdlWorksheetPanel
              key={`block-${i}`}
              section="scores"
              value={adlDisplay}
              disabled={disabled}
              onChange={onAdlChange}
            />
          )
        }
        if (block.kind === 'adl-worksheet-total') {
          return (
            <InitialAssessmentAdlWorksheetPanel
              key={`block-${i}`}
              section="total"
              value={adlDisplay}
              disabled={disabled}
              onChange={onAdlChange}
            />
          )
        }
        if (block.kind === 'falls-panel') {
          return (
            <InitialAssessmentFallsMobilityPanel
              key={`block-${i}`}
              value={adlDisplay}
              disabled={disabled}
              fallsQuestions={fallsHistoryQuestions}
              renderField={renderField}
              onChange={onAdlChange}
            />
          )
        }
        if (block.kind === 'daily-living-aids') {
          return (
            <InitialAssessmentDailyLivingAidsPanel
              key={`block-${i}`}
              value={dailyLivingAids}
              disabled={disabled}
              onChange={onDailyLivingAidsChange}
            />
          )
        }
        if (block.kind === 'equipment-panel') {
          return (
            <InitialAssessmentSection12EquipmentPanel
              key={`block-${i}`}
              adl={adlDisplay}
              equipmentQuestions={equipmentTemplateQuestions}
              equipmentChecklist={equipmentChecklist}
              equipmentChecklistVisible={equipmentChecklistVisible}
              disabled={disabled}
              renderField={renderField}
              onAdlChange={onAdlChange}
              onEquipmentChecklistChange={onEquipmentChecklistChange}
            />
          )
        }
        if (block.kind === 'transfer-matrix') {
          return (
            <InitialAssessmentTransferMatrixPanel
              key={`block-${i}`}
              value={transfers}
              disabled={disabled}
              onChange={onTransfersChange}
            />
          )
        }
        if (block.kind === 'finance-support') {
          if (!financeSupportVisible) return null
          return (
            <InitialAssessmentFinanceSupportPanel
              key={`block-${i}`}
              financeRequired
              consentQuestion={financeConsentQuestion}
              consentAnswer={
                financeConsentQuestion ? draftAnswers[financeConsentQuestion.id] : undefined
              }
              value={{ ...financeSupport, required: true }}
              disabled={disabled}
              onChange={onFinanceSupportChange}
              renderConsentField={renderFinanceConsentField}
            />
          )
        }
        if (block.kind === 'practical-care') {
          return (
            <InitialAssessmentPracticalCarePanel
              key={`block-${i}`}
              value={practicalCare}
              disabled={disabled}
              onChange={onPracticalCareChange}
            />
          )
        }
        if (block.kind === 'questions') {
          const group = groupsByRef.get(block.specRef)
          if (!group) return null
          return (
            <InitialAssessmentSection12QuestionPanel
              key={`block-${i}-${block.specRef}`}
              group={group}
              renderField={renderField}
              renderMultiSelect={renderMultiSelect}
            />
          )
        }
        return null
      })}
    </div>
  )
}
