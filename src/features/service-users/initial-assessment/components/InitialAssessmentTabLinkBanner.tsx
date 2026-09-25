import { Button } from '@/shared/ui/button'
import {
  IA_CALLOUT_SKY_CLASS,
  IA_CALLOUT_TITLE_CLASS,
  IA_HINT_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
  testId?: string
}

/** Cross-tab reminder: master lives elsewhere — link instead of re-asking. */
export function InitialAssessmentTabLinkBanner({
  title,
  body,
  actionLabel,
  onAction,
  testId = 'ia-tab-link-banner',
}: Props) {
  return (
    <div className={IA_CALLOUT_SKY_CLASS} data-testid={testId} role="note">
      <p className={IA_CALLOUT_TITLE_CLASS}>{title}</p>
      <p className={IA_HINT_CLASS}>{body}</p>
      {onAction && actionLabel ? (
        <div className="mt-2">
          <Button type="button" variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
