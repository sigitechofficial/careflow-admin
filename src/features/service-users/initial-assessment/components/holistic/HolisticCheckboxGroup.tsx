import type { ReactNode } from 'react'
import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import { HOLISTIC_SECTION_BODY_CLASS, HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Wraps multi-select option grids in paper-style bordered subsection. */
export function HolisticCheckboxGroup({ title, subtitle, children }: Props) {
  return (
    <section className={HOLISTIC_SECTION_SHELL_CLASS}>
      <HolisticSectionHeader title={title} subtitle={subtitle} />
      <div className={HOLISTIC_SECTION_BODY_CLASS}>{children}</div>
    </section>
  )
}
