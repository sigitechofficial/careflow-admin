import type { ReactNode } from 'react'
import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HolisticAssessmentTable,
  HolisticAssessmentTableCell,
  HolisticAssessmentTableRow,
} from '@/features/service-users/initial-assessment/components/holistic/HolisticAssessmentTable'
import { InitialAssessmentSection12PanelShell } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import {
  findMcaQuestionByFieldKey,
  MCA_COMMENTS_FIELD_KEY,
  MCA_FUNCTIONAL_FIELD_KEYS,
  MCA_OUTCOME_FIELD_KEY,
  MCA_TWO_STAGE_FIELD_KEYS,
} from '@/features/service-users/initial-assessment/utils/mca-screening'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import { IA_CALLOUT_NEUTRAL_CLASS, IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import type {
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import { cn } from '@/shared/lib/utils'

const FUNCTIONAL_ROW_LABELS: Record<(typeof MCA_FUNCTIONAL_FIELD_KEYS)[number], string> = {
  mcaFunctionalUnderstand: 'Can I understand the information relevant to the decision?',
  mcaFunctionalRetain: 'Can I retain that information long enough to make the decision?',
  mcaFunctionalWeigh: 'Can I use or weigh that information as part of making the decision?',
  mcaFunctionalCommunicate: 'Can I communicate my decision (by talking or any other means)?',
}

type Props = {
  allSections: InitialAssessmentSection[]
  renderField: (q: InitialAssessmentQuestion, options?: { hideLabel?: boolean }) => ReactNode
  disabled?: boolean
}

export function InitialAssessmentMcaScreeningPanel({ allSections, renderField, disabled }: Props) {
  const stage1 = findMcaQuestionByFieldKey(allSections, MCA_TWO_STAGE_FIELD_KEYS[0])
  const stage2 = findMcaQuestionByFieldKey(allSections, MCA_TWO_STAGE_FIELD_KEYS[1])
  const outcomeQ = findMcaQuestionByFieldKey(allSections, MCA_OUTCOME_FIELD_KEY)
  const commentsQ = findMcaQuestionByFieldKey(allSections, MCA_COMMENTS_FIELD_KEY)

  return (
    <div className={HOLISTIC_SECTION_SHELL_CLASS} data-testid="ia-mca-screening-panel">
      <HolisticSectionHeader
        title="Initial mental capacity act screening tool"
        subtitle="The two stage test of mental capacity"
      />

      <div className="space-y-4 border border-slate-300 bg-white p-4 dark:bg-card dark:border-slate-600">
        {stage1 ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              1. Is there an impairment of, or disturbance in, the functioning of my mind or brain?
            </p>
            <p className={IA_HINT_CLASS}>
              (It does not matter whether the impairment or disturbance is temporary or permanent.)
            </p>
            {renderField(stage1, { hideLabel: true })}
          </div>
        ) : null}

        {stage2 ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">
              2. Does that impairment or disturbance mean that I am unable to make the decision in
              question at the time that it needs to be made?
            </p>
            {renderField(stage2, { hideLabel: true })}
          </div>
        ) : null}
      </div>

      <InitialAssessmentSection12PanelShell
        title="Functional assessment"
        hint="Answer Yes or No for each criterion."
        testId="ia-mca-functional-table"
        bodyVariant="content"
      >
        <HolisticAssessmentTable
          columns={[
            { key: 'question', header: 'Question', className: 'w-[62%]' },
            { key: 'assessment', header: 'Yes / No', className: 'w-[38%]' },
          ]}
        >
          {MCA_FUNCTIONAL_FIELD_KEYS.map((key, index) => {
            const q = findMcaQuestionByFieldKey(allSections, key)
            return (
              <HolisticAssessmentTableRow key={key}>
                <HolisticAssessmentTableCell className="align-top text-sm font-medium">
                  {index + 1}. {FUNCTIONAL_ROW_LABELS[key]}
                </HolisticAssessmentTableCell>
                <HolisticAssessmentTableCell className="align-top">
                  {q ? renderField(q, { hideLabel: true }) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </HolisticAssessmentTableCell>
              </HolisticAssessmentTableRow>
            )
          })}
        </HolisticAssessmentTable>

        <p className={cn(IA_CALLOUT_NEUTRAL_CLASS, 'mt-3 text-sm')}>
          <strong>NB:</strong> If a person is not able to provide a yes response to one or more of
          the above, they are unable to make an informed decision.
        </p>
      </InitialAssessmentSection12PanelShell>

      {outcomeQ ? (
        <InitialAssessmentSection12PanelShell
          title="Outcome of the mental capacity screening tool"
          hint="On the balance of probabilities from the outcome of the above:"
          bodyVariant="content"
        >
          {renderField(outcomeQ)}
        </InitialAssessmentSection12PanelShell>
      ) : null}

      <div className={cn(IA_CALLOUT_NEUTRAL_CLASS, 'text-sm')}>
        If it has been established that the person lacks mental capacity for the required decision,
        the Decision Maker should now consider what would be in the person&apos;s best interests.
        Refer for Assessment of Mental Capacity and Best Interests Decision for Adults That Lack
        Capacity Document.
      </div>

      {commentsQ ? (
        <InitialAssessmentSection12PanelShell title="Comments" bodyVariant="content">
          {renderField(commentsQ, { hideLabel: true })}
        </InitialAssessmentSection12PanelShell>
      ) : null}
    </div>
  )
}
