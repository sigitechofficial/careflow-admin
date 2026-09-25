import type { ReactNode } from 'react'
import { HolisticCollapsibleSection } from '@/features/service-users/initial-assessment/components/holistic/HolisticCollapsibleSection'
import { PAPER_SECTION_4_TITLE } from '@/features/service-users/initial-assessment/utils/section-4-physical-assessment-display-order'

type Props = {
  children: ReactNode
}

/** Paper Section 4 — physical assessment (subsections a–p). */
export function InitialAssessmentPaperSection4Block({ children }: Props) {
  return (
    <HolisticCollapsibleSection title={PAPER_SECTION_4_TITLE} testId="ia-paper-section-4">
      <div className="space-y-5">{children}</div>
    </HolisticCollapsibleSection>
  )
}
