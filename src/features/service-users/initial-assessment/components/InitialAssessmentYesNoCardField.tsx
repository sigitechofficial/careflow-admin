import type { ComponentProps } from 'react'
import { InitialAssessmentPaperYesNoRow } from '@/features/service-users/initial-assessment/components/InitialAssessmentPaperYesNoRow'
import { IA_YES_NO_CARD_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import { cn } from '@/shared/lib/utils'

type Props = ComponentProps<typeof InitialAssessmentPaperYesNoRow>

/** Standalone Yes/No field with muted card shell — matches holistic template questions (e.g. Keysafe). */
export function InitialAssessmentYesNoCardField({
  showDivider = false,
  compact = true,
  ...props
}: Props) {
  return (
    <div className={cn(IA_YES_NO_CARD_CLASS, 'ia-yes-no-card')}>
      <InitialAssessmentPaperYesNoRow {...props} showDivider={showDivider} compact={compact} />
    </div>
  )
}
