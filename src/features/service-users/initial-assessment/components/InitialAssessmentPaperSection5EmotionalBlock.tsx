import type { ReactNode } from 'react'
import { HolisticCollapsibleSection } from '@/features/service-users/initial-assessment/components/holistic/HolisticCollapsibleSection'
import { PAPER_SECTION_5_EMOTIONAL_TITLE } from '@/features/service-users/initial-assessment/utils/section-4-physical-assessment-display-order'

type Props = {
  children: ReactNode
}

/** Paper Section 5 — follows Section 4 physical assessment on tab 1. */
export function InitialAssessmentPaperSection5EmotionalBlock({ children }: Props) {
  return (
    <HolisticCollapsibleSection title={PAPER_SECTION_5_EMOTIONAL_TITLE} testId="ia-paper-section-5-emotional">
      <div className="space-y-5">{children}</div>
    </HolisticCollapsibleSection>
  )
}
