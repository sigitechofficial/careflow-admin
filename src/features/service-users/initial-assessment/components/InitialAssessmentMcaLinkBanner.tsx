import { Button } from '@/shared/ui/button'
import {
  IA_CALLOUT_SKY_CLASS,
  IA_CALLOUT_TITLE_CLASS,
  IA_HINT_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { holisticTabRef } from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'

/** Frozen id of the MCA Screening tab (its display number moves with the tab order). */
const MCA_SCREENING_TAB_ID = 3

type Props = {
  /** Compact reminder (Tab 1 cognition) vs fuller gate message (Tab 17 / EOL). */
  variant?: 'link' | 'not-required' | 'eol'
  mcaRequiredYes?: boolean
  onOpenMcaScreeningTab?: () => void
}

/**
 * Cross-tab link for MCA — one master on Tab 3; other places point here instead of re-asking.
 */
export function InitialAssessmentMcaLinkBanner({
  variant = 'link',
  mcaRequiredYes,
  onOpenMcaScreeningTab,
}: Props) {
  if (variant === 'not-required' && mcaRequiredYes) return null

  const title =
    variant === 'not-required'
      ? 'Full MCA checklist not required'
      : variant === 'eol'
        ? 'End-of-life capacity is a separate decision'
        : 'Mental Capacity Assessment'

  const mcaTab = holisticTabRef(MCA_SCREENING_TAB_ID)
  const body =
    variant === 'not-required'
      ? `MCA required is No on ${mcaTab}. Complete the screening there if that changes; this checklist stays optional.`
      : variant === 'eol'
        ? `Record decision-specific capacity below. For the general MCA screen and whether a full assessment is required, use ${mcaTab}.`
        : `Recorded on ${mcaTab} (MCA Screening) — not repeated here.`

  return (
    <div className={IA_CALLOUT_SKY_CLASS} data-testid="ia-mca-link-banner" role="note">
      <p className={IA_CALLOUT_TITLE_CLASS}>{title}</p>
      <p className={IA_HINT_CLASS}>{body}</p>
      {onOpenMcaScreeningTab ? (
        <div className="mt-2">
          <Button type="button" variant="outline" size="sm" onClick={onOpenMcaScreeningTab}>
            Open MCA Screening ({mcaTab})
          </Button>
        </div>
      ) : null}
    </div>
  )
}
