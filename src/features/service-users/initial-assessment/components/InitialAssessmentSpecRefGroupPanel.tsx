import type { ReactNode } from 'react'
import {
  InitialAssessmentSection12FieldRow,
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import {
  IA_ACT_DIVIDER_TITLE_CLASS,
  IA_CALLOUT_TEAL_CLASS,
  IA_HINT_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import type { SpecRefGroup } from '@/features/service-users/initial-assessment/utils/spec-ref-groups'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'

type Props = {
  group: SpecRefGroup
  renderField: (q: InitialAssessmentQuestion) => ReactNode
  children?: ReactNode
}

/** One spec-ref subsection in the unified panel shell (matches §12 assessor blocks). */
export function InitialAssessmentSpecRefGroupPanel({ group, renderField, children }: Props) {
  return (
    <InitialAssessmentSection12PanelShell
      title={group.label}
      testId={`ia-spec-group-${group.specRef}`}
      bodyVariant="content"
    >
      {group.actDivider ? (
        <div className={IA_CALLOUT_TEAL_CLASS}>
          <p className={IA_ACT_DIVIDER_TITLE_CLASS}>{group.actDivider.title}</p>
          {group.actDivider.hint ? (
            <p className={IA_HINT_CLASS}>{group.actDivider.hint}</p>
          ) : null}
        </div>
      ) : null}

      {children ??
        group.questions.map((q) => (
          <InitialAssessmentSection12FieldRow key={q.id}>{renderField(q)}</InitialAssessmentSection12FieldRow>
        ))}
    </InitialAssessmentSection12PanelShell>
  )
}
