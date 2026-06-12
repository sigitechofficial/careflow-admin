import type { ReactNode } from 'react'
import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HOLISTIC_SECTION_BODY_CLASS,
  HOLISTIC_SECTION_SHELL_CLASS,
} from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import { PAPER_SECTION_4_TITLE } from '@/features/service-users/initial-assessment/utils/section-4-physical-assessment-display-order'

type Props = {
  children: ReactNode
}

/** Paper Section 4 — physical assessment (subsections a–p). */
export function InitialAssessmentPaperSection4Block({ children }: Props) {
  return (
    <section className={HOLISTIC_SECTION_SHELL_CLASS} data-testid="ia-paper-section-4">
      <HolisticSectionHeader title={PAPER_SECTION_4_TITLE} />
      <div className={HOLISTIC_SECTION_BODY_CLASS}>
        <div className="space-y-5">{children}</div>
      </div>
    </section>
  )
}
