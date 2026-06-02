import { ExternalLink } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  InitialAssessmentSection12PanelShell,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12PanelShell'
import { InitialAssessmentPanelFieldList } from '@/features/service-users/initial-assessment/components/InitialAssessmentPanelFieldList'
import { IA_CALLOUT_TEAL_CLASS, IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import type { InitialAssessmentQuestion } from '@/features/service-users/initial-assessment/types'
import { cn } from '@/shared/lib/utils'
import type { ReactNode } from 'react'

type Props = {
  title: string
  questions: InitialAssessmentQuestion[]
  renderField: (q: InitialAssessmentQuestion) => ReactNode
  renderMultiSelect: (q: InitialAssessmentQuestion) => ReactNode
  onOpenWaterlowTab?: () => void
}

export function InitialAssessmentPressureRiskPanel({
  title,
  questions,
  renderField,
  renderMultiSelect,
  onOpenWaterlowTab,
}: Props) {
  return (
    <InitialAssessmentSection12PanelShell title={title} testId="ia-spec-group-11.3" bodyVariant="content">
      <div className={cn(IA_CALLOUT_TEAL_CLASS, 'text-sm')}>
        <p className="font-medium text-teal-950 dark:text-teal-100">
          Waterlow scoring is completed on the dedicated Waterlow tab — link skin findings here to equipment and
          review actions.
        </p>
        {onOpenWaterlowTab ? (
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onOpenWaterlowTab}>
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
            Open Waterlow assessment
          </Button>
        ) : null}
        <p className={cn('mt-2', IA_HINT_CLASS)}>
          Answer whether the pressure ulcer risk assessment and photography are complete below.
        </p>
      </div>
      <InitialAssessmentPanelFieldList
        questions={questions}
        renderField={renderField}
        renderMultiSelect={renderMultiSelect}
      />
    </InitialAssessmentSection12PanelShell>
  )
}
