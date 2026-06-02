import {
  InitialAssessmentSection12FieldRow,
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { IA_CALLOUT_SKY_CLASS, IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { noConcernGateHelpText, noConcernGateLeadCopy } from '@/features/service-users/initial-assessment/utils/no-concern-gate'
import { cn } from '@/shared/lib/utils'
import type { ReactNode } from 'react'

type Props = {
  title: string
  sectionNumber: number
  questions: InitialAssessmentQuestion[]
  renderField: (q: InitialAssessmentQuestion) => ReactNode
}

export function InitialAssessmentNoConcernGatePanel({ title, sectionNumber, questions, renderField }: Props) {
  const master = questions.find((q) => q.metadata?.noConcernMaster === true) ?? questions[0]
  const help = noConcernGateHelpText(sectionNumber, master)

  return (
    <InitialAssessmentSection12PanelShell title={title} testId="ia-no-concern-gate" bodyVariant="content">
      <div className={cn(IA_CALLOUT_SKY_CLASS, 'text-sm')}>
        <p className="font-medium text-sky-950 dark:text-sky-100">{noConcernGateLeadCopy(sectionNumber)}</p>
        {help ? <p className={cn('mt-1', IA_HINT_CLASS)}>{help}</p> : null}
      </div>
      {master ? (
        <InitialAssessmentSection12FieldRow>{renderField(master)}</InitialAssessmentSection12FieldRow>
      ) : null}
    </InitialAssessmentSection12PanelShell>
  )
}
