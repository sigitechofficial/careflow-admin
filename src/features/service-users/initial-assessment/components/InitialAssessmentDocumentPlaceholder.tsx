import { IA_CALLOUT_NEUTRAL_CLASS, IA_INTRO_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import { cn } from '@/shared/lib/utils'

type Props = {
  title: string
  hint?: string
}

export function InitialAssessmentDocumentPlaceholder({ title, hint }: Props) {
  return (
    <div
      className={cn(IA_CALLOUT_NEUTRAL_CLASS, 'rounded-lg border border-dashed border-slate-300 p-6')}
      data-testid="ia-document-placeholder"
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className={cn('mt-2', IA_INTRO_CLASS)}>
        {hint ??
          'This section will be aligned to the reference document in the next update. You can continue with the other tabs for now.'}
      </p>
    </div>
  )
}
