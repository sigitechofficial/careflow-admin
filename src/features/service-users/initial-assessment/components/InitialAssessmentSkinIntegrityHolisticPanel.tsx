import {
  InitialAssessmentSection12FieldRow,
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { InitialAssessmentBodyMapObservationLinks } from '@/features/service-users/initial-assessment/components/InitialAssessmentBodyMapObservationLinks'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import { shouldShowQuestion } from '@/features/service-users/initial-assessment/utils/conditional-visibility'
import { findQuestionByFieldKey, isYesAnswer } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { skinIntegrityBodyMapGateAnsweredYes } from '@/features/service-users/initial-assessment/utils/skin-integrity-body-map'
import {
  SKIN_INTEGRITY_EQUIPMENT_ORDER_QUESTION_TEXTS,
  SKIN_INTEGRITY_MONITORING_QUESTION_TEXTS,
  SKIN_INTEGRITY_TABLE_ROWS,
  findQuestionByExactText,
} from '@/features/service-users/initial-assessment/utils/skin-integrity-table'
import type { ReactNode } from 'react'

type Props = {
  title: string
  allSections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  serviceUserId: string
  submissionId?: string | null
  disabled?: boolean
  onSyncBodyMap?: () => void
  syncBodyMapLoading?: boolean
  onOpenSkinIntegrityCheckTab?: () => void
  onOpenWaterlowTab?: () => void
  renderField: (q: InitialAssessmentQuestion, options?: { hideLabel?: boolean }) => ReactNode
}

export function InitialAssessmentSkinIntegrityHolisticPanel({
  title,
  allSections,
  draftAnswers,
  serviceUserId,
  submissionId,
  disabled,
  onSyncBodyMap,
  syncBodyMapLoading,
  onOpenSkinIntegrityCheckTab,
  onOpenWaterlowTab,
  renderField,
}: Props) {
  const furtherEquipmentQ = findQuestionByFieldKey(allSections, 'furtherPressureEquipmentRequired')
  const showEquipmentOrderBlock = furtherEquipmentQ
    ? isYesAnswer(draftAnswers[furtherEquipmentQ.id])
    : false

  const show = (q: InitialAssessmentQuestion | undefined) =>
    q ? shouldShowQuestion(q, allSections, draftAnswers) : false

  const showBodyMapPanelCallout = skinIntegrityBodyMapGateAnsweredYes(allSections, draftAnswers)

  return (
    <InitialAssessmentSection12PanelShell title={title} testId="ia-spec-group-11.1" bodyVariant="content">
      {showBodyMapPanelCallout ? (
        <InitialAssessmentBodyMapObservationLinks
          variant="callout"
          serviceUserId={serviceUserId}
          submissionId={submissionId}
          disabled={disabled}
          onSyncBodyMap={onSyncBodyMap}
          syncBodyMapLoading={syncBodyMapLoading}
          onOpenSkinIntegrityCheckTab={onOpenSkinIntegrityCheckTab}
          onOpenWaterlowTab={onOpenWaterlowTab}
        />
      ) : null}

      <div className="space-y-4">
        {SKIN_INTEGRITY_TABLE_ROWS.map((row) => {
          // Conditional rows (e.g. dressings only with a wound, details only after Yes) follow showWhen.
          const foundAssessmentQ = row.assessmentQuestionText
            ? findQuestionByExactText(allSections, row.assessmentQuestionText)
            : undefined
          const assessmentQ = foundAssessmentQ && show(foundAssessmentQ) ? foundAssessmentQ : undefined
          const foundCommentQ = row.commentQuestionText
            ? findQuestionByExactText(allSections, row.commentQuestionText)
            : undefined
          const commentQ = foundCommentQ && show(foundCommentQ) ? foundCommentQ : undefined
          const showBodyMapInline =
            row.bodyMapGate && assessmentQ && isYesAnswer(draftAnswers[assessmentQ.id])

          if (row.commentOnly) {
            return commentQ ? (
              <InitialAssessmentSection12FieldRow key={row.label}>
                {renderField(commentQ)}
              </InitialAssessmentSection12FieldRow>
            ) : null
          }

          return (
            <div key={row.label} className="space-y-4">
              {assessmentQ ? (
                <InitialAssessmentSection12FieldRow>{renderField(assessmentQ)}</InitialAssessmentSection12FieldRow>
              ) : null}
              {showBodyMapInline ? (
                <InitialAssessmentBodyMapObservationLinks
                  variant="inline"
                  serviceUserId={serviceUserId}
                  submissionId={submissionId}
                  disabled={disabled}
                  onSyncBodyMap={onSyncBodyMap}
                  syncBodyMapLoading={syncBodyMapLoading}
                  onOpenSkinIntegrityCheckTab={onOpenSkinIntegrityCheckTab}
                  hint="Record observations for this answer on the body map."
                />
              ) : null}
              {commentQ ? (
                <InitialAssessmentSection12FieldRow>{renderField(commentQ)}</InitialAssessmentSection12FieldRow>
              ) : null}
            </div>
          )
        })}
      </div>

      {showEquipmentOrderBlock ? (
        <div className="space-y-4 border-t border-border/60 pt-4">
          <p className="text-sm font-medium text-foreground">If YES, provide details</p>
          {SKIN_INTEGRITY_EQUIPMENT_ORDER_QUESTION_TEXTS.map((text) => {
            const q = findQuestionByExactText(allSections, text)
            return q && show(q) ? (
              <InitialAssessmentSection12FieldRow key={q.id}>{renderField(q)}</InitialAssessmentSection12FieldRow>
            ) : null
          })}
        </div>
      ) : null}

      <div className="space-y-4 border-t border-border/60 pt-4">
        {SKIN_INTEGRITY_MONITORING_QUESTION_TEXTS.map((text) => {
          const q = findQuestionByExactText(allSections, text)
          return q ? (
            <InitialAssessmentSection12FieldRow key={q.id}>{renderField(q)}</InitialAssessmentSection12FieldRow>
          ) : null
        })}
      </div>
    </InitialAssessmentSection12PanelShell>
  )
}
