import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  renderField: () => ReactNode
}

export function InitialAssessmentSectionFooterNotesPanel({ renderField }: Props) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3">
      <p className={cn(IA_HINT_CLASS, 'mb-2')}>
        Optional — record anything auditors or care-plan authors should know that is not captured above.
      </p>
      {renderField()}
    </div>
  )
}
