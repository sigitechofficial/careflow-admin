import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { InitialAssessmentPanelFieldList } from '@/features/service-users/initial-assessment/components/InitialAssessmentPanelFieldList'
import type {
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import {
  SKIN_INTEGRITY_TABLE_ROWS,
  excludeSkinIntegrityTableQuestions,
  findQuestionByExactText,
} from '@/features/service-users/initial-assessment/utils/skin-integrity-table'
import type { ReactNode } from 'react'

type Props = {
  title: string
  questions: InitialAssessmentQuestion[]
  allSections: InitialAssessmentSection[]
  renderField: (q: InitialAssessmentQuestion, options?: { hideLabel?: boolean }) => ReactNode
  renderMultiSelect: (q: InitialAssessmentQuestion) => ReactNode
}

export function InitialAssessmentSkinIntegrityHolisticPanel({
  title,
  questions,
  allSections,
  renderField,
  renderMultiSelect,
}: Props) {
  const remaining = excludeSkinIntegrityTableQuestions(questions)

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
                {commentQ ? (
                  renderField(commentQ, { hideLabel: true })
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </HolisticAssessmentTableCell>
            </HolisticAssessmentTableRow>
          )
        })}
      </HolisticAssessmentTable>

      {remaining.length > 0 ? (
        <InitialAssessmentPanelFieldList
          questions={remaining}
          renderField={renderField}
          renderMultiSelect={renderMultiSelect}
        />
      ) : null}
    </InitialAssessmentSection12PanelShell>
  )
}
