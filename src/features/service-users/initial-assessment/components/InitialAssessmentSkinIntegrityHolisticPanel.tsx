import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import { shouldShowQuestion } from '@/features/service-users/initial-assessment/utils/conditional-visibility'
import { findQuestionByFieldKey, isYesAnswer } from '@/features/service-users/initial-assessment/utils/question-lookup'
import {
  SKIN_INTEGRITY_EQUIPMENT_ORDER_QUESTION_TEXTS,
  SKIN_INTEGRITY_MONITORING_QUESTION_TEXTS,
  SKIN_INTEGRITY_TABLE_ROWS,
  findQuestionByExactText,
} from '@/features/service-users/initial-assessment/utils/skin-integrity-table'
import { groupedYesNoFieldOptions } from '@/features/service-users/initial-assessment/utils/field-render-options'
import type { ReactNode } from 'react'

type Props = {
  title: string
  allSections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  renderField: (q: InitialAssessmentQuestion, options?: { hideLabel?: boolean }) => ReactNode
}

export function InitialAssessmentSkinIntegrityHolisticPanel({
  title,
  allSections,
  draftAnswers,
  renderField,
}: Props) {
  const furtherEquipmentQ = findQuestionByFieldKey(allSections, 'furtherPressureEquipmentRequired')
  const showEquipmentOrderBlock = furtherEquipmentQ
    ? isYesAnswer(draftAnswers[furtherEquipmentQ.id])
    : false

  const show = (q: InitialAssessmentQuestion | undefined) =>
    q ? shouldShowQuestion(q, allSections, draftAnswers) : false

  return (
    <InitialAssessmentSection12PanelShell title={title} testId="ia-spec-group-11.1" bodyVariant="content">
      <HolisticAssessmentTable
        columns={[
          { key: 'question', header: 'Question', className: 'w-[38%]' },
          { key: 'assessment', header: 'Assessment', className: 'w-[28%]' },
          { key: 'comment', header: 'Comment', className: 'w-[34%]' },
        ]}
      >
        {SKIN_INTEGRITY_TABLE_ROWS.map((row) => {
          const assessmentQ = row.assessmentQuestionText
            ? findQuestionByExactText(allSections, row.assessmentQuestionText)
            : undefined
          const commentQ = row.commentQuestionText
            ? findQuestionByExactText(allSections, row.commentQuestionText)
            : undefined

          return (
            <HolisticAssessmentTableRow key={row.label}>
              <HolisticAssessmentTableCell className="align-top font-medium text-sm">
                {row.label}
              </HolisticAssessmentTableCell>
              <HolisticAssessmentTableCell className="align-top">
                {row.commentOnly ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : assessmentQ ? (
                  renderField(assessmentQ, { hideLabel: true })
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </HolisticAssessmentTableCell>
              <HolisticAssessmentTableCell className="align-top">
                {commentQ && (row.commentOnly || !assessmentQ || show(commentQ)) ? (
                  renderField(commentQ, { hideLabel: true })
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </HolisticAssessmentTableCell>
            </HolisticAssessmentTableRow>
          )
        })}
      </HolisticAssessmentTable>

      {showEquipmentOrderBlock ? (
        <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">If YES, provide details</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {SKIN_INTEGRITY_EQUIPMENT_ORDER_QUESTION_TEXTS.slice(0, 2).map((text) => {
              const q = findQuestionByExactText(allSections, text)
              return q && show(q) ? <div key={q.id}>{renderField(q)}</div> : null
            })}
          </div>
          {(() => {
            const commentsQ = findQuestionByExactText(
              allSections,
              SKIN_INTEGRITY_EQUIPMENT_ORDER_QUESTION_TEXTS[2]!,
            )
            return commentsQ && show(commentsQ) ? (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Additional comments</p>
                {renderField(commentsQ)}
              </div>
            ) : null
          })()}
        </div>
      ) : null}

      <div className="grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-2">
        {SKIN_INTEGRITY_MONITORING_QUESTION_TEXTS.map((text) => {
          const q = findQuestionByExactText(allSections, text)
          return q ? (
            <div key={q.id}>{renderField(q, groupedYesNoFieldOptions(q))}</div>
          ) : null
        })}
      </div>
    </InitialAssessmentSection12PanelShell>
  )
}
